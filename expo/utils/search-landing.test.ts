/**
 * 検索の着地の不変条件 — 「種類を指す語が、その種類に着地する」(IA spec v1.14)。
 *
 * 2026-10-23、「まぐろ→白身魚」「鯖→鮭」「だんご→餅」「てんぷらうどん→天そば」「目玉焼き→生」
 * のように、**特定の種類・調理を指す語が Identity 自体の searchTags に置かれ、検索がその
 * Identity に着地して既定の種類で記録される**取り違えが、全体で約20語見つかった。報告の
 * たびに1語ずつ直すのではなく、型として検査する:
 *
 *   A. 置き場所 … Identity の searchTags / 別名に、**既定でない**種類・調理の名前・タグと
 *      同じ語を置かない。置くとその語が Identity (=既定の種類) に着地しうる。
 *   B. 到達性 … 既定でない種類・調理の**名前とタグ**で検索すると、層1の1位がその種類・調理
 *      (または振替先) になる。タグを足したのに別の食品に負けている (同点・名前負け) を捕まえる。
 *
 * ラチェット: KNOWN_* は導入時点で既に外れていた語の凍結 (理由つき)。直したら外す (外さないと落ちる)。
 */
import { ALL_IDENTITIES } from '@/constants/identity';
import { aliasesFor } from '@/constants/identity/search-aliases';
import type { Identity } from '@/types/identity';
import { searchEntriesFuzzy } from './identity-search';
import { toKey } from './identity-search-keys';

const JP = ALL_IDENTITIES.filter((i: Identity) => !i.id.startsWith('us_'));

interface Option {
  identity: Identity;
  kind: 'attr' | 'style';
  key: string;
  label: string;
  isDefault: boolean;
  words: string[];
  /** 振替がある種類・調理は、振替先に着地してよい */
  landsOn: string[];
}

function optionsOf(identity: Identity): Option[] {
  const out: Option[] = [];
  for (const a of identity.attributes ?? []) {
    out.push({
      identity, kind: 'attr', key: a.key, label: a.label, isDefault: !!a.isDefault,
      words: [a.label, ...(a.searchTags ?? []), ...aliasesFor(`${identity.id}/${a.key}`)],
      landsOn: [`${identity.id}/${a.key}`, ...(a.migration ? [`${a.migration.identityKey}/${a.migration.attributeKey ?? ''}`, `${a.migration.identityKey}/`] : [])],
    });
  }
  for (const s of identity.styles ?? []) {
    out.push({
      identity, kind: 'style', key: s.key, label: s.label, isDefault: !!s.isDefault,
      words: [s.label, ...(s.searchTags ?? []), ...aliasesFor(`${identity.id}[${s.key}]`)],
      landsOn: [`${identity.id}[${s.key}]`, ...(s.migration ? [`${s.migration.identityKey}/${s.migration.attributeKey ?? ''}`, `${s.migration.identityKey}/`] : [])],
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// A. 置き場所
// ---------------------------------------------------------------------------

/** 種類が2つしかなく、Identity 名そのものが一方の種類名でもある等、意図して重ねている語。 */
const KNOWN_PLACEMENT: Record<string, string> = {};

function collectPlacement(): string[] {
  const found: string[] = [];
  for (const identity of JP) {
    const opts = optionsOf(identity).filter((o) => !o.isDefault);
    if (opts.length === 0) continue;
    const idWords = [...(identity.searchTags ?? []), ...aliasesFor(identity.id)];
    for (const w of idWords) {
      const k = toKey(w);
      const owner = opts.find((o) => o.words.some((x) => toKey(x) === k));
      if (owner) found.push(`${identity.id}:${w}→${owner.kind === 'attr' ? '/' : '['}${owner.key}`);
    }
  }
  return found;
}

describe('A. Identity の検索語に、既定でない種類・調理の語を置かない', () => {
  it('新しい置き違いが増えていない', () => {
    const added = collectPlacement().filter((k) => !(k in KNOWN_PLACEMENT));
    expect(added).toEqual([]);
  });
  it('KNOWN_PLACEMENT に解消済みの項目が残っていない', () => {
    const now = new Set(collectPlacement());
    expect(Object.keys(KNOWN_PLACEMENT).filter((k) => !now.has(k))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// B. 到達性
// ---------------------------------------------------------------------------

/**
 * 導入時点 (2026-10-23) で、既定でない種類・調理の名前/タグが自分に着地しなかった語。
 * 多くは「別の食品の同名の種類」と同点・名前負け (例: バーガーの「チーズ」はチーズそのものに着地
 * する方が正しい)。**意図して他所に着地させている語**には理由を書き、そうでないものは直して外す。
 */
const KNOWN_UNREACHABLE: Record<string, string> = {
  // 素の名詞は食材そのものに着地するのが正しい (種類は「チーズバーガー」等の複合語で辿り着く)
  'burger/cheese:チーズ': 'チーズそのもの (cheese) に着地',
  'cold_sand/tuna:ツナ': 'ツナ缶 (canned_lean_fish) に着地',
  'pizza_seafood/shrimp:海老': 'エビそのもの (seafood_lean) に着地',
  'sashimi/white_fish:白身魚': '白身魚そのもの (white_fish/white) に着地。刺身は「白身魚の刺身」等',
  'sashimi/white_fish:しろみざかな': '同上',
  'soup/western:コンソメ': '野菜スープ (コンソメ系の基準) に着地。どちらも同じ「汁物」で取り違えの害は小さい',
};

function landingKey(r: ReturnType<typeof searchEntriesFuzzy>['confident'][number] | undefined): string[] {
  if (!r) return [];
  const id = r.entry.identity.id;
  return [`${id}/${r.entry.attribute?.key ?? ''}`, ...(r.entry.style ? [`${id}[${r.entry.style.key}]`] : [])];
}

/** 2つ以上の食品の種類・調理に出てくる語 (油あり / 揚げ / 焼き / 煮つけ / 皮なし …) は修飾語。単独の検索語としては検査しない。 */
const SHARED_WORDS: Set<string> = (() => {
  const owners = new Map<string, Set<string>>();
  for (const identity of JP) {
    for (const o of optionsOf(identity)) {
      for (const w of o.words) {
        const k = toKey(w);
        if (!owners.has(k)) owners.set(k, new Set());
        owners.get(k)!.add(identity.id);
      }
    }
  }
  return new Set([...owners].filter(([, ids]) => ids.size >= 2).map(([k]) => k));
})();

function collectUnreachable(): string[] {
  const found: string[] = [];
  for (const identity of JP) {
    for (const o of optionsOf(identity)) {
      if (o.isDefault) continue;
      for (const w of new Set(o.words)) {
        if (SHARED_WORDS.has(toKey(w))) continue;
        const top = searchEntriesFuzzy(w).confident[0];
        const lands = landingKey(top);
        if (!lands.some((l) => o.landsOn.includes(l))) {
          found.push(`${identity.id}${o.kind === 'attr' ? '/' : '['}${o.key}${o.kind === 'attr' ? '' : ']'}:${w}`);
        }
      }
    }
  }
  return found;
}

describe('B. 既定でない種類・調理は、その名前・タグで1位に着地する', () => {
  const now = collectUnreachable();
  it('新しい着地ミスが増えていない', () => {
    expect(now.filter((k) => !(k in KNOWN_UNREACHABLE))).toEqual([]);
  });
  it('KNOWN_UNREACHABLE に解消済みの項目が残っていない', () => {
    const set = new Set(now);
    expect(Object.keys(KNOWN_UNREACHABLE).filter((k) => !set.has(k))).toEqual([]);
  });
});
