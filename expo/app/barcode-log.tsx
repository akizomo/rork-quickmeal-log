/**
 * バーコードスキャン + 手動入力 → 今日のログに追加するモーダル画面
 *
 * フロー:
 *   スキャン → Open Food Facts で PFC 取得 → 確認・編集モーダル → ログ追加
 *   バーコードが見つからない場合 or 「手動入力」ボタン → 直接 PFC 入力
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Body, Caption, useTheme } from '@/design-system';
import { useAppState } from '@/providers/app-state-provider';
import { fetchByBarcode, type FoodFactsResult } from '@/utils/open-food-facts';
import { formatDateKey, generateId, getMealSlot } from '@/utils/nutrition';

type Screen = 'scan' | 'confirm' | 'manual';

interface DraftMacro {
  name: string;
  kcal: string;
  protein: string;
  fat: string;
  carbs: string;
  /** 何g分か (per100g の場合に表示・編集する) */
  grams: string;
  per100g: boolean;
}

const EMPTY_DRAFT: DraftMacro = {
  name: '',
  kcal: '',
  protein: '',
  fat: '',
  carbs: '',
  grams: '100',
  per100g: false,
};

function resultToDraft(r: FoodFactsResult): DraftMacro {
  return {
    name: r.name,
    kcal: String(r.kcal),
    protein: String(r.protein),
    fat: String(r.fat),
    carbs: String(r.carbs),
    grams: '100',
    per100g: r.per100g,
  };
}

function parseMacro(d: DraftMacro): { kcal: number; protein: number; fat: number; carbs: number } | null {
  const g = d.per100g ? parseFloat(d.grams) : 100;
  const factor = d.per100g ? g / 100 : 1;
  const kcal = parseFloat(d.kcal);
  const protein = parseFloat(d.protein);
  const fat = parseFloat(d.fat);
  const carbs = parseFloat(d.carbs);
  if ([g, kcal, protein, fat, carbs].some((v) => isNaN(v) || v < 0)) return null;
  return {
    kcal: Math.round(kcal * factor),
    protein: Math.round(protein * factor * 10) / 10,
    fat: Math.round(fat * factor * 10) / 10,
    carbs: Math.round(carbs * factor * 10) / 10,
  };
}

