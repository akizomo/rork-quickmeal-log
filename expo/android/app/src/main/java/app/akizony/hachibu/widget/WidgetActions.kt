package app.akizony.hachibu.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.updateAll

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

        // 全サイズのウィジェットを再描画
        try { Widget2x2Glance().updateAll(context) } catch (_: Exception) {}
        try { Widget4x2Glance().updateAll(context) } catch (_: Exception) {}
        try { Widget3x3Glance().updateAll(context) } catch (_: Exception) {}
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
        WidgetStateManager.dequeuePendingLog(context, categoryId)
        WidgetStateManager.removeLoggedCategory(context, categoryId)

        try { Widget2x2Glance().updateAll(context) } catch (_: Exception) {}
        try { Widget4x2Glance().updateAll(context) } catch (_: Exception) {}
        try { Widget3x3Glance().updateAll(context) } catch (_: Exception) {}
    }
}
