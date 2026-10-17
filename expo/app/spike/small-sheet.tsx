/**
 * スパイク A — 小シート: `sheetAllowedDetents: 'fitToContents'` + TextInput 自動フォーカス。
 * 確認: キーボードでシートが押し上げられるか (iOS/Android) / 高さが中身に合うか /
 *       シート上の Dialog (RN Modal) が開くか / Alert.alert / トースト (FullWindowOverlay)。
 * fitToContents は flex: 1 が使えないので、高さは中身で決める。
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, TextInput, View } from 'react-native';

import { Body, Button, Dialog, Heading, useTheme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { SpikeToast, useSpikeToast } from './_toast';

export default function SpikeSmallSheet() {
  const router = useRouter();
  const t = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState('62.4');
  const [dialogOpen, setDialogOpen] = useState(false);
  const toast = useSpikeToast();

  useEffect(() => {
    // ネイティブシートの提示アニメ後にフォーカス (BottomSheet 時代の 650ms ルールが要るかも確認)
    const id = setTimeout(() => inputRef.current?.focus(), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={{ backgroundColor: t.colors.surface.default, padding: t.spacing['5'], paddingBottom: t.spacing['8'], gap: t.spacing['4'] }}>
      <Heading size="lg">体重を記録 (spike)</Heading>
      <View style={{ backgroundColor: t.colors.surface.sunken, borderRadius: radius.md, paddingHorizontal: t.spacing['4'] }}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          style={{ fontSize: t.typography.fontSize.xl, paddingVertical: t.spacing['3'], color: t.colors.content.primary }}
        />
      </View>
      <Body size="sm" tone="secondary">platform: {Platform.OS} / キーボードの上に下のボタンが見えていれば OK</Body>
      <View style={{ flexDirection: 'row', gap: t.spacing['3'] }}>
        <Button label="Dialog" variant="ghost" onPress={() => setDialogOpen(true)} style={{ flex: 1 }} />
        <Button
          label="Alert"
          variant="ghost"
          onPress={() =>
            Alert.alert('記録をやめますか？', 'iOS 標準アラートの見た目確認', [
              { text: '続ける', style: 'cancel' },
              { text: 'やめる', style: 'destructive' },
            ])
          }
          style={{ flex: 1 }}
        />
        <Button label="Toast" variant="ghost" onPress={() => toast.show(`保存しました ${value}kg`)} style={{ flex: 1 }} />
      </View>
      <Button label="保存して閉じる" onPress={() => router.back()} />

      <Dialog
        visible={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="シート上の Dialog"
        primaryAction={{ label: 'OK', onPress: () => setDialogOpen(false) }}
      >
        <Body size="sm" tone="secondary">ネイティブ formSheet の上に RN Modal が出せるかの確認。</Body>
      </Dialog>
      <SpikeToast message={toast.message} />
    </View>
  );
}
