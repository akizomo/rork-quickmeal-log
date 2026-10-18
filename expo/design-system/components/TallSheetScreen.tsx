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
import React from 'react';
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

  return (
    <View style={[styles.fill, { backgroundColor: t.colors.surface.default }]} testID={testID}>
      <View style={[styles.header, { paddingHorizontal: t.spacing['5'], paddingTop: t.spacing['5'], paddingBottom: t.spacing['2'] }]}>
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

      <ScrollView
        style={styles.fill}
        contentContainerStyle={[
          {
            paddingHorizontal: t.spacing['5'],
            paddingTop: t.spacing['4'],
            paddingBottom: hasFooter ? t.spacing['4'] : bottomInset,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {hasFooter ? (
        <View
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
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: {
    flex: 1,
  },
});
