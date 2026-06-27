package app.akizony.hachibu.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

// ── 2×2: クイックログ 4ボタン ─────────────────────────────────────────────────

class Widget2x2Glance : GlanceAppWidget() {

    @Composable
    override fun Content() {
        val context    = LocalContext.current
        val categories = WidgetStateManager.getCategories(context).take(4)
        val logged     = WidgetStateManager.getLoggedCategories(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xE2162018.toInt())))
                .cornerRadius(16.dp)
                .padding(8.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {
                Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                    categories.take(2).forEach { cat ->
                        CategoryButtonGlance(
                            cat      = cat,
                            logged   = cat.id in logged,
                            modifier = GlanceModifier.defaultWeight().fillMaxHeight().padding(3.dp)
                        )
                    }
                }
                Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                    categories.drop(2).forEach { cat ->
                        CategoryButtonGlance(
                            cat      = cat,
                            logged   = cat.id in logged,
                            modifier = GlanceModifier.defaultWeight().fillMaxHeight().padding(3.dp)
                        )
                    }
                }
            }
        }
    }
}

class Widget2x2Receiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = Widget2x2Glance()
}

// ── 共有: カテゴリボタン ──────────────────────────────────────────────────────

private val COLOR_ACCENT    = ColorProvider(Color(0xFF82A280.toInt()))
private val COLOR_PRIMARY   = ColorProvider(Color(0xFFF0F4EF.toInt()))
private val COLOR_SECONDARY = ColorProvider(Color(0x8CF0F4EF.toInt()))
private val COLOR_BTN_BG    = Color(0x14FFFFFF)
private val COLOR_LOGGED_BG = Color(0x26829280.toInt())

@Composable
internal fun CategoryButtonGlance(
    cat: CategoryData,
    logged: Boolean,
    modifier: GlanceModifier = GlanceModifier
) {
    if (logged) {
        Box(
            modifier = modifier
                .background(ColorProvider(COLOR_LOGGED_BG))
                .cornerRadius(12.dp)
                .clickable(
                    actionRunCallback<UndoLogAction>(
                        actionParametersOf(UndoLogAction.PARAM_CATEGORY_ID to cat.id)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = GlanceModifier.fillMaxSize(),
                verticalAlignment   = Alignment.CenterVertically,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("✓ 記録済", style = TextStyle(
                    color = COLOR_ACCENT, fontSize = 11.sp, fontWeight = FontWeight.Bold
                ))
                Text("↩ 取消", style = TextStyle(color = COLOR_ACCENT, fontSize = 10.sp))
            }
        }
    } else {
        Box(
            modifier = modifier
                .background(ColorProvider(COLOR_BTN_BG))
                .cornerRadius(12.dp)
                .clickable(
                    actionRunCallback<LogFoodAction>(
                        actionParametersOf(
                            LogFoodAction.PARAM_CATEGORY_ID to cat.id,
                            LogFoodAction.PARAM_FOOD_NAME   to cat.recent,
                            LogFoodAction.PARAM_SUBLABEL    to cat.sublabel,
                            LogFoodAction.PARAM_KCAL        to cat.kcal
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = GlanceModifier.fillMaxSize(),
                verticalAlignment   = Alignment.CenterVertically,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(cat.icon, style = TextStyle(fontSize = 20.sp))
                Text(
                    cat.name,
                    style    = TextStyle(color = COLOR_PRIMARY, fontSize = 11.sp, fontWeight = FontWeight.Bold),
                    maxLines = 1
                )
                Text(
                    "${cat.recent}·${cat.kcal}",
                    style    = TextStyle(color = COLOR_SECONDARY, fontSize = 9.sp),
                    maxLines = 1
                )
            }
        }
    }
}
