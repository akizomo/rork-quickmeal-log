package app.akizony.hachibu.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.GlanceId
import androidx.glance.action.actionParametersOf
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

// ── 2×2: クイックログ 4ボタン ─────────────────────────────────────────────────

class Widget2x2Glance : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { Content(context) }
    }

    @Composable
    private fun Content(context: Context) {
        val categories = WidgetStateManager.getCategories(context).take(4)
        val logged     = WidgetStateManager.getLoggedCategories(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xE2162018.toInt())))
                .cornerRadius(16.dp)   // radius.lg
                .padding(4.dp),        // spacing['1'] = 4
            contentAlignment = Alignment.Center
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {
                Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                    categories.take(2).forEach { cat ->
                        CategoryButtonGlance(
                            cat      = cat,
                            logged   = cat.id in logged,
                            modifier = GlanceModifier.defaultWeight().fillMaxHeight()
                        )
                    }
                }
                Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                    categories.drop(2).forEach { cat ->
                        CategoryButtonGlance(
                            cat      = cat,
                            logged   = cat.id in logged,
                            modifier = GlanceModifier.defaultWeight().fillMaxHeight()
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
// Colors: DS トークン直訳 (dark surface 上の inverse テキスト)
//   sage[500]=#82A280  ivory[50]=#FFFDF7 に近い #F0F4EF (sage微tint版)
//   secondary = 55% #F0F4EF,  dim = 36% #F0F4EF

private val COLOR_ACCENT    = ColorProvider(Color(0xFF82A280.toInt())) // sage[500]
private val COLOR_PRIMARY   = ColorProvider(Color(0xFFF0F4EF.toInt())) // inverse primary
private val COLOR_SECONDARY = ColorProvider(Color(0x8CF0F4EF.toInt())) // inverse secondary (55%)
private val COLOR_UNDO      = ColorProvider(Color(0xFFE9C28F.toInt())) // amber — アプリ UndoToast と同色
private val COLOR_BTN_BG    = ColorProvider(Color(0x14FFFFFF))         // white 8% — surface raised subtle

@Composable
internal fun CategoryButtonGlance(
    cat: CategoryData,
    logged: Boolean,
    modifier: GlanceModifier = GlanceModifier
) {
    // 外側透明 Box: padding(4dp) = spacing['1'] でボタン間 gap を作る
    Box(modifier = modifier.padding(4.dp)) {
        if (logged) {
            // ── 記録済状態: sage tint 背景 ──────────────────────────────────
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(Color(0x3882A280))) // sage[500] 22%
                    .cornerRadius(12.dp)                          // radius.md
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
                    // emoji + ✓ : callout(16sp)
                    Text(
                        "${cat.icon} ✓",
                        style = TextStyle(
                            color      = COLOR_ACCENT,
                            fontSize   = 16.sp,         // fontSize.callout
                            fontWeight = FontWeight.Bold
                        )
                    )
                    // カテゴリ名: xs(11sp) minimum
                    Text(
                        cat.name,
                        style    = TextStyle(
                            color      = COLOR_PRIMARY,
                            fontSize   = 11.sp,         // fontSize.xs
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1
                    )
                    // 取り消す: アプリ UndoToast と同ラベル・同色 (#E9C28F amber)
                    Text(
                        "取り消す",
                        style = TextStyle(color = COLOR_UNDO, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    )
                }
            }
        } else {
            // ── 通常状態 ────────────────────────────────────────────────────
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(COLOR_BTN_BG)
                    .cornerRadius(12.dp)  // radius.md
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
                    // emoji: xl(20sp)
                    Text(cat.icon, style = TextStyle(fontSize = 20.sp))
                    // カテゴリ名: xs(11sp) bold
                    Text(
                        cat.name,
                        style    = TextStyle(
                            color      = COLOR_PRIMARY,
                            fontSize   = 11.sp,         // fontSize.xs
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1
                    )
                    // サブラベル: xs(11sp) secondary
                    Text(
                        "${cat.recent}·${cat.sublabel}",
                        style    = TextStyle(color = COLOR_SECONDARY, fontSize = 11.sp), // fontSize.xs
                        maxLines = 1
                    )
                }
            }
        }
    }
}
