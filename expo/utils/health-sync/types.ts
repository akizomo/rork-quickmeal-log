/**
 * Health 連動の正規化型。
 *
 * ネイティブ SDK (react-native-health / react-native-health-connect) の型を
 * アプリ側で直接参照しないための共通インタフェース。
 * Phase 1 以降で各 adapter がこれを満たす形でデータを返す。
 */

export type HealthMetricSource = 'manual' | 'health';

export type HealthSyncStatus =
  | 'unsupported'              // OS/プラットフォーム自体が非対応 (Web, 旧Android, など)
  | 'provider_missing'         // Android: Health Connect プロバイダ未インストール
  | 'provider_update_required' // Android: Health Connect プロバイダのアップデート要
  | 'unauthorized'             // SDK 利用可能だが権限未許可
  | 'authorized'               // 権限許可済み
  | 'unknown';

export interface HealthWeightSample {
  /** YYYY-MM-DD */
  date: string;
  /** ISO timestamp */
  recordedAt: string;
  weightKg: number;
  /** プラットフォーム固有の安定ID。重複排除に使用 */
  healthSyncId: string;
}

export interface HealthBodyFatSample {
  date: string;
  recordedAt: string;
  bodyFatPct: number;
  healthSyncId: string;
}

export interface HealthWorkoutSample {
  /** ローカル日付 (YYYY-MM-DD) */
  date: string;
  /** 開始時刻 ISO */
  startedAt: string;
  /** 終了時刻 ISO */
  endedAt: string;
  /** プラットフォーム固有の workout/exercise 種別を文字列で保持 (デバッグ用) */
  rawType: string;
  /** アプリ内 `EXERCISE_TYPES` のキーに正規化済 (mapping.ts) */
  exerciseTypeKey: string;
  /** アプリ内表示ラベル */
  exerciseLabel: string;
  /** 経過時間 (分) */
  minutes: number;
  /** 消費 kcal (gross) */
  grossKcal: number;
  healthSyncId: string;
}

export interface HealthDailyActivitySample {
  date: string;
  steps: number;
  /** アクティブエネルギー (kcal, 1日合計) */
  activeKcal: number;
}

export interface HealthSyncResult {
  weights: HealthWeightSample[];
  bodyFats: HealthBodyFatSample[];
  workouts: HealthWorkoutSample[];
  dailyActivities: HealthDailyActivitySample[];
  /** 同期完了時刻 (ISO) */
  syncedAt: string;
}

export interface HealthSyncAdapter {
  /** プラットフォームが Health 連動をサポートしているか */
  isSupported(): boolean;
  /** 必要な権限をリクエスト。許可されたら true */
  requestPermissions(): Promise<boolean>;
  /** 直近 N 日分のデータを取得 */
  fetch(rangeDays: number): Promise<HealthSyncResult>;
  /** 現在の権限状態 */
  getStatus(): Promise<HealthSyncStatus>;
  /** 診断情報 (実機トラブルシュート用に生の SDK 状態を返す) */
  getDiagnostics(): Promise<HealthDiagnostics>;
}

/** 実機トラブルシュート用の生の状態情報 */
export interface HealthDiagnostics {
  platform: string;
  /** getSdkStatus() の生の数値 (Android のみ。1=UNAVAILABLE,2=UPDATE_REQUIRED,3=AVAILABLE) */
  rawSdkStatus: number | null;
  /** rawSdkStatus を人間可読にした文字列 */
  sdkStatusLabel: string;
  /** initialize() が成功したか */
  initialized: boolean;
  /** 許可済み権限の recordType 一覧 */
  grantedPermissions: string[];
  /** 正規化された status */
  status: HealthSyncStatus;
}
