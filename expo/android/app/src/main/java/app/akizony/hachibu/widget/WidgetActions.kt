package app.akizony.hachibu.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.Action
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionStartActivity
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay

// アプリのホーム画面を開くアクション（カロリーリング等のタップ用）
// !! は自アプリのパッケージなので null にならない
internal fun openAppAction(context: Context): Action =
    actionStartActivity(
        context.applicationContext.packageManager
            .getLaunchIntentForPackage(context.packageName)!!
    )

// 全ウィジェットを明示的に更新。
// updateAll() は Glance 1.1.x で内部例外を swallow しサイレント失敗するケースがあるため、
// GlanceAppWidgetManager で ID を取得して update() を直接呼ぶ方式に統一する。
internal suspend fun updateAllWidgets(context: Context) {
    val ctx = context.applicationContext
    val mgr = GlanceAppWidgetManager(ctx)
    listOf<GlanceAppWidget>(
        Widget2x2Glance(),
        Widget2x2RingGlance(),
        Widget4x2Glance(),
        Widget3x3Glance(),
        Widget4x3Glance(),
    ).forEach { widget ->
        try {
            mgr.getGlanceIds(widget.javaClass).forEach { id: GlanceId ->
                widget.update(ctx, id)
            }
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            // 未配置種はgetGlanceIdsが空を返すため通常ここには来ない
        }
    }
}

// ── Log Food ─────────────────────────────────────────────────────────────────

class LogFoodAction : ActionCallback {
    companion object {
        val PARAM_CATEGORY_ID = ActionParameters.Key<String>("categoryId")
        val PARAM_FOOD_NAME   = ActionParameters.Key<String>("foodName")
        val PARAM_SUBLABEL    = ActionParameters.Key<String>("sublabel")
        val PARAM_KCAL        = ActionParameters.Key<Int>("kcal")
    }

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val categoryId = parameters[PARAM_CATEGORY_ID] ?: return
        val foodName   = parameters[PARAM_FOOD_NAME]   ?: return
        val sublabel   = parameters[PARAM_SUBLABEL]    ?: return
        val kcal       = parameters[PARAM_KCAL]        ?: return

        val previousConsumed = WidgetStateManager.getConsumedKcal(context)

        WidgetStateManager.enqueuePendingLog(
            context,
            PendingLogEntry(
                categoryId = categoryId,
                foodName   = foodName,
                sublabel   = sublabel,
                kcal       = kcal,
                timestamp  = System.currentTimeMillis()
            )
        )
        WidgetStateManager.setLoggedCategory(context, categoryId)

        // t=0: ✓ 状態 + 旧リング値を即表示
        updateAllWidgets(context)

        // リングアニメーション: 6ステップ × 100ms = 600ms でカウントアップ
        // consumed だけを更新。target はアプリ側専用なので触らない
        // undo が押されたらループを抜けてリング値の書き換えを止める
        var undone = false
        for (i in 1..6) {
            delay(100L)
            if (categoryId !in WidgetStateManager.getLoggedCategories(context)) {
                undone = true
                break
            }
            WidgetStateManager.setConsumedKcal(context, previousConsumed + kcal * i / 6)
            updateAllWidgets(context)
        }

        if (!undone) {
            // アプリ内 UndoToast と同じ 4 秒で ✓ を復帰 (アニメーション 600ms 分を除いた残り)
            delay(3_400L)
            if (categoryId in WidgetStateManager.getLoggedCategories(context)) {
                WidgetStateManager.removeLoggedCategory(context, categoryId)
                updateAllWidgets(context)
            }
        }
    }
}

// ── Undo Log ─────────────────────────────────────────────────────────────────

class UndoLogAction : ActionCallback {
    companion object {
        val PARAM_CATEGORY_ID = ActionParameters.Key<String>("categoryId")
    }

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val categoryId = parameters[PARAM_CATEGORY_ID] ?: return

        // dequeue 前に kcal を取得して consumed から差し引く
        val kcalToRemove = WidgetStateManager.getPendingQueue(context)
            .find { it.categoryId == categoryId }?.kcal ?: 0

        WidgetStateManager.dequeuePendingLog(context, categoryId)
        WidgetStateManager.removeLoggedCategory(context, categoryId)

        val newConsumed = (WidgetStateManager.getConsumedKcal(context) - kcalToRemove).coerceAtLeast(0)
        WidgetStateManager.setConsumedKcal(context, newConsumed)

        updateAllWidgets(context)
    }
}
