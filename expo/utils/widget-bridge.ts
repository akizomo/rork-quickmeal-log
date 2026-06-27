/**
 * widget-bridge.ts
 *
 * Android ホーム画面ウィジェット ↔ RN ブリッジ。
 * - Android のみ動作。iOS / Web では全メソッドが no-op になる。
 * - NativeModule: WidgetBridgeModule.kt
 */
import { NativeModules, Platform } from 'react-native';

const { WidgetBridge } = NativeModules;

const isAvailable = Platform.OS === 'android' && !!WidgetBridge;

export type WidgetPendingEntry = {
  categoryId: string; // 'staple' | 'lean_protein' | ...
  foodName: string;
  sublabel: string;
  kcal: number;
  timestamp: number;
};

/**
 * 今日の摂取/目標kcal をウィジェットに反映する。
 * todayMacro.kcal と adjustedTargetKcal が変わるたびに呼ぶ。
 */
export function widgetUpdateKcal(consumed: number, target: number): void {
  if (!isAvailable) return;
  WidgetBridge.updateWidgetData(Math.round(consumed), Math.round(target));
}

/**
 * ウィジェットのボタン定義（カテゴリ別デフォルト食品）を更新する。
 * 自動学習の実用化後に各カテゴリの直近食品を渡す。
 */
export function widgetUpdateCategories(
  categories: Array<{
    id: string;
    icon: string;
    name: string;
    recent: string;
    sublabel: string;
    kcal: number;
  }>
): void {
  if (!isAvailable) return;
  try {
    WidgetBridge.updateCategories(JSON.stringify(categories));
  } catch {
    // ignore
  }
}

/**
 * ウィジェットから積まれた pending queue を取り出して空にする。
 * フォアグラウンド復帰時に呼び出し、各エントリを quickLog フローへ流す。
 * @returns pending entries (空配列 = ウィジェット未操作 or 既に drain済み)
 */
export async function widgetDrainPendingQueue(): Promise<WidgetPendingEntry[]> {
  if (!isAvailable) return [];
  try {
    const json: string = await WidgetBridge.drainPendingQueue();
    return (JSON.parse(json) as WidgetPendingEntry[]) ?? [];
  } catch {
    return [];
  }
}
