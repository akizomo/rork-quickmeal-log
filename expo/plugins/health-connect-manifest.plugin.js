/**
 * Custom Expo config plugin: Health Connect 必須 AndroidManifest エントリの注入
 *
 * `react-native-health-connect` 同梱の plugin は intent-filter を 1 個だけ
 * 追加するが、以下が欠落しているため Health Connect 連携が動かない:
 *   1. <uses-permission android:name="android.permission.health.READ_*" />
 *      — これがないと requestPermission() は空配列を返してダイアログを出さない
 *   2. <intent-filter> with android:name="androidx.health.intent.action.SHOW_PERMISSIONS_RATIONALE"
 *      — Android 14+ プラットフォーム統合された Health Connect で必要
 *
 * 本 plugin は (1) と (2) をまとめて注入する。
 *
 * 1. の `<uses-permission>` は読み取り対象データに合わせて追加する:
 *   - READ_STEPS / READ_ACTIVE_CALORIES_BURNED / READ_WEIGHT / READ_BODY_FAT /
 *     READ_EXERCISE
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

      // 既に同じ action があるかチェック (react-native-health-connect の plugin が
      // 旧 action を既存 intent-filter に push しているケースに対応)
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

    return mod;
  });

module.exports = withHealthConnectManifest;
