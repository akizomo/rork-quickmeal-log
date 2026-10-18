/**
 * TallSheetScreen — 背の高いネイティブ formSheet ルートの中身 (記録シート等)。
 *
 * SheetScreen (中身の高さに合わせる小さいシート) と違い、こちらは数値 detent で高さが決まり、
 *   見出し (左寄せタイトル + 右側の操作)
 *   本文 (ScrollView, flex: 1)
 *   固定フッター (左に任意の要素 / 右に主ボタン)
 * の3段で組む。旧 BottomSheet の `expandToFull` + `footerLeft` + `primaryAction` と同じ見た目・余白。
 *
 * - 本文の ScrollView は `automaticallyAdjustKeyboardInsets` で、最下部の入力欄をキーボードの上までスクロールする
 *   (最大 detent ではシート自体は持ち上がらないため。docs/SHEET_MIGRATION.md §7-6)
 * - SDK 58 (react-native-screens 4.30) 以上が前提。SDK 54 では formSheet 内の ScrollView の描画がずれた (§7-1)
 *
 * # 使い方
 *   // app/_layout.tsx
 *   <Stack.Screen name="log-identity" options={tallSheetOptions(t)} />
 *
 *   // app/log-identity.tsx
 *   <TallSheetScreen title="ごはんパン麺" primaryAction={{ label: '保存して追加', onPress: save }} footerLeft={<Preview />}>
 *     {body}
 *   </TallSheetScreen>
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackNavigationOptions } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '../theme';
import { useTheme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Heading } from './Typography';
import type { SheetScreenAction } from './SheetScreen';

// BottomSheet / SheetScreen と揃える (M3 large container radius)
const SHEET_CORNER_RADIUS = 28;

/**
 * 背の高い formSheet ルート共通の Stack.Screen options。
 * @param detents シートの高さ (画面高に対する比率、昇順)。既定は旧 BottomSheet の 60% と、引き上げ時の全高
 */
export function tallSheetOptions(t: Theme, detents: number[] = [0.6, 1.0]): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetAllowedDetents: detents,
    sheetInitialDetentIndex: 0,
    sheetGrabberVisible: true,
    sheetCornerRadius: SHEET_CORNER_RADIUS,
    contentStyle: { backgroundColor: t.colors.surface.default },
  };
}

export type TallSheetScreenProps = {
  title?: string;
  /** 見出し右側。既定は × (router.back())。差し替えると × は出ないので、必要なら自分で含める */
  headerRight?: React.ReactNode;
  /** 既定の × で閉じるときの処理。既定は router.back() */
  onClose?: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /** フッター右の主ボタン */
  primaryAction?: SheetScreenAction;
  /** フッター左 (kcal・PFC のプレビュー等) */
  footerLeft?: React.ReactNode;
  testID?: string;
};

export function TallSheetScreen({
  title,
  headerRight,
  onClose,
  children,
  contentStyle,
  primaryAction,
  footerLeft,
  testID,
}: TallSheetScreenProps) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const close = onClose ?? (() => router.back());
  const hasFooter = !!(primaryAction || footerLeft);
  const bottomInset = Math.max(insets.bottom, t.spacing['4']);
  // 見出しとフッターは ScrollView の上に重ねる (下記コメント)。本文の余白に高さを足すため実測する
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);

  return (
    <>
      {/* react-native-screens は formSheet 内の ScrollView の frame を「シート全体 (原点 0,0)」に強制補正する
          (RNSScreen.mm の applyFrameCorrectionForDescendantScrollView)。ScrollView を見出しの兄弟として
          flex で並べると、Yoga の位置 (見出しの下) と無視されて、本文が見出しの上へはみ出して描画された
          (2026-10-18 iOS 27 / react-native-screens 4.30 で確認)。補正と矛盾しないよう、ScrollView を最初から
          シート全面に置き、見出し・フッターを前面に重ねて、その高さ分を本文の余白に足す。
          ScrollView は画面直下の最初の子、見出し+フッターは 1 枚のオーバーレイにして、直下を 2 要素に保つ
          (3 つ以上だと RNSScreenContentWrapper が警告し、補正の前提が崩れる)。 */}
      <ScrollView
        testID={testID}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[
          {
            paddingHorizontal: t.spacing['5'],
            paddingTop: headerHeight + t.spacing['4'],
            paddingBottom: (hasFooter ? footerHeight : 0) + (hasFooter ? t.spacing['4'] : bottomInset),
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
      >
        {children}
      </ScrollView>
      <View style={styles.overlay} pointerEvents="box-none" collapsable={false}>
      <View
        collapsable={false}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        style={[styles.header, { backgroundColor: t.colors.surface.default, paddingHorizontal: t.spacing['5'], paddingTop: t.spacing['5'], paddingBottom: t.spacing['2'] }]}>
        {title ? <Heading size="lg">{title}</Heading> : <View />}
        {headerRight !== undefined ? (
          headerRight
        ) : (
          <IconButton
            icon="close"
            size="lg"
            onPress={close}
            accessibilityLabel="閉じる" // i18n-ignore: BottomSheet と同じ a11y ラベル (design-system 内は未翻訳)
            testID={testID ? `${testID}-close` : undefined}
          />
        )}
      </View>

      {hasFooter ? (
        <View
          onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          style={[
            styles.footer,
            {
              paddingHorizontal: t.spacing['5'],
              paddingTop: t.spacing['3'],
              paddingBottom: bottomInset,
              gap: t.spacing['3'],
              borderTopColor: t.colors.border.subtle,
              backgroundColor: t.colors.surface.default,
            },
          ]}
        >
          <View style={styles.footerItem}>{footerLeft ?? null}</View>
          {primaryAction ? (
            <Button
              label={primaryAction.label}
              variant="primary"
              onPress={primaryAction.onPress}
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              style={styles.footerItem}
              testID={testID ? `${testID}-primary` : undefined}
            />
          ) : (
            <View style={styles.footerItem} />
          )}
        </View>
      ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flex: 1,
  },
});
