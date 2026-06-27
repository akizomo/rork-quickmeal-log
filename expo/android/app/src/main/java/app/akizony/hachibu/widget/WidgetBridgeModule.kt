package app.akizony.hachibu.widget

import com.facebook.react.bridge.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import androidx.glance.appwidget.updateAll

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
        scope.launch {
            try { Widget2x2Glance().updateAll(ctx) } catch (_: Exception) {}
            try { Widget4x2Glance().updateAll(ctx) } catch (_: Exception) {}
            try { Widget3x3Glance().updateAll(ctx) } catch (_: Exception) {}
        }
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
            scope.launch {
                try { Widget2x2Glance().updateAll(ctx) } catch (_: Exception) {}
                try { Widget4x2Glance().updateAll(ctx) } catch (_: Exception) {}
                try { Widget3x3Glance().updateAll(ctx) } catch (_: Exception) {}
            }
        } catch (e: Exception) {
            // 無効な JSON は無視
        }
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
        // undo UI リセットのためウィジェットを再描画
        if (queue.isNotEmpty()) {
            scope.launch {
                try { Widget2x2Glance().updateAll(ctx) } catch (_: Exception) {}
                try { Widget4x2Glance().updateAll(ctx) } catch (_: Exception) {}
                try { Widget3x3Glance().updateAll(ctx) } catch (_: Exception) {}
            }
        }
        promise.resolve(arr.toString())
    }

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }
}
