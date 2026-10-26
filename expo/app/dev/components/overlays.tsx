/**
 * Overlays — シートの見本。DEV 専用。
 *
 * 2026-10-18 からアプリ本体はネイティブ formSheet (SheetScreen / TallSheetScreen) を使う。
 * 下の Dialog / BottomSheet (RN Modal ベース) は比較用に残しているだけで、新規には使わない (CLAUDE.md)。
 * Callout (吹き出し) はシートの種類によらず使う。
 */

import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Body,
  BottomSheet,
  Button,
  Callout,
  Caption,
  Dialog,
  Heading,
  IconButton,
  useTheme,
  type Theme,
} from '@/design-system';
import { Section } from '../_shared';

export default function OverlaysScreen() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Overlays' }} />
      <ScrollView
        style={{ backgroundColor: t.colors.surface.default }}
        contentContainerStyle={{ padding: t.spacing['5'], gap: t.spacing['8'] }}
      >
        <FormSheetSection t={t} />
        <DialogSection t={t} />
        <BottomSheetSection t={t} />
        <CalloutSection t={t} />
      </ScrollView>
    </>
  );
}

// ---------- formSheet (推奨) ----------
function FormSheetSection({ t }: { t: Theme }) {
  const router = useRouter();
  return (
    <Section title="formSheet (推奨)" t={t}>
      <Caption>
        react-native-screens のネイティブシート。開閉は router.push / back、スワイプ・背景タップ・
        キーボード追従は OS が担う。中身の並びだけ SheetScreen / TallSheetScreen で揃える。
      </Caption>
      <View style={{ gap: t.spacing['2'] }}>
        <Button label="SheetScreen (中身の高さ・数字入力)" variant="secondary" onPress={() => router.push('/dev/components/sheet-small')} />
        <Button label="TallSheetScreen (60%/100%・固定フッター)" variant="secondary" onPress={() => router.push('/dev/components/sheet-tall')} />
      </View>
    </Section>
  );
}

// ---------- Dialog (旧・比較用) ----------
function DialogSection({ t }: { t: Theme }) {
  const [withFooterOpen, setWithFooterOpen] = useState(false);
  const [minimalOpen, setMinimalOpen] = useState(false);

  return (
    <Section title="Dialog (旧・比較用)" t={t}>
      <Caption>
        中央配置のモーダル。header/footer が無い側は content 自身が広めの余白
        (spacing.5) を持ち、ある側は控えめ (spacing.2) になる。
      </Caption>
      <View style={{ gap: t.spacing['2'] }}>
        <Button label="title + actions" variant="secondary" onPress={() => setWithFooterOpen(true)} />
        <Button label="title/footer 無し (BalanceModal と同型)" variant="secondary" onPress={() => setMinimalOpen(true)} />
      </View>

      <Dialog
        visible={withFooterOpen}
        onClose={() => setWithFooterOpen(false)}
        title="確認"
        primaryAction={{ label: 'OK', onPress: () => setWithFooterOpen(false) }}
        secondaryAction={{ label: 'キャンセル', onPress: () => setWithFooterOpen(false) }}
        testID="dialog-with-footer"
      >
        <Body>title と primary/secondary action がある標準構成。</Body>
      </Dialog>

      <Dialog visible={minimalOpen} onClose={() => setMinimalOpen(false)} testID="dialog-minimal">
        <View style={{ alignItems: 'flex-end' }}>
          <IconButton icon="close" size="md" onPress={() => setMinimalOpen(false)} accessibilityLabel="閉じる" />
        </View>
        <Body>
          title/footer を渡さず、children 側で独自の閉じるボタンとレイアウトを
          完結させるパターン (BalanceModal 等)。
        </Body>
      </Dialog>
    </Section>
  );
}

