/**
 * seibun-compare.ts — DB の食品と日本食品標準成分表 (八訂) の値を比べる (純粋関数)。
 * 対応表: constants/identity/seibun-links.ts / 同梱の抜粋: constants/reference/seibun-2023.json
 */
import reference from '@/constants/reference/seibun-2023.json';
import { getIdentity } from '@/constants/identity';
import type { SeibunLink } from '@/constants/identity/seibun-links';
import { getEffectiveAmountSpec } from './identity-attribute';
import { resolveLog } from './identity-resolver';
import type { DishPoint, DishReference } from '@/constants/identity/dish-references';

// i18n-ignore-start: 開発者向けの照合レポート文言 (UI には出さない。テスト・scripts/seibun-report.ts 専用)
export interface RefFood { name: string; refuse: number | null; kcal: number | null; protein: number | null; fat: number | null; carbs: number | null }
export const SEIBUN_FOODS = (reference as { foods: Record<string, RefFood> }).foods;
export const SEIBUN_META = (reference as { _meta: Record<string, string> })._meta;

export interface MacroPer100 { kcal: number; protein: number; fat: number; carbs: number }

export interface Comparison {
  link: SeibunLink;
  ref: MacroPer100;
  /** known: DB を100gあたりに直した値 / assumed: 仮定した重さでの100gあたり */
  db: MacroPer100;
  /** assumed のとき: DB の kcal から逆算した「1単位あたり g」 */
  impliedGrams?: number;
  /** 範囲外の項目 (空 = 照合OK) */
  problems: string[];
  /** 検査しなかった理由 (出典の値が内部で食い違っている等) */
  skipped?: string;
}

const dev = (db: number, ref: number) => (ref === 0 ? (db === 0 ? 0 : Infinity) : (db - ref) / ref);

/** 組成 (エネルギー比) の各点の差。P/F/C を 4/9/4 kcal/g でエネルギーに直した比率。 */
function shares(m: MacroPer100): { p: number; f: number; c: number } {
  const total = m.protein * 4 + m.fat * 9 + m.carbs * 4 || 1;
  return { p: (m.protein * 4) / total, f: (m.fat * 9) / total, c: (m.carbs * 4) / total };
}

export function compareLink(link: SeibunLink): Comparison {
  const food = SEIBUN_FOODS[link.foodNo];
  if (!food) throw new Error(`seibun-links: 食品番号 ${link.foodNo} が同梱の抜粋に無い (scripts/seibun-sync.ts)`);
  return compareWith(link, food);
}

/** 成分表以外 (チェーンの公式値・USDA) の100gあたりの値と比べる。ロジックは成分表と同じ。 */
export function compareExternal(link: SeibunLink, ref: MacroPer100): Comparison {
  return compareWith(link, { name: link.food, refuse: null, ...ref });
}

