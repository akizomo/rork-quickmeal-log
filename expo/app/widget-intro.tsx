import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

import { Body, Button, Heading, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { widgetRequestPin } from '@/utils/widget-bridge';

// ─── ホーム画面見本の色 (実ウィジェット/OS chromeに合わせた固定値) ────────────
// ホーム画面 (OS) のchromeを模したイラストのため、design-system tokenではなく
// widget-prototype.tsx / Android widget_preview_*.xml と同じ固定パレットを使う。
const WALLPAPER = '#EDEBE4';
const WIDGET_BG = 'rgba(22, 32, 28, 0.88)';
const WIDGET_TEXT_PRIMARY = '#F0F4EF';
const WIDGET_TEXT_SECONDARY = 'rgba(240, 244, 239, 0.55)';
const WIDGET_ACCENT = '#82A280';
const WIDGET_TRACK = 'rgba(255,255,255,0.12)';
const WIDGET_BUTTON_BG = 'rgba(255,255,255,0.08)';
const STATUS_SHAPE = 'rgba(30, 30, 26, 0.22)';

const PREVIEW_CATEGORIES = [
  { icon: '🍚', name: '主食' },
  { icon: '🐓', name: '肉魚(低脂)' },
  { icon: '🥚', name: '卵' },
  { icon: '🥩', name: '脂あり肉魚' },
];

const RING_SIZE = 76;
const PHONE_W = 260;

function WidgetMock() {
  const r = (RING_SIZE - 8) / 2;
  const cx = RING_SIZE / 2;
  const circ = 2 * Math.PI * r;
  const progress = 0.67;
  const offset = circ * (1 - progress);

  return (
    <View style={styles.widgetMock}>
      <View style={{ width: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle cx={cx} cy={cx} r={r} stroke={WIDGET_TRACK} strokeWidth={8} fill="none" />
          <Circle
            cx={cx} cy={cx} r={r}
            stroke={WIDGET_ACCENT}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: WIDGET_TEXT_PRIMARY, fontSize: 15, fontWeight: '700' }}>660</Text>
          <Text style={{ color: WIDGET_TEXT_SECONDARY, fontSize: 9, fontWeight: '500' }}>kcal</Text>
        </View>
      </View>
      <View style={styles.widgetDivider} />
      <View style={styles.widgetButtonGrid}>
        {PREVIEW_CATEGORIES.map((cat) => (
          <View key={cat.name} style={styles.widgetButton}>
            <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
            <Text numberOfLines={1} style={{ fontSize: 9, color: WIDGET_TEXT_PRIMARY, fontWeight: '700' }}>
              {cat.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// 「他のアプリ」の存在を示すための無地アイコン枠 (中身の絵柄は入れない)。
function AppIconPlaceholder() {
  return <View style={styles.appIcon} />;
}

// デバイス上半分だけが見えている想定の見本イラスト。
// ステータスバーは時刻/バッテリー等を書き分けず、左右に抽象的な図形だけを置く。
function HomeScreenMock() {
  return (
    <View style={styles.homeScreenMock}>
      <View style={styles.statusBar}>
        <View style={styles.statusTimeShape} />
        <Svg width={40} height={10}>
          <Circle cx={5} cy={5} r={4} fill={STATUS_SHAPE} />
          <Rect x={15} y={1} width={8} height={8} rx={1.5} fill={STATUS_SHAPE} />
          <Polygon points="31,1 35,9 27,9" fill={STATUS_SHAPE} />
        </Svg>
      </View>

      <View style={styles.iconRow}>
        {[0, 1, 2, 3].map((i) => (
          <AppIconPlaceholder key={i} />
        ))}
      </View>

      <View style={styles.widgetRow}>
        <WidgetMock />
      </View>
    </View>
  );
}

/**
 * ヘルスコネクト連携画面の直後に表示するウィジェット導線プロトタイプ。
 * まだ initial-route には未接続 — /widget-intro で直接確認するための試作画面。
 */
export default function WidgetIntroRoute() {
  const router = useRouter();
  const t = useTheme();
  const { updateSettingsValues } = useAppState();
  const [busy, setBusy] = useState<boolean>(false);

  const goHome = useCallback(() => {
    updateSettingsValues({ widgetIntroSeenAtISO: new Date().toISOString() });
    router.replace('/');
  }, [router, updateSettingsValues]);

  const handleAddWidget = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await widgetRequestPin();
    } finally {
      setBusy(false);
      goHome();
    }
  }, [busy, goHome]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: t.colors.surface.default }} testID="widget-intro-screen">
        <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['6'],
              paddingBottom: t.spacing['5'],
              flexGrow: 1,
              gap: t.spacing['4'],
            }}
          >
            <Heading size="2xl">ホーム画面からワンタップで記録</Heading>
            <Body tone="secondary">
              ウィジェットを追加すると、アプリを開かずにホーム画面から食事を記録できます。
            </Body>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <HomeScreenMock />
            </View>
          </ScrollView>

          <View
            style={{
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['2'],
              paddingBottom: t.spacing['3'],
              gap: t.spacing['2'],
            }}
          >
            <Button
              label="ウィジェットを追加"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleAddWidget}
              disabled={busy}
              testID="widget-intro-cta"
            />
            <Button
              label="あとで"
              variant="ghost"
              size="lg"
              fullWidth
              onPress={goHome}
              disabled={busy}
              testID="widget-intro-skip"
            />
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  homeScreenMock: {
    width: PHONE_W,
    alignSelf: 'center',
    backgroundColor: WALLPAPER,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 14,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusTimeShape: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: STATUS_SHAPE,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(30, 30, 26, 0.14)',
  },
  widgetRow: {
    alignItems: 'center',
  },
  widgetMock: {
    width: '100%',
    height: 110,
    backgroundColor: WIDGET_BG,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  widgetDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  widgetButtonGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  widgetButton: {
    width: '47%',
    height: '47%',
    backgroundColor: WIDGET_BUTTON_BG,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
});
