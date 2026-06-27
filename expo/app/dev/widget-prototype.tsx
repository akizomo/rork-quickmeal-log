/**
 * Widget Prototype — ホーム画面ウィジェット UI の視覚確認。
 * 3サイズ (2×2 / 4×2 / 3×3) をシミュレート。
 * 実装前にレイアウト・インタラクションを検証する目的で作成。
 */
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/design-system';

// ─── サンプルデータ ──────────────────────────────────────────────
const SAMPLE_CONSUMED = 1340;
const SAMPLE_TARGET = 2000;

// 9カテゴリ — QuickLogSection.tsx の INGREDIENT_SHORT_LABEL + quick-log-master.ts の emoji に完全準拠
const CATEGORIES = [
  { id: 'staple',        icon: '🍚', name: '主食',         recent: 'ごはん',     sublabel: '1杯',     kcal: 252 },
  { id: 'lean_protein',  icon: '🐓', name: '肉魚(低脂)',   recent: '鶏むね',     sublabel: '100g',    kcal: 114 },
  { id: 'egg',           icon: '🥚', name: '卵',           recent: '卵',         sublabel: '1個',     kcal: 76  },
  { id: 'fatty_protein', icon: '🥩', name: '脂あり肉魚',   recent: '牛こま',     sublabel: '100g',    kcal: 235 },
  { id: 'dairy_soy',     icon: '🥛', name: '乳・大豆',     recent: '豆腐',       sublabel: '半丁',    kcal: 57  },
  { id: 'veggies',       icon: '🥦', name: '野菜',         recent: 'サラダ',     sublabel: '1皿',     kcal: 30  },
  { id: 'fruit',         icon: '🍎', name: '果物',         recent: 'バナナ',     sublabel: '1本',     kcal: 86  },
  { id: 'added_fat',     icon: '🧈', name: '油・調味',     recent: 'オリーブ油', sublabel: '大さじ1', kcal: 111 },
  { id: 'snack_drink',   icon: '🍩', name: 'おやつ甘飲',   recent: 'プロテイン', sublabel: '1杯',     kcal: 130 },
];

// ─── ウィジェットカラー ──────────────────────────────────────────
const WIDGET_BG = 'rgba(22, 32, 28, 0.88)';
const WIDGET_TEXT_PRIMARY = '#F0F4EF';
const WIDGET_TEXT_SECONDARY = 'rgba(240, 244, 239, 0.55)';
const WIDGET_ACCENT = '#82A280';
const WIDGET_TRACK = 'rgba(255,255,255,0.12)';
const WIDGET_BUTTON_BG = 'rgba(255,255,255,0.08)';
const WIDGET_BUTTON_PRESSED = 'rgba(255,255,255,0.18)';
const WALLPAPER = '#1A2820';

// セルサイズ (dp)
const CELL = 70;
const GAP = 8;
const BORDER_RADIUS = 16;

function cellsToDP(n: number) {
  return CELL * n + GAP * (n - 1);
}

// ─── ミニリング ──────────────────────────────────────────────────
function MiniRing({
  consumed,
  target,
  size,
  strokeWidth = 7,
  showLabel = true,
}: {
  consumed: number;
  target: number;
  size: number;
  strokeWidth?: number;
  showLabel?: boolean;
}) {
  const progress = Math.min(consumed / Math.max(target, 1), 1);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const remaining = Math.max(target - consumed, 0);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cx} r={r} stroke={WIDGET_TRACK} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx} cy={cx} r={r}
          stroke={WIDGET_ACCENT}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </Svg>
      {showLabel && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <Text style={{ color: WIDGET_TEXT_SECONDARY, fontSize: 9, fontWeight: '600', lineHeight: 12 }}>のこり</Text>
          <Text style={{ color: WIDGET_TEXT_PRIMARY, fontSize: size < 80 ? 16 : 22, fontWeight: '700', lineHeight: size < 80 ? 20 : 27 }}>
            {remaining >= 1000 ? `${(remaining / 1000).toFixed(1)}k` : remaining}
          </Text>
          <Text style={{ color: WIDGET_TEXT_SECONDARY, fontSize: 9, fontWeight: '500', lineHeight: 12 }}>kcal</Text>
        </View>
      )}
    </View>
  );
}

