package app.akizony.hachibu.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

// ── Data classes ─────────────────────────────────────────────────────────────

data class CategoryData(
    val id: String,
    val icon: String,
    val name: String,
    val recent: String,
    val sublabel: String,
    val kcal: Int
)

data class PendingLogEntry(
    val categoryId: String,
    val foodName: String,
    val sublabel: String,
    val kcal: Int,
    val timestamp: Long
)

// ── Manager ──────────────────────────────────────────────────────────────────

object WidgetStateManager {

    const val PREFS_NAME = "hachibu_widget_prefs"

    private const val KEY_CATEGORIES        = "widget_categories"
    private const val KEY_CONSUMED_KCAL     = "widget_consumed_kcal"
    private const val KEY_TARGET_KCAL       = "widget_target_kcal"
    private const val KEY_PENDING_QUEUE     = "widget_pending_queue"
    private const val KEY_LOGGED_CATEGORIES = "widget_logged_categories"
    private const val KEY_UI_LANGUAGE       = "widget_ui_language"

    fun prefs(context: Context): SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ── UI Language ──────────────────────────────────────────────────────────
    // JS 側 settings.uiLanguage ('ja' | 'en-US') をそのまま保存する。
    // アプリの uiLanguage は端末ロケールと独立した設定のため、Android の
    // 通常の values-en リソース分岐 (端末ロケール依存) は使わずここで持つ。

    fun getUiLanguage(context: Context): String = prefs(context).getString(KEY_UI_LANGUAGE, "ja") ?: "ja"

    fun isEnglish(context: Context): Boolean = getUiLanguage(context) == "en-US"

    fun setUiLanguage(context: Context, uiLanguage: String) {
        prefs(context).edit().putString(KEY_UI_LANGUAGE, uiLanguage).commit()
    }

    // ── Categories ───────────────────────────────────────────────────────────

    fun getCategories(context: Context): List<CategoryData> {
        val json = prefs(context).getString(KEY_CATEGORIES, null) ?: return defaultCategories(context)
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { i ->
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
        } catch (e: Exception) { defaultCategories(context) }
    }

    fun setCategories(context: Context, categories: List<CategoryData>) {
        val arr = JSONArray()
        categories.forEach { c ->
            arr.put(JSONObject().apply {
                put("id", c.id); put("icon", c.icon); put("name", c.name)
                put("recent", c.recent); put("sublabel", c.sublabel); put("kcal", c.kcal)
            })
        }
        prefs(context).edit().putString(KEY_CATEGORIES, arr.toString()).commit()
    }

    // ── Kcal ─────────────────────────────────────────────────────────────────

    fun getConsumedKcal(context: Context): Int = prefs(context).getInt(KEY_CONSUMED_KCAL, 0)
    fun getTargetKcal(context: Context): Int   = prefs(context).getInt(KEY_TARGET_KCAL, 2000)

    // アプリ側専用: consumed と target を同時更新 (widgetUpdateKcal から呼ぶ)
    fun setKcal(context: Context, consumed: Int, target: Int) {
        prefs(context).edit()
            .putInt(KEY_CONSUMED_KCAL, consumed)
            .putInt(KEY_TARGET_KCAL, target)
            .commit()
    }

    // ウィジェットアクション専用: consumed だけを更新。target はアプリ側が管理する
    fun setConsumedKcal(context: Context, consumed: Int) {
        prefs(context).edit().putInt(KEY_CONSUMED_KCAL, consumed).commit()
    }

    // ── Pending Queue ─────────────────────────────────────────────────────────

