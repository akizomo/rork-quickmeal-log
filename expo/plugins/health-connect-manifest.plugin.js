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

const { withAndroidManifest, withMainActivity } = require('@expo/config-plugins');

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

    // ===== (2.5) Android 14+ 用 ViewPermissionUsageActivity activity-alias =====
    // Android 14 では Health Connect が OS フレームワークに統合されており、
    // 権限ダイアログを表示するには VIEW_PERMISSION_USAGE / HEALTH_PERMISSIONS を
    // 処理する activity-alias が必須。これが無いと requestPermission() が
    // ダイアログを出さず空配列を返す (= no dialog / returned [0])。
    if (app && mainActivity) {
      app['activity-alias'] = app['activity-alias'] ?? [];
      const hasAlias = app['activity-alias'].some(
        (a) => a?.$?.['android:name'] === 'ViewPermissionUsageActivity'
      );
      if (!hasAlias) {
        const mainActivityName = mainActivity.$?.['android:name'] ?? '.MainActivity';
        app['activity-alias'].push({
          $: {
            'android:name': 'ViewPermissionUsageActivity',
            'android:exported': 'true',
            'android:targetActivity': mainActivityName,
            'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
          },
          'intent-filter': [
            {
              action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
              category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
            },
          ],
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

/**
 * MainActivity.kt に Health Connect 権限デリゲートの登録を注入する。
 *
 * `react-native-health-connect` v2+ は requestPermission() の結果を
 * ActivityResultLauncher 経由で受け取る。そのランチャーは MainActivity.onCreate で
 *   HealthConnectPermissionDelegate.setPermissionDelegate(this)
 * を呼んで登録しないと `lateinit` のままになり、launch() が
 * UninitializedPropertyAccessException を投げる。
 * 結果として権限ダイアログの結果が届かず getGrantedPermissions() が空になる
 * (= status: unauthorized / granted:(none) の症状)。
 *
 * 素の Expo managed では MainActivity が自動生成されこの呼び出しが無いため、
 * config plugin で注入する。
 */
const DELEGATE_IMPORT =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const DELEGATE_CALL =
  '    HealthConnectPermissionDelegate.setPermissionDelegate(this)';

const withHealthConnectPermissionDelegate = (config) =>
  withMainActivity(config, (mod) => {
    let src = mod.modResults.contents;
    if (mod.modResults.language !== 'kt') {
      throw new Error(
        '[health-connect] MainActivity is not Kotlin; cannot inject setPermissionDelegate'
      );
    }

    // (1) import を追加 (重複防止)
    if (!src.includes(DELEGATE_IMPORT)) {
      // package 行の直後に挿入
      src = src.replace(
        /^(package .+\n)/,
        `$1\n${DELEGATE_IMPORT}\n`
      );
    }

    // (2) onCreate 内、super.onCreate(...) の直後に呼び出しを挿入 (重複防止)
    if (!src.includes('HealthConnectPermissionDelegate.setPermissionDelegate')) {
      const superCallRegex = /(\n\s*super\.onCreate\([^)]*\)\n)/;
      if (superCallRegex.test(src)) {
        src = src.replace(superCallRegex, `$1${DELEGATE_CALL}\n`);
      } else {
        throw new Error(
          '[health-connect] could not find super.onCreate in MainActivity to inject delegate'
        );
      }
    }

    mod.modResults.contents = src;
    return mod;
  });

module.exports = (config) =>
  withHealthConnectPermissionDelegate(withHealthConnectManifest(config));
