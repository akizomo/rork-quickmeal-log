package app.akizony.hachibu.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import app.akizony.hachibu.R
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
        val isEn       = WidgetStateManager.isEnglish(context)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(R.color.widget_surface_inverse))
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
                            isEn     = isEn,
                            modifier = GlanceModifier.defaultWeight().fillMaxHeight()
                        )
                    }
                }
                Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                    categories.drop(2).forEach { cat ->
                        CategoryButtonGlance(
                            cat      = cat,
                            logged   = cat.id in logged,
                            isEn     = isEn,
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
// Colors: @color/widget_* トークン参照。values/colors.xml (light) と
// values-night/colors.xml (dark) で同名リソースを定義し、システムの colorScheme に
// 自動追従する (アプリ本体の light/dark 切替と同期)。

private val COLOR_PRIMARY   = ColorProvider(R.color.widget_text_primary)
private val COLOR_SECONDARY = ColorProvider(R.color.widget_text_secondary)
// action.primary.onContainer — 記録済み(container)背景上の文字。✓・取り消す共通
private val COLOR_ON_CONTAINER = ColorProvider(R.color.widget_undo)
private val COLOR_BTN_BG    = ColorProvider(R.color.widget_btn_surface)

@Composable
internal fun CategoryButtonGlance(
    cat: CategoryData,
    logged: Boolean,
    isEn: Boolean,
    modifier: GlanceModifier = GlanceModifier
) {
    // 外側透明 Box: padding(4dp) = spacing['1'] でボタン間 gap を作る
    Box(modifier = modifier.padding(4.dp)) {
        if (logged) {
            // ── 記録済状態: sage tint 背景 ──────────────────────────────────
            Box(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(R.color.widget_btn_logged))
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
                    // ✓ のみ: xl(20sp) で大きく
                    Text(
                        "✓",
                        style = TextStyle(
                            color      = COLOR_ON_CONTAINER,
                            fontSize   = 20.sp,         // fontSize.xl
                            fontWeight = FontWeight.Bold
                        )
                    )
                    // 取り消す: UI操作名 = Label役割 → Label sm(13sp)
                    Text(
                        WidgetStrings.undo(isEn),
                        style = TextStyle(color = COLOR_ON_CONTAINER, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
                    // カテゴリ名: UI要素の名前 = Label役割だが、2×2の最小セルでは
                    // 13spだと「肉魚(低脂)」等の長い名称がmaxLines=1で崩れるため
                    // widget固有の例外として11spを維持 (2026-08-08指摘)
                    Text(
                        cat.name,
                        style    = TextStyle(
                            color      = COLOR_PRIMARY,
                            fontSize   = 11.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1
                    )
                    // サブラベル: cat.nameの添え物 = Caption役割 → xs(11sp、最小)
                    Text(
                        "${cat.recent}·${cat.sublabel}",
                        style    = TextStyle(color = COLOR_SECONDARY, fontSize = 11.sp), // fontSize.xs (Caption)
                        maxLines = 1
                    )
                }
            }
        }
    }
}