function compareWith(link: SeibunLink, food: RefFood): Comparison {
  const [id, attr] = link.key.split('/');
  const identity = getIdentity(id);
  if (!identity) throw new Error(`seibun-links: Identity "${id}" が無い`);
  const raw: MacroPer100 = { kcal: food.kcal ?? 0, protein: food.protein ?? 0, fat: food.fat ?? 0, carbs: food.carbs ?? 0 };

  const spec = getEffectiveAmountSpec(identity, attr);
  const base = resolveLog({ originIdentityId: id, attributeKey: attr }).baseMacro;
  const grams = spec.default * (link.gramsPerUnit ?? 1);
  // 調理で加わるもの (焼き油・たれ・ソース) は成分表の生/素材の値に無い。DB の1食ぶんに上乗せして比べる。
  const x = link.extra ?? {};
  const per100 = (v: number | undefined) => ((v ?? 0) * 100) / grams;
  const ref: MacroPer100 = {
    kcal: raw.kcal + per100(x.kcal ?? ((x.protein ?? 0) * 4 + (x.fat ?? 0) * 9 + (x.carbs ?? 0) * 4)),
    protein: raw.protein + per100(x.protein),
    fat: raw.fat + per100(x.fat),
    carbs: raw.carbs + per100(x.carbs),
  };
  const db: MacroPer100 = {
    kcal: (base.kcal / grams) * 100, protein: (base.protein / grams) * 100, fat: (base.fat / grams) * 100, carbs: (base.carbs / grams) * 100,
  };
  const problems: string[] = [];

  if (link.weight === 'assumed') {
    // 出典の値が内部で食い違っている (kcal が P/F/C から大きく外れる) ときは、組成を比べても意味が無い。
    const atwater = raw.protein * 4 + raw.fat * 9 + raw.carbs * 4;
    if (raw.kcal > 0 && Math.abs(raw.kcal - atwater) / raw.kcal > 0.3 && Math.abs(raw.kcal - atwater) > 25) {
      return { link, ref, db, impliedGrams: base.kcal / spec.default / (raw.kcal / 100), problems: [], skipped: `出典の値が内部で食い違っている (kcal ${raw.kcal} に対し P/F/C から ${Math.round(atwater)}kcal)` };
    }
    // 重さは目安なので kcal の絶対値は比べない。組成 (エネルギー比) が 12 点以上ずれていたら食い違い。
    const a = shares(db), b = shares(ref);
    for (const [k, label] of [['p', 'たんぱく質'], ['f', '脂質'], ['c', '炭水化物']] as const) {
      const d = a[k] - b[k];
      if (Math.abs(d) > 0.12) problems.push(`${label}のエネルギー比 DB ${Math.round(a[k] * 100)}% / 成分表 ${Math.round(b[k] * 100)}%`);
    }
    return { link, ref, db, impliedGrams: base.kcal / spec.default / (ref.kcal / 100), problems };
  }

  const check = (label: string, d: number, r: number, rel: number, abs: number, ignored = false) => {
    if (ignored) return;
    if (Math.abs(d - r) > abs && Math.abs(dev(d, r)) > rel) {
      problems.push(`${label} DB ${d.toFixed(1)} / 成分表 ${r.toFixed(1)} (${dev(d, r) >= 0 ? '+' : ''}${Math.round(dev(d, r) * 100)}%)`);
    }
  };
  const ig = new Set(link.ignore ?? []);
  check('kcal', db.kcal, ref.kcal, 0.25, 12, ig.has('kcal'));
  check('たんぱく質', db.protein, ref.protein, 0.35, 2.5, ig.has('protein'));
  check('脂質', db.fat, ref.fat, 0.35, 2.5, ig.has('fat'));
  check('炭水化物', db.carbs, ref.carbs, 0.35, 3.5, ig.has('carbs'));
  return { link, ref, db, problems };
}

export interface DishComparison {
  ref: DishReference;
  db: MacroPer100;
  /** 補正後の各点 (ご飯量を DB に揃えたもの) */
  points: { point: DishPoint; adj: Partial<MacroPer100> }[];
  /** 各項目の [下限, 上限] (点の最小/最大) */
  range: Partial<Record<keyof MacroPer100, [number, number]>>;
  problems: string[];
}

/** チェーン公式の1食の値と比べる。範囲 = 点の最小〜最大。kcal は±15%、P/F/C は±25% (または絶対 3g) まで許容。 */
export function compareDish(ref: DishReference): DishComparison {
  const [id, attr] = ref.key.split('/');
  const base = resolveLog({ originIdentityId: id, attributeKey: attr }).baseMacro;
  const db: MacroPer100 = { kcal: base.kcal, protein: base.protein, fat: base.fat, carbs: base.carbs };
  const rice = SEIBUN_FOODS['01088'];
  const points = ref.points.map((point) => {
    const k = (point.adjustRiceG ?? 0) / 100;
    const adj: Partial<MacroPer100> = {
      kcal: point.kcal + k * (rice.kcal ?? 0),
      protein: point.protein === undefined ? undefined : point.protein + k * (rice.protein ?? 0),
      fat: point.fat === undefined ? undefined : point.fat + k * (rice.fat ?? 0),
      carbs: point.carbs === undefined ? undefined : point.carbs + k * (rice.carbs ?? 0),
    };
    return { point, adj };
  });
  const range: DishComparison['range'] = {};
  const problems: string[] = [];
  const tol: Record<keyof MacroPer100, [number, number, string]> = {
    kcal: [0.15, 0, 'kcal'], protein: [0.25, 3, 'たんぱく質'], fat: [0.25, 3, '脂質'], carbs: [0.25, 3, '炭水化物'],
  };
  for (const key of ['kcal', 'protein', 'fat', 'carbs'] as const) {
    const vals = points.map((p) => p.adj[key]).filter((v): v is number => v !== undefined);
    if (!vals.length) continue;
    const lo = Math.min(...vals), hi = Math.max(...vals);
    range[key] = [lo, hi];
    const [rel, abs, label] = tol[key];
    const low = Math.min(lo * (1 - rel), lo - abs), high = Math.max(hi * (1 + rel), hi + abs);
    if (db[key] < low || db[key] > high) {
      problems.push(`${label} DB ${db[key].toFixed(1)} / 公式 ${lo.toFixed(0)}〜${hi.toFixed(0)} (許容 ${low.toFixed(0)}〜${high.toFixed(0)})`);
    }
  }
  return { ref, db, points, range, problems };
}
// i18n-ignore-end
