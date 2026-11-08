/**
 * 利用状況イベントの型定義 (KPI計装 Layer 2)。設計と一覧の正本は docs/ANALYTICS.md §5。
 *
 * ここにあるイベント名と props だけが送れる。**食事の中身・数値・自由入力の文字は載せない**
 * (docs/ANALYTICS.md §3)。新しいイベントを足すときは、まず設計書の一覧に足す。
 */

/** meal_logged の入口。 */
export type MealLogSource =
  | 'quick_tab' // 9ボタンのタブ
  | 'frequent_pinned' // ⭐️ タブのピン留め
  | 'frequent_auto' // ⭐️ タブの自動補充
  | 'my_food_shelf' // ⭐️ タブの My食品のピル
  | 'search' // 検索ページ
  | 'my_food_page' // My食品ページ
  | 'direct_input' // 数値で入力
  | 'widget'; // ホーム画面ウィジェット

/** props を持たないイベントは undefined。 */
export interface AnalyticsEventMap {
  // 画面
  screen_viewed: { screen: string };

  // オンボーディング / 課金 (PRD §8.3 を引き継ぐ)。
  // intro / onboarding / paywall / weekly-recap を開いたことは screen_viewed で足りるので別イベントにしない。
  onboarding_step_viewed: { step: number };
  onboarding_completed: undefined;
  trial_started: { plan: 'monthly' | 'annual' | 'unknown' };
  purchase_restored: undefined;

  // 記録
  meal_logged: { source: MealLogSource; tab?: string; is_first: boolean };
  meal_log_edited: undefined;
  meal_log_deleted: undefined;
  search_opened: undefined;
  direct_input_opened: undefined;
  /** 検索語は載せない。諦めた事実と、カテゴリのヒントがあったかだけ。 */
  search_missed: { had_hints: boolean };
  my_food_saved: { landed_layer1: boolean };
  widget_log_committed: { count: number };

  // からだ / 目標 / 振り返り (値は載せない)
  weight_recorded: undefined;
  body_fat_recorded: undefined;
  goal_edited: undefined;

  // 許可 / 設定
  health_permission_result: { result: 'granted' | 'denied' };
  notification_permission_result: { result: 'granted' | 'denied' };
  /** 停止の直前に 1 回だけ送る。 */
  analytics_opt_out: undefined;
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
export type AnalyticsProps = Record<string, string | number | boolean>;
