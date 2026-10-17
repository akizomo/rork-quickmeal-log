/**
 * 体重 / 体脂肪率の記録シート (ネイティブ formSheet, docs/SHEET_MIGRATION.md 方針 B)。
 *
 * 以前は status.tsx と BodyStatsView.tsx にほぼ同じ BottomSheet が2つずつ重複していた。
 * ルートにまとめ、どちらの画面からも `router.push({ pathname: '/record-body', params: { kind } })` で開く。
 * 保存は app-state に直接書き込むので、呼び出し元へ値を返す必要はない。
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Caption, SheetScreen, useTheme } from '@/design-system';
import { radius } from '@/design-system/tokens/primitives/radius';
import { fontSize as fs } from '@/design-system/tokens/primitives/typography';
import { useT } from '@/hooks/useT';
import { useAppState } from '@/providers/app-state-provider';

export type RecordBodyKind = 'weight' | 'bodyFat';

/**
 * 入力として受け付ける範囲。範囲外のあいだは保存ボタンを無効にする。
 * 体重は以前は上限が無く、打ち間違いの 655 kg がそのまま保存できた (2026-10-17 Simulator で発覚)。
 */
const WEIGHT_RANGE_KG = { min: 20, max: 300 } as const;
const BODY_FAT_RANGE_PCT = { min: 0, max: 60 } as const; // min は含まない (従来どおり 0 < v <= 60)

function isValidInput(kind: RecordBodyKind, raw: string): boolean {
  if (raw.trim() === '') return false;
  const v = Number(raw);
  if (!Number.isFinite(v)) return false;
  return kind === 'weight'
    ? v >= WEIGHT_RANGE_KG.min && v <= WEIGHT_RANGE_KG.max
    : v > BODY_FAT_RANGE_PCT.min && v <= BODY_FAT_RANGE_PCT.max;
}

/** ネイティブシートの提示アニメ後にフォーカスする (spike で 400ms は競合しないことを確認済み) */
const AUTO_FOCUS_DELAY_MS = 400;

export default function RecordBodyRoute() {
  const router = useRouter();
  const theme = useTheme();
  const t = useT();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: RecordBodyKind = params.kind === 'bodyFat' ? 'bodyFat' : 'weight';
  const { profile, addWeightEntry, addBodyFatEntry } = useAppState();
  const [value, setValue] = useState<string>('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), AUTO_FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const valid = isValidInput(kind, value);
  const submit = () => {
    if (!valid) return;
    const v = Number(value);
    if (kind === 'weight') addWeightEntry(v);
    else addBodyFatEntry(v);
    router.back();
  };

  const currentBfPct = profile.currentBodyFatPct ?? null;
  const bfDiff =
    kind === 'bodyFat' && currentBfPct !== null && value !== ''
      ? Number((Number(value) - currentBfPct).toFixed(1))
      : null;

  return (
    <SheetScreen
      title={kind === 'weight' ? t('status.weightSheet.title') : t('status.bfSheet.title')}
      cancelLabel={t('common.cancel')}
      confirmAction={{ label: t('common.save'), onPress: submit, disabled: !valid }}
      confirmPlacement="return-key"
      testID={kind === 'weight' ? 'weight-sheet' : 'bf-sheet'}
    >
      <View style={[styles.inputWrap, { backgroundColor: theme.colors.surface.sunken }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.content.primary }]}
          value={value}
          onChangeText={setValue}
          // iOS: 数字キーボードに returnKeyType を付けると、RN がキーボード右上に既定の確定ボタン (「Done」カプセル) を付け、
          //   押すと onSubmitEditing が呼ばれる。inputAccessoryViewButtonLabel でその文言を「保存」に変えて、そのまま保存にする
          //   (自前の InputAccessoryView で置き換えず、OS 標準の見た目を使う。2026-10-17 決定)
          // Android: 数字キーボード右下の ✓ で保存
          keyboardType="decimal-pad"
          returnKeyType="done"
          inputAccessoryViewButtonLabel={t('common.save')}
          onSubmitEditing={submit}
          // 範囲外のときは閉じずにキーボードも出したままにする (有効なら submit がシートごと閉じる)
          blurOnSubmit={false}
          placeholder={kind === 'weight' ? '56.4' : '18.5'}
          placeholderTextColor={theme.colors.content.tertiary}
          testID={kind === 'weight' ? 'weight-input' : 'bf-input'}
        />
        <Text style={[styles.suffix, { color: theme.colors.content.secondary }]}>{kind === 'weight' ? 'kg' : '%'}</Text>
      </View>
      {bfDiff !== null && Number.isFinite(bfDiff) ? (
        <Caption tone="secondary">
          {t('status.bfSheet.diff', { diff: `${bfDiff > 0 ? '+' : ''}${bfDiff}` })}
        </Caption>
      ) : null}
    </SheetScreen>
  );
}

const styles = StyleSheet.create({
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 16 },
  input: { flex: 1, fontSize: fs['3xl'], fontWeight: '700' },
  suffix: { fontSize: fs.md, fontWeight: '700' },
});