    fun getPendingQueue(context: Context): List<PendingLogEntry> {
        val json = prefs(context).getString(KEY_PENDING_QUEUE, null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                PendingLogEntry(
                    categoryId = o.getString("categoryId"),
                    foodName   = o.getString("foodName"),
                    sublabel   = o.getString("sublabel"),
                    kcal       = o.getInt("kcal"),
                    timestamp  = o.getLong("timestamp")
                )
            }
        } catch (e: Exception) { emptyList() }
    }

    fun enqueuePendingLog(context: Context, entry: PendingLogEntry) {
        val queue = getPendingQueue(context).toMutableList()
        queue.add(entry)
        savePendingQueue(context, queue)
    }

    fun dequeuePendingLog(context: Context, categoryId: String) {
        savePendingQueue(context, getPendingQueue(context).filter { it.categoryId != categoryId })
    }

    fun clearPendingQueue(context: Context) {
        prefs(context).edit().remove(KEY_PENDING_QUEUE).commit()
    }

    private fun savePendingQueue(context: Context, queue: List<PendingLogEntry>) {
        val arr = JSONArray()
        queue.forEach { e ->
            arr.put(JSONObject().apply {
                put("categoryId", e.categoryId); put("foodName", e.foodName)
                put("sublabel", e.sublabel); put("kcal", e.kcal); put("timestamp", e.timestamp)
            })
        }
        prefs(context).edit().putString(KEY_PENDING_QUEUE, arr.toString()).commit()
    }

    // ── Logged categories (just-tapped → undo UI) ────────────────────────────

    fun getLoggedCategories(context: Context): Set<String> {
        val json = prefs(context).getString(KEY_LOGGED_CATEGORIES, null) ?: return emptySet()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { i -> arr.getString(i) }.toSet()
        } catch (e: Exception) { emptySet() }
    }

    fun setLoggedCategory(context: Context, categoryId: String) {
        val s = getLoggedCategories(context).toMutableSet().also { it.add(categoryId) }
        saveLoggedCategories(context, s)
    }

    fun removeLoggedCategory(context: Context, categoryId: String) {
        val s = getLoggedCategories(context).toMutableSet().also { it.remove(categoryId) }
        saveLoggedCategories(context, s)
    }

    fun clearLoggedCategories(context: Context) {
        prefs(context).edit().remove(KEY_LOGGED_CATEGORIES).commit()
    }

    private fun saveLoggedCategories(context: Context, cats: Set<String>) {
        val arr = JSONArray(); cats.forEach { arr.put(it) }
        prefs(context).edit().putString(KEY_LOGGED_CATEGORIES, arr.toString()).commit()
    }

    // ── Defaults ─────────────────────────────────────────────────────────────
    // アプリと同期する前のプレースホルダー。uiLanguage に応じて言語を切り替える。

    fun defaultCategories(context: Context): List<CategoryData> =
        if (isEnglish(context)) defaultCategoriesEn() else defaultCategoriesJa()

    private fun defaultCategoriesJa(): List<CategoryData> = listOf(
        CategoryData("staple",        "🍚", "主食",       "ごはん",     "1杯",     252),
        CategoryData("lean_protein",  "🐓", "肉魚(低脂)", "鶏むね",     "100g",    114),
        CategoryData("egg",           "🥚", "卵",         "卵",         "1個",     76),
        CategoryData("fatty_protein", "🥩", "脂あり肉魚", "牛こま",     "100g",    235),
        CategoryData("dairy_soy",     "🥛", "乳・大豆",   "豆腐",       "半丁",    57),
        CategoryData("veggies",       "🥦", "野菜",       "サラダ",     "1皿",     30),
        CategoryData("fruit",         "🍎", "果物",       "バナナ",     "1本",     86),
        CategoryData("added_fat",     "🧈", "油・調味",   "オリーブ油", "大さじ1", 111),
        CategoryData("snack_drink",   "🍩", "おやつ甘飲", "プロテイン", "1杯",     130),
    )

    private fun defaultCategoriesEn(): List<CategoryData> = listOf(
        CategoryData("staple",        "🍚", "Staples",       "Rice",          "1 bowl",  252),
        CategoryData("lean_protein",  "🐓", "Lean protein",  "Chicken breast","100g",    114),
        CategoryData("egg",           "🥚", "Egg",           "Egg",           "1",       76),
        CategoryData("fatty_protein", "🥩", "Fatty protein", "Beef strips",   "100g",    235),
        CategoryData("dairy_soy",     "🥛", "Dairy & soy",   "Tofu",          "1/2 block", 57),
        CategoryData("veggies",       "🥦", "Vegetables",    "Salad",         "1 plate", 30),
        CategoryData("fruit",         "🍎", "Fruit",         "Banana",        "1",       86),
        CategoryData("added_fat",     "🧈", "Oil & sauces",  "Olive oil",     "1 tbsp",  111),
        CategoryData("snack_drink",   "🍩", "Snacks",        "Protein shake", "1 cup",   130),
    )
}