// ─── カテゴリボタン ───────────────────────────────────────────────
type LogState = { id: string } | null;

function CategoryButton({
  cat,
  logged,
  onLog,
  onUndo,
  iconSize = 20,
}: {
  cat: (typeof CATEGORIES)[number];
  logged: boolean;
  onLog: (id: string) => void;
  onUndo: () => void;
  iconSize?: number;
}) {
  if (logged) {
    return (
      <Pressable
        onPress={onUndo}
        style={({ pressed }) => ({
          flex: 1,
          backgroundColor: pressed ? 'rgba(130,162,128,0.3)' : 'rgba(130,162,128,0.15)',
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          borderWidth: 1,
          borderColor: 'rgba(130,162,128,0.4)',
        })}
      >
        <Text style={{ fontSize: 11, color: WIDGET_ACCENT, fontWeight: '700' }}>✓ 記録済</Text>
        <Text style={{ fontSize: 10, color: WIDGET_ACCENT, fontWeight: '500' }}>↩ 取消</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => onLog(cat.id)}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed ? WIDGET_BUTTON_PRESSED : WIDGET_BUTTON_BG,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        paddingHorizontal: 2,
      })}
    >
      <Text style={{ fontSize: iconSize }}>{cat.icon}</Text>
      <Text numberOfLines={1} style={{ fontSize: 11, color: WIDGET_TEXT_PRIMARY, fontWeight: '700' }}>
        {cat.name}
      </Text>
      <Text numberOfLines={1} style={{ fontSize: 9, color: WIDGET_TEXT_SECONDARY, fontWeight: '500' }}>
        {cat.recent} · {cat.kcal}
      </Text>
    </Pressable>
  );
}

