/**
 * Custom Expo config plugin: Health Connect 必須 AndroidManifest エントリの注入
 *
 * `react-native-health-connect` 同梱の plugin は intent-filter を 1 個だけ
 * 追加するが、以下が欠落しているため Health Connect 連携が動かない:
 *   1. <uses-permission android:name="android.permission.health.READ_*" />
 *      — これがないと requestPermission() は空配列を返してダイアログを出さない
 *   2. <intent-filter> with android:name="androidx.health.intent.action.SHOW_PERMISSIONS_RATIONALE"
 *      — Android 14+ プラットフォーム統合された Health Connect で必要
 *   3. <queries> ブロック
 *      — Android 11+ はパッケージ可視性制限があり、<queries> なしだと
 *        getSdkStatus() が SDK_UNAVAILABLE を返してしまい連携が開始できない
 */

const { withAndroidManifest } = require('@expo/config-plugins');

/** 追加する Health Connect 読み取り権限 */
const HEALTH_PERMISSIONS = [
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_BODY_FAT',
  'android.permission.health.READ_EXERCISE',
];

/** 追加する Android 14+ intent-filter */
const ANDROID_14_INTENT = 'androidx.health.intent.action.SHOW_PERMISSIONS_RATIONALE';

/** Health Connect プロバイダのパッケージ名 */
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

/** Android 13 用 intent action (queries ブロックでも参照) */
const ANDROID_13_INTENT = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';

const withHealthConnectManifest = (config) =>
  withAndroidManifest(config, async (mod) => {
    const manifest = mod.modResults.manifest;

    // ===== (1) <uses-permission> を追加 =====
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    const existingPerms = new Set(
      manifest['uses-permission'].map((p) => p?.$?.['android:name']).filter(Boolean)
    );
    for (const perm of HEALTH_PERMISSIONS) {
      if (existingPerms.has(perm)) continue;
      manifest['uses-permission'].push({ $: { 'android:name': perm } });
    }

    // ===== (2) Android 14+ intent-filter を MainActivity に追加 =====
    // android:name="*MainActivity" 名で activity を検索 (リスト中の位置に依存しない)
    const app = manifest.application?.[0];
    const mainActivity = app?.activity?.find((a) => {
      const name = a?.$?.['android:name'];
      return typeof name === 'string' && /MainActivity$/.test(name);
    });
    if (mainActivity) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'] ?? [];

      const has14Action = mainActivity['intent-filter'].some(
        (f) =>
          Array.isArray(f.action) &&
          f.action.some((a) => a?.$?.['android:name'] === ANDROID_14_INTENT)
      );
      if (!has14Action) {
        mainActivity['intent-filter'].push({
          action: [{ $: { 'android:name': ANDROID_14_INTENT } }],
        });
      }
    }

    // ===== (3) <queries> ブロックを追加 =====
    // Android 11+ (API 30+) のパッケージ可視性制限対策。
    // Health Connect プロバイダ (com.google.android.apps.healthdata) と
    // 権限ダイアログ intent を宣言しないと getSdkStatus() が
    // SDK_UNAVAILABLE を返して連携が開始できない。
    manifest.queries = manifest.queries ?? [];
    const existingPackages = new Set(
      manifest.queries.flatMap((q) =>
        (q.package ?? []).map((p) => p?.$?.['android:name']).filter(Boolean)
      )
    );
    const existingIntentActions = new Set(
      manifest.queries.flatMap((q) =>
        (q.intent ?? []).flatMap((i) =>
          (i.action ?? []).map((a) => a?.$?.['android:name']).filter(Boolean)
        )
      )
    );

    if (!existingPackages.has(HEALTH_CONNECT_PACKAGE)) {
      manifest.queries.push({
        package: [{ $: { 'android:name': HEALTH_CONNECT_PACKAGE } }],
      });
    }
    if (!existingIntentActions.has(ANDROID_13_INTENT)) {
      manifest.queries.push({
        intent: [
          {
            action: [{ $: { 'android:name': ANDROID_13_INTENT } }],
          },
        ],
      });
    }

    return mod;
  });

module.exports = withHealthConnectManifest;
