package app.akizony.hachibu.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject

class WidgetBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun getName(): String = "WidgetBridge"

    /**
     * 今日の摂取/目標kcal をウィジェット用 SharedPreferences に書き込み、
     * 配置済みウィジェットを再描画する。
     * JS 側から todayMacro.kcal と adjustedTargetKcal が変わるたびに呼ぶ。
     */
    @ReactMethod
    fun updateWidgetData(consumed: Int, target: Int) {
        val ctx = reactContext.applicationContext
        WidgetStateManager.setKcal(ctx, consumed, target)
        scope.launch { updateAllWidgets(ctx) }
    }

    /**
     * ウィジェットの表示言語を更新する。settings.uiLanguage が変わるたびに呼ぶ。
     * @param uiLanguage 'ja' | 'en-US'
     */
    @ReactMethod
    fun updateUiLanguage(uiLanguage: String) {
        val ctx = reactContext.applicationContext
        WidgetStateManager.setUiLanguage(ctx, uiLanguage)
        scope.launch { updateAllWidgets(ctx) }
    }

    /**
     * カテゴリ別のデフォルト食品データを更新する。
     * 自動学習が実装された段階で、各カテゴリの直近食品をここに渡す。
     * @param categoriesJson JSON配列文字列
     *   [{id, icon, name, recent, sublabel, kcal}, ...]
     */
    @ReactMethod
    fun updateCategories(categoriesJson: String) {
        val ctx = reactContext.applicationContext
        try {
            val arr = JSONArray(categoriesJson)
            val cats = (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                CategoryData(
                    id       = o.getString("id"),
                    icon     = o.getString("icon"),
                    name     = o.getString("name"),
                    recent   = o.getString("recent"),
                    sublabel = o.getString("sublabel"),
                    kcal     = o.getInt("kcal")
                )
            }
            WidgetStateManager.setCategories(ctx, cats)
            scope.launch { updateAllWidgets(ctx) }
        } catch (_: Exception) {}
    }

    /**
     * ウィジェットから溜まった pending queue を返して空にする。
     * アプリがフォアグラウンドに来たとき呼び出し、
     * 各エントリを既存の quickLog フローに流す。
     * undo 表示もリセットする。
     */
    @ReactMethod
    fun drainPendingQueue(promise: Promise) {
        val ctx = reactContext.applicationContext
        val queue = WidgetStateManager.getPendingQueue(ctx)
        WidgetStateManager.clearPendingQueue(ctx)
        WidgetStateManager.clearLoggedCategories(ctx)

        val arr = JSONArray()
        queue.forEach { e ->
            arr.put(JSONObject().apply {
                put("categoryId", e.categoryId)
                put("foodName",   e.foodName)
                put("sublabel",   e.sublabel)
                put("kcal",       e.kcal)
                put("timestamp",  e.timestamp)
            })
        }
        if (queue.isNotEmpty()) {
            scope.launch { updateAllWidgets(ctx) }
        }
        promise.resolve(arr.toString())
    }

    /**
     * Android ランチャーに「ホーム画面にウィジェットを追加」のピンダイアログを表示する。
     * Android 8.0+ (API 26) かつランチャーがピンをサポートしている場合のみ有効。
     * サポート外の場合は false を返す。
     */
    @ReactMethod
    fun requestPinWidget(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            promise.resolve(false)
            return
        }
        val manager = AppWidgetManager.getInstance(reactContext.applicationContext)
        if (!manager.isRequestPinAppWidgetSupported) {
            promise.resolve(false)
            return
        }
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.resolve(false)
            return
        }
        val component = ComponentName(reactContext.applicationContext, Widget2x2Receiver::class.java)
        activity.runOnUiThread {
            try {
                promise.resolve(manager.requestPinAppWidget(component, null, null))
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }
}