export default function BarcodLogRoute() {
  const router = useRouter();
  const theme = useTheme();
  const { pushLog, loggingDate } = useAppState();
  const [permission, requestPermission] = useCameraPermissions();

  const [screen, setScreen] = useState<Screen>(Platform.OS === 'web' ? 'manual' : 'scan');
  const [draft, setDraft] = useState<DraftMacro>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const scannedRef = useRef(false);

  const handleBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (scannedRef.current || loading) return;
      scannedRef.current = true;
      setLoading(true);
      try {
        const { result, error } = await fetchByBarcode(data);
        if (result) {
          setDraft(resultToDraft(result));
          setScreen('confirm');
        } else {
          const msg =
            error === 'not_found'
              ? 'この商品はデータベースに登録されていません。手動で入力してください。'
              : error === 'no_nutrition'
              ? 'この商品の栄養情報が登録されていません。手動で入力してください。'
              : '通信エラーが発生しました。手動で入力してください。';
          Alert.alert('バーコードを読み取れませんでした', msg, [
            {
              text: '手動入力',
              onPress: () => {
                setDraft(EMPTY_DRAFT);
                setScreen('manual');
              },
            },
            {
              text: 'もう一度スキャン',
              onPress: () => {
                scannedRef.current = false;
              },
            },
          ]);
        }
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleAdd = useCallback(() => {
    const macro = parseMacro(draft);
    if (!macro) {
      Alert.alert('入力エラー', 'kcal・P・F・C を正しく入力してください。');
      return;
    }
    const name = draft.name.trim() || '手動入力';
    const now = new Date();
    const dateKey = loggingDate ? formatDateKey(loggingDate) : formatDateKey(now);
    pushLog({
      id: generateId('custom'),
      date: dateKey,
      timestamp: now.toISOString(),
      mealSlot: getMealSlot(now),
      mode: 'dish',
      categoryKey: 'custom_scan',
      categoryLabel: name,
      macro,
    });
    router.back();
  }, [draft, loggingDate, pushLog, router]);

  const colors = theme.colors;

  // Web では手動入力画面を直接表示 (カメラ不使用)
  if (Platform.OS !== 'web' && !permission) {
    return <View style={{ flex: 1, backgroundColor: colors.surface.default }} />;
  }
  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <>
        <Stack.Screen options={{ title: 'バーコードスキャン', headerStyle: { backgroundColor: colors.surface.default }, headerTintColor: colors.content.primary, headerShadowVisible: false }} />
        <SafeAreaView style={[styles.center, { backgroundColor: colors.surface.default }]}>
          <Body style={{ textAlign: 'center', marginBottom: 16 }}>
            バーコードをスキャンするにはカメラへのアクセスが必要です。
          </Body>
          <Pressable style={[styles.btn, { backgroundColor: colors.action.primary.default }]} onPress={requestPermission}>
            <Body weight="bold" style={{ color: '#fff' }}>カメラを許可する</Body>
          </Pressable>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: screen === 'scan' ? 'バーコードスキャン' : screen === 'manual' ? '手動入力' : '栄養情報を確認',
          headerStyle: { backgroundColor: colors.surface.default },
          headerTintColor: colors.content.primary,
          headerShadowVisible: false,
        }}
      />

      {screen === 'scan' ? (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
            onBarcodeScanned={handleBarcode}
          />
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Body style={{ color: '#fff', marginTop: 8 }}>検索中...</Body>
            </View>
          )}
          <View style={styles.scanFrame} pointerEvents="none">
            <View style={[styles.scanBox, { borderColor: colors.action.primary.default }]} />
            <Caption style={{ color: '#fff', marginTop: 12, textAlign: 'center' }}>
              バーコードを枠内に合わせてください
            </Caption>
          </View>
          <View style={[styles.manualBar, { backgroundColor: colors.surface.default }]}>
            <Pressable
              onPress={() => { setDraft(EMPTY_DRAFT); setScreen('manual'); }}
              style={styles.manualBtn}
            >
              <Body style={{ color: colors.action.primary.default }}>手動で入力する</Body>
            </Pressable>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: colors.surface.default }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <MacroField
                label="食品名"
                value={draft.name}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                placeholder="例: プロテインバー"
                colors={colors}
              />
              {draft.per100g && (
                <MacroField
                  label="摂取量 (g)"
                  value={draft.grams}
                  onChangeText={(v) => setDraft((d) => ({ ...d, grams: v }))}
                  placeholder="100"
                  keyboardType="decimal-pad"
                  colors={colors}
                />
              )}
              <Caption tone="secondary" style={{ marginBottom: 8 }}>
                {draft.per100g ? '100g あたりの値を編集できます' : '1食分の値を入力してください'}
              </Caption>
              <MacroField label="kcal" value={draft.kcal} onChangeText={(v) => setDraft((d) => ({ ...d, kcal: v }))} keyboardType="decimal-pad" colors={colors} />
              <MacroField label="タンパク質 (g)" value={draft.protein} onChangeText={(v) => setDraft((d) => ({ ...d, protein: v }))} keyboardType="decimal-pad" colors={colors} />
              <MacroField label="脂質 (g)" value={draft.fat} onChangeText={(v) => setDraft((d) => ({ ...d, fat: v }))} keyboardType="decimal-pad" colors={colors} />
              <MacroField label="炭水化物 (g)" value={draft.carbs} onChangeText={(v) => setDraft((d) => ({ ...d, carbs: v }))} keyboardType="decimal-pad" colors={colors} />

              <Pressable
                style={[styles.btn, { backgroundColor: colors.action.primary.default, marginTop: 24 }]}
                onPress={handleAdd}
              >
                <Body weight="bold" style={{ color: '#fff' }}>ログに追加</Body>
              </Pressable>

              {screen === 'confirm' && (
                <Pressable
                  style={[styles.btnOutline, { borderColor: colors.content.tertiary, marginTop: 12 }]}
                  onPress={() => { scannedRef.current = false; setScreen('scan'); }}
                >
                  <Body style={{ color: colors.content.secondary }}>もう一度スキャン</Body>
                </Pressable>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

function MacroField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.fieldRow}>
      <Caption style={{ color: colors.content.secondary, width: 130 }}>{label}</Caption>
      <TextInput
        style={[styles.input, { color: colors.content.primary, borderColor: colors.border.default, backgroundColor: colors.surface.raised }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={colors.content.tertiary}
        keyboardType={keyboardType}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  form: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scanBox: { width: 260, height: 160, borderWidth: 2, borderRadius: 12 },
  manualBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 16, alignItems: 'center' },
  manualBtn: { paddingVertical: 8, paddingHorizontal: 24 },
});