// ---------- BottomSheet ----------
function BottomSheetSection({ t }: { t: Theme }) {
  const [basicOpen, setBasicOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [headerlessOpen, setHeaderlessOpen] = useState(false);
  const [longOpen, setLongOpen] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <Section title="BottomSheet (旧・比較用)" t={t}>
      <Caption>
        Material 3 / HIG 準拠 — 退場アニメ完走を待ってから unmount。drag handle から
        下スワイプで dismiss、scrim タップでも dismiss。
      </Caption>

      <View style={{ gap: t.spacing['2'] }}>
        <Button label="basic (title + close)" variant="secondary" onPress={() => setBasicOpen(true)} />
        <Button label="with actions (cancel / save)" variant="secondary" onPress={() => setActionsOpen(true)} />
        <Button label="no header / no footer" variant="secondary" onPress={() => setHeaderlessOpen(true)} />
        <Button label="long content (scroll)" variant="secondary" onPress={() => setLongOpen(true)} />
      </View>

      <BottomSheet
        visible={basicOpen}
        onClose={() => setBasicOpen(false)}
        title="シートのタイトル"
        testID="bs-basic"
      >
        <Body>
          シートの本文。スワイプダウン、× ボタン、scrim タップ、Android back の
          いずれでも同じ退場アニメを通って閉じる。
        </Body>
      </BottomSheet>

      <BottomSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="量を選ぶ"
        primaryAction={{
          label: '保存して追加',
          onPress: () => {
            setCount((c) => c + 1);
            setActionsOpen(false);
          },
        }}
        secondaryAction={{
          label: 'キャンセル',
          onPress: () => setActionsOpen(false),
        }}
        testID="bs-actions"
      >
        <Body>左に secondary (ghost)、右に primary。各 flex:1 で均等に並ぶ。</Body>
        <Caption tone="secondary">保存ボタンを押した回数: {count}</Caption>
      </BottomSheet>

      <BottomSheet
        visible={headerlessOpen}
        onClose={() => setHeaderlessOpen(false)}
        testID="bs-minimal"
      >
        <Heading size="xl">ミニマル構成</Heading>
        <Body>title / actions を渡さずに children だけで完結するパターン。</Body>
        <View style={{ height: t.spacing['3'] }} />
        <Button label="閉じる" variant="primary" onPress={() => setHeaderlessOpen(false)} fullWidth />
      </BottomSheet>

      <BottomSheet
        visible={longOpen}
        onClose={() => setLongOpen(false)}
        title="スクロール可能な内容"
        primaryAction={{ label: '完了', onPress: () => setLongOpen(false) }}
        secondaryAction={{ label: '戻る', onPress: () => setLongOpen(false) }}
        testID="bs-long"
      >
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={{
              padding: t.spacing['3'],
              marginBottom: t.spacing['2'],
              backgroundColor: t.colors.surface.raised,
              borderRadius: t.radius.md,
            }}
          >
            <Body>項目 {i + 1}</Body>
            <Caption tone="secondary">行きを越えても drag handle 領域からだけ dismiss できる</Caption>
          </View>
        ))}
      </BottomSheet>
    </Section>
  );
}

// ---------- Callout ----------
function CalloutSection({ t }: { t: Theme }) {
  const [visible, setVisible] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <Section title="Callout" t={t}>
      <Caption>
        要素を指す吹き出し。面は surface.inverse、radius.md + elevation.md。尻尾は下向きで
        arrowAlign (start/center/end) か arrowOffset (左端からの px) で位置を合わせる。操作は止めない。
      </Caption>

      <View style={{ gap: t.spacing['4'] }}>
        <Callout
          visible={visible}
          title="20〜30kcalは、ごはんひと口くらいの差。"
          message="ざっくりでも、記録を続けるほうがずっと大切です。"
          onDismiss={() => setVisible(false)}
          dismissAccessibilityLabel="ヒントを閉じる"
          testID="callout-demo"
        />
        <Callout visible message="title 無し・閉じるボタン無し (arrowAlign=center)" arrowAlign="center" />
        <Callout visible message="arrowAlign=end" arrowAlign="end" />
        <Callout visible message="arrowOffset=120 (尻尾の中心を左端から 120px に)" arrowOffset={120} />
        <Button label={visible ? '1つ目を隠す' : '1つ目を出す'} variant="secondary" onPress={() => setVisible((v) => !v)} />
        <Button label="BottomSheet の footerAccessory で使う" variant="secondary" onPress={() => setSheetOpen(true)} />
      </View>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="footerAccessory"
        footerLeft={<Heading size="lg">312 kcal</Heading>}
        footerAccessory={
          <Callout
            visible={sheetOpen}
            title="20〜30kcalは、ごはんひと口くらいの差。"
            message="ざっくりでも、記録を続けるほうがずっと大切です。"
          />
        }
        primaryAction={{ label: '記録する', onPress: () => setSheetOpen(false) }}
        testID="bs-callout"
      >
        <Body>footerAccessory は下端がフッター上端に揃い、コンテンツの上に重なる。</Body>
      </BottomSheet>
    </Section>
  );
}
