package app.akizony.hachibu.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import app.akizony.hachibu.R
import androidx.glance.GlanceId
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

// ── 3×3: 9ボタン + サマリーヘッダー ──────────────────────────────────────────

class Widget3x3Glance : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { Content(context) }
    }

    @Composable
    private fun Content(context: Context) {
        val categories = WidgetStateManager.getCategories(context)
        val logged     = WidgetStateManager.getLoggedCategories(context)
        val consumed   = WidgetStateManager.getConsumedKcal(context)
        val target     = WidgetStateManager.getTargetKcal(context)
        val density    = context.resources.displayMetrics.density
        val ringPx     = (44 * density).toInt()
        val ringBmp    = KcalRingHelper.createRingBitmap(ringPx, consumed, target, showLabel = false)
        val remaining  = (target - consumed).coerceAtLeast(0)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(R.color.widget_surface_inverse))
                .cornerRadius(16.dp)
                .padding(8.dp),
            contentAlignment = Alignment.TopStart
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {

                // ── ヘッダー (タップでアプリへ) ──────────────────────────────
                Row(
                    modifier            = GlanceModifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                        .clickable(openAppAction(context)),
                    verticalAlignment   = Alignment.CenterVertically
                ) {
                    // アークリング (ラベルなし)
                    Image(
                        provider           = BitmapImageProvider(ringBmp),
                        contentDescription = "カロリーリング",
                        contentScale       = ContentScale.Fit,
                        modifier           = GlanceModifier.size(44.dp)
                    )

                    // テキストサマリー
                    Column(modifier = GlanceModifier.defaultWeight().padding(start = 8.dp)) {
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                consumed.toString(),
                                style = TextStyle(
                                    color      = ColorProvider(R.color.widget_text_primary),
                                    fontSize   = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Text(
                                " / $target kcal",
                                style = TextStyle(
                                    color    = ColorProvider(R.color.widget_text_secondary),
                                    fontSize = 11.sp  // fontSize.xs (minimum)
                                )
                            )
                        }
                        Text(
                            "あと $remaining kcal",
                            style = TextStyle(
                                color      = ColorProvider(R.color.widget_accent),
                                fontSize   = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                // ── 3×3 ボタングリッド ────────────────────────────────────────
                listOf(0, 3, 6).forEach { rowStart ->
                    Row(modifier = GlanceModifier.fillMaxWidth().defaultWeight()) {
                        categories.subList(rowStart, (rowStart + 3).coerceAtMost(categories.size))
                            .forEach { cat ->
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
}

class Widget3x3Receiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = Widget3x3Glance()
}
