/**
 * Preset の整合性 (IA spec §1.5 判定3 / §5.6)
 *
 * プリセットはマクロ値を持たず、ベースと Add-on の既存値を参照するだけのデータ。
 * 参照が壊れると「選んだのにトッピングが乗らない」「検索で出ない」が無言で起きる
 * (§4.1 の死んだ searchTag と同種) ので、**書いたこと**ではなく**動くこと**を検証する。
 */
import { JP_PRESETS, ALL_IDENTITIES, getIdentity, getAddonLabel, presetAddonInputs, resolveAddonRef } from './index';
import { getEffectiveAllowedAddonIds, getEffectiveDefaultAddonIds, getHiddenAddonIds } from '@/utils/identity-attribute';
import { resolveLog } from '@/utils/identity-resolver';
import { searchEntriesFuzzy } from '@/utils/identity-search';
import { normalize } from '@/utils/identity-normalize';

const IDEOGRAPH = /[一-鿿]/;
const targetsOf = (p: (typeof JP_PRESETS)[number]) => [p.label, ...(p.searchTags ?? [])];

describe('Preset データの整合性', () => {
  it('プリセットが1件以上ある', () => {
    expect(JP_PRESETS.length).toBeGreaterThan(0);
  });

  it('id と label が重複していない', () => {
    const ids = JP_PRESETS.map((p) => p.id);
    const labels = JP_PRESETS.map((p) => normalize(p.label));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('別のプリセットと検索語が衝突していない (同じ語で2件出ると選べない)', () => {
    const owner = new Map<string, string>();
    const clashes: string[] = [];
    for (const p of JP_PRESETS) {
      for (const t of targetsOf(p).map(normalize)) {
        const prev = owner.get(t);
        if (prev && prev !== p.id) clashes.push(`"${t}": ${prev} と ${p.id}`);
        owner.set(t, p.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  describe.each(JP_PRESETS.map((p) => [p.id, p] as const))('%s', (_id, preset) => {
    const identity = getIdentity(preset.identityId);

    it('ベース Identity / 種類 / スタイルが実在する', () => {
      expect(identity).toBeDefined();
      if (preset.attributeKey) {
        expect(identity?.attributes?.map((a) => a.key)).toContain(preset.attributeKey);
      }
      if (preset.styleKey) {
        expect(identity?.styles?.map((s) => s.key)).toContain(preset.styleKey);
      }
    });

    it('Add-on が1つ以上あり、個数が正で、重複しない', () => {
      expect(preset.addons.length).toBeGreaterThan(0);
      expect(preset.addons.every((a) => a.units > 0)).toBe(true);
      const refs = preset.addons.map((a) => a.refId);
      expect(new Set(refs).size).toBe(refs.length);
    });

    it('全 Add-on が解決でき、ベースの許可 Add-on に含まれ、種類で隠されていない', () => {
      if (!identity) return;
      const allowed = new Set([
        ...getEffectiveAllowedAddonIds(identity, preset.attributeKey),
        ...getEffectiveDefaultAddonIds(identity, preset.attributeKey),
      ]);
      const hidden = getHiddenAddonIds(identity, preset.attributeKey);
      const problems = preset.addons.flatMap((a) => {
        const out: string[] = [];
        if (!resolveAddonRef(a.refId)) out.push(`${a.refId}: 未登録`);
        if (!allowed.has(a.refId)) out.push(`${a.refId}: ${identity.id} の許可 Add-on に無い (シートが受け付けず消える)`);
        if (hidden.has(a.refId)) out.push(`${a.refId}: 種類 ${preset.attributeKey} で隠される (二重計上防止で除外される)`);
        return out;
      });
      expect(problems).toEqual([]);
    });

    it('量を指定するなら正の数', () => {
      if (preset.amountValue !== undefined) expect(preset.amountValue).toBeGreaterThan(0);
    });

    it('§1.5 判定4: Add-on 合計が 20kcal 以上 (Add-on が料理を決めている)', () => {
      const kcal = resolveLog({
        originIdentityId: preset.identityId,
        attributeKey: preset.attributeKey,
        styleKey: preset.styleKey,
        amountValue: preset.amountValue,
        addons: presetAddonInputs(preset),
      }).addons?.reduce((sum, a) => sum + a.addedMacro.kcal, 0) ?? 0;
      expect(kcal).toBeGreaterThanOrEqual(20);
    });

    it('resolveLog が有限のマクロを返し、ベースより増えている', () => {
      const base = resolveLog({
        originIdentityId: preset.identityId,
        attributeKey: preset.attributeKey,
        styleKey: preset.styleKey,
        amountValue: preset.amountValue,
      });
      const withAddons = resolveLog({
        originIdentityId: preset.identityId,
        attributeKey: preset.attributeKey,
        styleKey: preset.styleKey,
        amountValue: preset.amountValue,
        addons: presetAddonInputs(preset),
      });
      for (const v of Object.values(withAddons.totalMacro)) expect(Number.isFinite(v)).toBe(true);
      expect(withAddons.addons).toHaveLength(preset.addons.length);
      expect(withAddons.totalMacro.kcal).toBeGreaterThan(base.totalMacro.kcal);
    });

    it('§1.5 判定2: 既存の Identity / 種類 / スタイルの名前と同じではない (それは語彙の仕事)', () => {
      if (!identity) return;
      const existing = new Set(
        [identity.label, ...(identity.attributes ?? []).map((a) => a.label), ...(identity.styles ?? []).map((s) => s.label)].map(normalize),
      );
      expect(existing.has(normalize(preset.label))).toBe(false);
    });

    it('§4.1: 漢字を含む名前には、かな形(漢字なし)の検索語がある', () => {
      const targets = targetsOf(preset);
      if (!targets.some((t) => IDEOGRAPH.test(t))) return;
      expect(targets.some((t) => !IDEOGRAPH.test(t) && normalize(t) !== normalize(preset.label))).toBe(true);
    });

    it('検索語(名前・別表記の全て)で層1に自分自身が着地する', () => {
      const missed = targetsOf(preset).filter((t) => {
        const hit = searchEntriesFuzzy(t, { locale: 'ja' }).confident.find((r) => r.entry.preset?.id === preset.id);
        return !hit;
      });
      expect(missed).toEqual([]);
    });
  });

  it('プリセットの名前がベース側の検索語と重複していない (検索結果にベースと二重に出る)', () => {
    const baseTargets = new Map<string, string>();
    for (const i of ALL_IDENTITIES) {
      const add = (t: string, where: string) => baseTargets.set(normalize(t), where);
      add(i.label, i.id);
      (i.searchTags ?? []).forEach((t) => add(t, i.id));
      for (const a of i.attributes ?? []) {
        add(a.label, `${i.id}/${a.key}`);
        (a.searchTags ?? []).forEach((t) => add(t, `${i.id}/${a.key}`));
      }
      for (const s of i.styles ?? []) {
        add(s.label, `${i.id}[${s.key}]`);
        (s.searchTags ?? []).forEach((t) => add(t, `${i.id}[${s.key}]`));
      }
    }
    const dups = JP_PRESETS.flatMap((p) =>
      targetsOf(p)
        .map(normalize)
        .filter((t) => baseTargets.has(t))
        .map((t) => `${p.id}: "${t}" は ${baseTargets.get(t)} にもある`),
    );
    expect(dups).toEqual([]);
  });
});

describe('Preset の表示・変換', () => {
  it('getAddonLabel は Identity 流用 / 純 Add-on の両方で表示名を返す', () => {
    expect(getAddonLabel('butter_cream')).toBe('バター');
    expect(getAddonLabel('mentaiko')).toBe('明太子・たらこ');
    expect(getAddonLabel('__nope__')).toBe('__nope__');
  });

  it('presetAddonInputs は refType を resolveAddonRef から導く', () => {
    const tkg = JP_PRESETS.find((p) => p.id === 'tkg')!;
    expect(presetAddonInputs(tkg)).toEqual([{ refId: 'egg', refType: 'identity', units: 1 }]);
    const mentai = JP_PRESETS.find((p) => p.id === 'mentaiko_gohan')!;
    expect(presetAddonInputs(mentai)).toEqual([{ refId: 'mentaiko', refType: 'addon', units: 1 }]);
  });
});
