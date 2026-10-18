/**
 * SheetScreen の見本 (中身の高さに合わせる formSheet)。DEV 専用。Overlays ページから開く。
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Body, Caption, SheetScreen, useTheme } from '@/design-system';

export default function DevSheetSmall() {
  const router = useRouter();
  const t = useTheme();
  const [value, setValue] = useState('');
  return (
    <SheetScreen
      title="体重を記録"
      cancelLabel="キャンセル"
      confirmAction={{ label: '保存', onPress: () => router.back(), disabled: value === '' }}
      confirmPlacement="return-key"
    >
      <Body size="sm" tone="secondary">
        上部バー: 左キャンセル / 中央タイトル / 右確定。数字入力では確定をキーボード右上の OS 標準カプセルに置く
        (confirmPlacement=&quot;return-key&quot;)。
      </Body>
      <View style={{ backgroundColor: t.colors.surface.sunken, borderRadius: t.radius.md, paddingHorizontal: t.spacing['4'] }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          returnKeyType="done"
          inputAccessoryViewButtonLabel="保存"
          onSubmitEditing={() => value !== '' && router.back()}
          placeholder="56.4"
          placeholderTextColor={t.colors.content.tertiary}
          style={{ fontSize: t.typography.fontSize['2xl'], paddingVertical: t.spacing['3'], color: t.colors.content.primary }}
        />
      </View>
      <Caption tone="secondary">下スワイプ・背景タップでも閉じる</Caption>
    </SheetScreen>
  );
}