// ─── 2×2 ウィジェット ─────────────────────────────────────────────
// 直近使用頻度の高い上位4カテゴリを表示
function Widget2x2() {
  const [logState, setLogState] = useState<LogState>(null);
  const w = cellsToDP(2);
  const cats = CATEGORIES.slice(0, 4);
  const handleLog = useCallback((id: string) => setLogState({ id }), []);

  return (
    <View style={[styles.widgetBase, { width: w, height: w, borderRadius: BORDER_RADIUS, padding: 8, gap: 6 }]}>
      <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
        {cats.slice(0, 2).map((c) => (
          <CategoryButton key={c.id} cat={c} logged={logState?.id === c.id} onLog={handleLog} onUndo={() => setLogState(null)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
        {cats.slice(2, 4).map((c) => (
          <CategoryButton key={c.id} cat={c} logged={logState?.id === c.id} onLog={handleLog} onUndo={() => setLogState(null)} />
        ))}
      </View>
    </View>
  );
}

// ─── 4×2 ウィジェット ─────────────────────────────────────────────
// 左: カロリーリング / 右: 上位4カテゴリ
function Widget4x2() {
  const [logState, setLogState] = useState<LogState>(null);
  const w = cellsToDP(4);
  const h = cellsToDP(2);
  const ringSize = h - 20;
  const cats = CATEGORIES.slice(0, 4);
  const handleLog = useCallback((id: string) => setLogState({ id }), []);

  return (
    <View style={[styles.widgetBase, { width: w, height: h, borderRadius: BORDER_RADIUS, padding: 10, flexDirection: 'row', gap: 10 }]}>
      <View style={{ width: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <MiniRing consumed={SAMPLE_CONSUMED} target={SAMPLE_TARGET} size={ringSize} strokeWidth={10} />
      </View>
      <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {cats.slice(0, 2).map((c) => (
            <CategoryButton key={c.id} cat={c} logged={logState?.id === c.id} onLog={handleLog} onUndo={() => setLogState(null)} iconSize={18} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {cats.slice(2, 4).map((c) => (
            <CategoryButton key={c.id} cat={c} logged={logState?.id === c.id} onLog={handleLog} onUndo={() => setLogState(null)} iconSize={18} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── 3×3 ウィジェット ─────────────────────────────────────────────
// ヘッダー: リング + kcalサマリー / 本体: 全9カテゴリグリッド
function Widget3x3() {
  const [logState, setLogState] = useState<LogState>(null);
  const w = cellsToDP(3);
  const ringSize = 44;
  const handleLog = useCallback((id: string) => setLogState({ id }), []);

  return (
    <View style={[styles.widgetBase, { width: w, height: w, borderRadius: BORDER_RADIUS, padding: 8, gap: 6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
        <MiniRing consumed={SAMPLE_CONSUMED} target={SAMPLE_TARGET} size={ringSize} strokeWidth={5} showLabel={false} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: WIDGET_TEXT_PRIMARY, fontSize: 13, fontWeight: '700' }}>
            {SAMPLE_CONSUMED.toLocaleString()}
            <Text style={{ fontSize: 10, fontWeight: '500', color: WIDGET_TEXT_SECONDARY }}> / {SAMPLE_TARGET.toLocaleString()} kcal</Text>
          </Text>
          <Text style={{ color: WIDGET_ACCENT, fontSize: 11, fontWeight: '600', marginTop: 1 }}>
            あと {(SAMPLE_TARGET - SAMPLE_CONSUMED).toLocaleString()} kcal
          </Text>
        </View>
      </View>
      {[0, 3, 6].map((rowStart) => (
        <View key={rowStart} style={{ flexDirection: 'row', gap: 5, flex: 1 }}>
          {CATEGORIES.slice(rowStart, rowStart + 3).map((c) => (
            <CategoryButton key={c.id} cat={c} logged={logState?.id === c.id} onLog={handleLog} onUndo={() => setLogState(null)} iconSize={16} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── メイン画面 ───────────────────────────────────────────────────
export default function WidgetPrototype() {
  const t = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: t.colors.surface.default }}
      contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
    >
      <View style={{ gap: t.spacing['1'] }}>
        <Text style={{ color: t.colors.content.primary, fontSize: t.typography.fontSize['2xl'], fontWeight: t.typography.fontWeight.bold }}>
          Widget Prototype
        </Text>
        <Text style={{ color: t.colors.content.secondary, fontSize: t.typography.fontSize.sm }}>
          ホーム画面ウィジェットの UI 確認。ボタンをタップして undo フローも検証できます。
        </Text>
      </View>

      {[
        { label: '2×2 — クイックログ 4ボタン', desc: 'タップで即記録 · ↩取消', el: <Widget2x2 /> },
        { label: '4×2 — リング + 4ボタン', desc: '把握 + 記録ハイブリッド', el: <Widget4x2 /> },
        { label: '3×3 — 9ボタン + サマリー', desc: 'パワーユーザー向け', el: <Widget3x3 /> },
      ].map(({ label, desc, el }) => (
        <View key={label} style={{ gap: t.spacing['3'] }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: t.colors.content.primary, fontSize: t.typography.fontSize.base, fontWeight: t.typography.fontWeight.semibold }}>
              {label}
            </Text>
            <Text style={{ color: t.colors.content.tertiary, fontSize: t.typography.fontSize.xs }}>
              {desc}
            </Text>
          </View>
          <View style={[styles.homeScreen, { borderRadius: t.radius.xl }]}>
            {el}
          </View>
        </View>
      ))}

      <View style={{ height: t.spacing['8'] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  homeScreen: {
    backgroundColor: WALLPAPER,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetBase: {
    backgroundColor: WIDGET_BG,
    overflow: 'hidden',
  },
});
