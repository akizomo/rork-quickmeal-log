/**
 * Dev page — KPI計装 Layer 1 の診断ビューア。
 *
 * 製品Analytics が未導入のため、端末内に貯めた信号をここで確認し、
 * JSON をエクスポートしてクローズドテストの回答を集める。
 * 設計と背景は docs/ROADMAP.md §3.0「次の一手: KPI計装」。
 *
 * N=数人では「率」は母数不足でノイズになるため、本画面は
 * **「内容」(未ヒットクエリ一覧) と「回数」** を主に見せる。
 */

import React, { useCallback, useMemo } from 'react';
import { Alert, ScrollView, Share, Text, View } from 'react-native';

import { Body, Button, Caption, Label, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { rankFrequentSelections } from '@/utils/quick-log-history';
import { effectiveHiddenCount, effectivePinCount } from '@/utils/frequent-pins';
import { sortedSearchMisses } from '@/utils/diagnostics';
import { classifyMyFoodNames } from '@/utils/my-food-landing';
import { useLocale } from '@/hooks/useLocale';
import type { QuickLogHistoryMap } from '@/types/quick-log';
import { Section } from './_shared';

export default function DevDiagnostics() {
  const t = useTheme();
  const { settings, logs, resetDiagnostics } = useAppState();

  const diagnostics = settings.diagnostics;
  const misses = useMemo(() => sortedSearchMisses(diagnostics), [diagnostics]);

  const history = settings.quickLogHistory as QuickLogHistoryMap | undefined;
  const tabUsage = settings.tabUsageCounts ?? { ingredient: 0, dish: 0, frequent: 0 };

  // ⭐️ のピン留め (frequent_tap_source、PRD §6.5.3 / §10.2.1)
  const pinCount = effectivePinCount(settings.frequentPins, settings.myFoods);
  const hiddenCount = effectiveHiddenCount(settings.frequentHidden);
  // My食品 (PRD §6.5.4): 名前を、現在の検索で DB に着地するかで分ける (着地あり = 語彙の穴 / なし = DB の穴)
  const { foodRegion } = useLocale();
  const myFoodSplit = useMemo(() => classifyMyFoodNames(settings.myFoods, foodRegion), [settings.myFoods, foodRegion]);
  const pinnedTaps = diagnostics?.frequentPinnedTapCount ?? 0;
  const autoTaps = diagnostics?.frequentAutoTapCount ?? 0;

  const historyEntryCount = useMemo(() => {
    if (!history) return 0;
    return Object.values(history).reduce((sum, arr) => sum + arr.length, 0);
  }, [history]);

  const topRanked = useMemo(
    () => rankFrequentSelections(history, { nowISO: new Date().toISOString(), limit: 9 }),
    [history],
  );

  /** エクスポート: 依存追加を避けるため RN 標準の Share でテキストとして出す。 */
  const handleExport = useCallback(() => {
    const payload = {
      exportedAtISO: new Date().toISOString(),
      // 個人を特定しうる生ログ本体は含めない。件数と集計のみ。
      totals: {
        foodLogCount: logs.length,
        historyEntryCount,
      },
      tabUsageCounts: tabUsage,
      frequentTab: {
        pinCount,
        hiddenCount,
        pinnedTapCount: pinnedTaps,
        autoTapCount: autoTaps,
      },
      myFoods: {
        count: settings.myFoods?.length ?? 0,
        savedCount: diagnostics?.myFoodSavedCount ?? 0,
        savedLayer1Count: diagnostics?.myFoodSavedLayer1Count ?? 0,
        shelfTapCount: diagnostics?.myFoodShelfTapCount ?? 0,
        pageOpenCount: diagnostics?.myFoodsPageOpenCount ?? 0,
        namesNotLanded: myFoodSplit.notLanded.map((f) => f.name),
        namesLanded: myFoodSplit.landed.map((f) => f.name),
      },
      currentDefaultTab: settings.currentDefaultTab ?? null,
      diagnostics: diagnostics ?? null,
      topRanked: topRanked.map((r) => ({
        label: r.label,
        amountLabel: r.amountLabel,
        mode: r.mode,
        score: Number(r.score.toFixed(3)),
      })),
    };
    void Share.share({ message: JSON.stringify(payload, null, 2) });
  }, [diagnostics, historyEntryCount, logs.length, settings.currentDefaultTab, settings.myFoods, myFoodSplit, tabUsage, topRanked, pinCount, hiddenCount, pinnedTaps, autoTaps]);

  const handleReset = useCallback(() => {
    Alert.alert('診断データを消去', '検索の未ヒット記録とカウンタを初期化します。食事ログには影響しません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '消去', style: 'destructive', onPress: () => resetDiagnostics() },
    ]);
  }, [resetDiagnostics]);

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
    >
      <Body size="sm" tone="secondary">
        DEV 専用 — 端末内に貯めた計測データ。ベンダー導入前の暫定手段 (ROADMAP §3.0 Layer 1)。
      </Body>

      {/* ── 未ヒットクエリ: DB拡張順の一次ソース ───────────────────────── */}
      <Section title="検索で見つからなかった語" t={t}>
        <Body size="sm" tone="secondary">
          Identity DB 拡張 (P2-S3) の優先順を決める一次ソース。回数が多いものから追加する。
        </Body>
        {misses.length === 0 ? (
          <Body tone="secondary">まだ記録がありません</Body>
        ) : (
          <View style={{ gap: t.spacing['3'] }}>
            {misses.map((m) => (
              <View
                key={m.q}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: t.spacing['3'],
                }}
              >
                <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
                  <Label>{m.q}</Label>
                  <Caption tone="secondary">
                    {m.hadHints ? 'カテゴリのみ推測できた' : '完全に該当なし'}
                  </Caption>
                </View>
                <Label>{m.count}回</Label>
              </View>
            ))}
          </View>
        )}
      </Section>

      {/* ── 回数系 ─────────────────────────────────────────────────────── */}
      <Section title="利用回数" t={t}>
        <StatRow t={t} label="検索を開いた" value={diagnostics?.searchOpenCount ?? 0} />
        <StatRow
          t={t}
          label="数値で直接入力した"
          value={diagnostics?.directInputOpenCount ?? 0}
          note="DB の穴の代理指標"
        />
        <StatRow
          t={t}
          label="ウィジェットから記録"
          value={diagnostics?.widgetLogCount ?? 0}
          note="0 ならウィジェットが未設置か未使用"
        />
      </Section>

      {/* ── タブ利用 (既存の tabUsageCounts を可視化するだけ) ───────────── */}
      <Section title="タブ別の記録回数" t={t}>
        <Body size="sm" tone="secondary">
          ⭐️ タブが実際に使われているか。新規記録は不要で、既存の tabUsageCounts を表示している。
        </Body>
        <StatRow t={t} label="食材" value={tabUsage.ingredient} />
        <StatRow t={t} label="一皿料理" value={tabUsage.dish} />
        <StatRow t={t} label="⭐️ よく使う" value={tabUsage.frequent} />
        <StatRow t={t} label="現在のデフォルトタブ" value={settings.currentDefaultTab ?? '未決定'} />
      </Section>

      {/* ── ⭐️ のピン留め (frequent_tap_source) ───────────────────────── */}
      <Section title="⭐️ ピン留めの使われ方" t={t}>
        <Body size="sm" tone="secondary">
          ⭐️ からの記録 (タップ・長押し) を、ピン留め由来と自動由来に分けて数える。自動由来がほとんど増えないなら、
          自動の補充は使われていない (⭐️の降格・撤去の判断材料。PROBLEMS.md P-007 Story d)。ウィジェット経由は含まない。
        </Body>
        <StatRow t={t} label="ピン留め由来の記録" value={pinnedTaps} />
        <StatRow t={t} label="自動由来の記録" value={autoTaps} />
        <StatRow t={t} label="ピン留め件数 (いま)" value={pinCount} note="0 ならピン留めは未使用" />
        <StatRow t={t} label="「表示しない」件数 (いま)" value={hiddenCount} />
      </Section>

      {/* ── My食品 (PRD §6.5.4) ──────────────────────────────────────── */}
      <Section title="My食品" t={t}>
        <Body size="sm" tone="secondary">
          保存した数と、そのうち保存時に名前が検索の確実な一致 (層1) で DB に着地していた数。
          「気づかず My食品にした」予想 (自動保存にしたため) が当たっているかの実測。名前の集計は、いまの検索で DB に着地するかで分ける。
        </Body>
        <StatRow t={t} label="My食品の件数 (いま)" value={settings.myFoods?.length ?? 0} />
        <StatRow t={t} label="保存した数" value={diagnostics?.myFoodSavedCount ?? 0} />
        <StatRow t={t} label="そのうち保存時に層1で着地" value={diagnostics?.myFoodSavedLayer1Count ?? 0} />
        <StatRow t={t} label="⭐️の My食品のピルから記録" value={diagnostics?.myFoodShelfTapCount ?? 0} />
        <StatRow t={t} label="My食品ページを開いた" value={diagnostics?.myFoodsPageOpenCount ?? 0} />
        <Caption tone="secondary">DB に着地しない名前 (= DB の穴の手がかり)</Caption>
        {myFoodSplit.notLanded.length === 0 ? (
          <Body tone="secondary">なし</Body>
        ) : (
          myFoodSplit.notLanded.map((f) => <Body key={f.id}>{f.name}</Body>)
        )}
        <Caption tone="secondary">DB に着地する名前 (= 検索の語彙の穴)</Caption>
        {myFoodSplit.landed.length === 0 ? (
          <Body tone="secondary">なし</Body>
        ) : (
          myFoodSplit.landed.map((f) => <Body key={f.id}>{f.name}</Body>)
        )}
      </Section>

      {/* ── ランキング品質の目視確認 ───────────────────────────────────── */}
      <Section title="⭐️ ランキング上位" t={t}>
        <Body size="sm" tone="secondary">
          ウィジェットのボタンにもこの並びが供給される。的外れなら学習が効いていない。
        </Body>
        <StatRow t={t} label="履歴エントリ数" value={historyEntryCount} />
        {topRanked.length === 0 ? (
          <Body tone="secondary">まだランキングがありません</Body>
        ) : (
          <View style={{ gap: t.spacing['2'] }}>
            {topRanked.map((r, i) => (
              <View
                key={`${r.categoryKey}-${r.label}-${i}`}
                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing['3'] }}
              >
                <Body size="sm" style={{ flex: 1 }}>
                  {i + 1}. {r.label}
                </Body>
                <Caption tone="secondary">{r.amountLabel}</Caption>
              </View>
            ))}
          </View>
        )}
      </Section>

      <View style={{ gap: t.spacing['3'] }}>
        <Button label="診断データを共有 (JSON)" onPress={handleExport} />
        <Button label="診断データを消去" variant="ghost" onPress={handleReset} />
        <Caption tone="secondary">
          共有される JSON に食事ログ本体は含まれない (件数と集計のみ)。
        </Caption>
      </View>
    </ScrollView>
  );
}

function StatRow({
  t,
  label,
  value,
  note,
}: {
  t: ReturnType<typeof useTheme>;
  label: string;
  value: number | string;
  note?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: t.spacing['3'],
      }}
    >
      <View style={{ flex: 1, gap: t.spacing['0.5'] }}>
        <Label>{label}</Label>
        {note ? <Caption tone="secondary">{note}</Caption> : null}
      </View>
      <Text
        style={{
          color: t.colors.content.primary,
          fontSize: t.typography.fontSize.lg,
          fontWeight: t.typography.fontWeight.semibold,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
