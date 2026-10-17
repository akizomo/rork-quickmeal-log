/**
 * SheetScreen — ネイティブ formSheet ルートの中身のレイアウト。
 *
 * iOS 標準の小さな入力シート (ヘルスケアの「データを追加」、カレンダーの「新規イベント」) と同じく、
 * **上部バーの左に「キャンセル」・中央にタイトル・右に確定 (保存 / 追加)** を置き、下に大きなボタンは置かない。
 * 確定ボタンがキーボードに押し上げられる位置関係を考えなくてよく、シートも低く収まる (2026-10-17 変更)。
 *
 * BottomSheet と違い、Modal・アニメーション・ジェスチャー・キーボード追従は持たない。
 * それらは react-native-screens のネイティブシート (UISheetPresentationController /
 * Android の bottom sheet) が担う。この部品は「シートの中の並びと余白」だけを揃える。
 *
 * # 使い方
 *   // app/_layout.tsx
 *   <Stack.Screen name="record-body" options={formSheetOptions(t)} />
 *
 *   // app/record-body.tsx
 *   <SheetScreen
 *     title="体重を記録"
 *     cancelLabel={t('common.cancel')}
 *     confirmAction={{ label: t('common.save'), onPress: save }}
 *   >
 *     {body}
 *   </SheetScreen>
 *
 * 確定操作の無い表示専用シートは confirmAction を省略する → 右上が × になる。
 *
 * # キーボードでの確定 (confirmPlacement="return-key")
 * 入力欄があるシートでは、確定をキーボード側に置き、上部バーには出さない (同じ操作を2か所に並べない)。
 * TextInput 側で次を指定する:
 *   keyboardType="decimal-pad" returnKeyType="done" inputAccessoryViewButtonLabel="保存" onSubmitEditing={save}
 * - iOS: 数字キーボードに returnKeyType を付けると RN がキーボード右上に OS 標準の確定カプセルを付ける。
 *   inputAccessoryViewButtonLabel でその文言を変えられる (2026-10-17 Simulator で確認)
 * - Android: 数字キーボード右下の ✓ で確定。ただし ✓ を使わず戻るでキーボードを閉じる人もいるので、上部バーにも出す
 *
 * # 制約 (docs/SHEET_MIGRATION.md §6-7, SDK 54 / react-native-screens 4.16 時点)
 * - `fitToContents` で使う。本文の高さは中身で決まる (flex: 1 は使えない)
 * - **本文に ScrollView を入れない**。formSheet 内の ScrollView は描画位置がずれる既知の不具合がある
 *   (背の高いシートは SDK 58 へ更新するまで BottomSheet のまま)
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Theme } from '../theme';
import { useTheme } from '../theme';
import { fontWeight } from '../tokens/primitives/typography';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Label } from './Typography';

export type SheetScreenAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export type SheetScreenProps = {
  title?: string;
  /** 右上の確定ボタン (太字)。省略時は右上が × になる */
  confirmAction?: SheetScreenAction;
  /** 左上のキャンセル。confirmAction があるときだけ表示する。既定の onCancel は router.back() */
  cancelLabel?: string;
  onCancel?: () => void;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * 確定ボタンの置き場所 (iOS)。Android は常に上部バー。
   * - 'bar' (既定): 上部バー右
   * - 'return-key': キーボード側の確定 (iOS は数字キーボード右上のカプセル)。TextInput 側の設定は上の説明を参照
   */
  confirmPlacement?: 'bar' | 'return-key';
  testID?: string;
};


// BottomSheet の SHEET_RADIUS と揃える (M3 large container radius)
const SHEET_CORNER_RADIUS = 28;
// iOS ナビゲーションバーの高さ (UINavigationBar 標準 44pt)
const BAR_HEIGHT = 44;

/** formSheet ルート共通の Stack.Screen options。シートの見た目 (角丸・グラバー・背景) をここで統一する */
export function formSheetOptions(t: Theme): NativeStackNavigationOptions {
  return {
    presentation: 'formSheet',
    headerShown: false,
    sheetAllowedDetents: 'fitToContents',
    sheetGrabberVisible: true,
    sheetCornerRadius: SHEET_CORNER_RADIUS,
    contentStyle: { backgroundColor: t.colors.surface.default },
  };
}

export function SheetScreen({
  title,
  confirmAction,
  cancelLabel,
  onCancel,
  children,
  contentStyle,
  confirmPlacement = 'bar',
  testID,
}: SheetScreenProps) {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cancel = onCancel ?? (() => router.back());
  // iOS でキーボード側に確定を置くときは、上部バーには出さない (同じ操作を2か所に並べない)
  const confirmOnKeyboard = confirmPlacement !== 'bar' && !!confirmAction && Platform.OS === 'ios';

  return (
    <View style={{ backgroundColor: t.colors.surface.default }} testID={testID}>
      {/* 上部バー: グラバーの下に 左=キャンセル / 中央=タイトル / 右=確定 or × */}
      <View style={[styles.bar, { paddingHorizontal: t.spacing['2'], marginTop: t.spacing['4'] }]}>
        <View style={[styles.side, styles.sideLeft]}>
          {confirmAction && cancelLabel ? (
            <Button
              label={cancelLabel}
              variant="plain"
              size="sm"
              onPress={cancel}
              labelStyle={{ fontWeight: fontWeight.regular }}
              testID={testID ? `${testID}-cancel` : undefined}
            />
          ) : null}
        </View>
        {title ? (
          <Label size="lg" numberOfLines={1} style={styles.title}>
            {title}
          </Label>
        ) : null}
        <View style={[styles.side, styles.sideRight]}>
          {confirmOnKeyboard ? null : confirmAction ? (
            <Button
              label={confirmAction.label}
              variant="plain"
              size="sm"
              onPress={confirmAction.onPress}
              disabled={confirmAction.disabled}
              loading={confirmAction.loading}
              labelStyle={{ fontWeight: fontWeight.bold }}
              testID={testID ? `${testID}-confirm` : undefined}
            />
          ) : (
            <IconButton
              icon="close"
              size="lg"
              onPress={cancel}
              accessibilityLabel="閉じる" // i18n-ignore: BottomSheet と同じ a11y ラベル (design-system 内は未翻訳)
              testID={testID ? `${testID}-close` : undefined}
            />
          )}
        </View>
      </View>

      <View
        style={[
          {
            paddingHorizontal: t.spacing['5'],
            paddingTop: t.spacing['4'],
            // キーボード表示中はシートごと押し上げられ、ここがキーボードとの間の余白になる
            paddingBottom: Math.max(insets.bottom, t.spacing['5']),
            gap: t.spacing['3'],
          },
          contentStyle,
        ]}
      >
        {children}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
  },
  sideLeft: {
    justifyContent: 'flex-start',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  title: {
    flexShrink: 1,
    textAlign: 'center',
  },
});
