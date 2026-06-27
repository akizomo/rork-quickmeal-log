package app.akizony.hachibu.widget

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

// ── 3×3: 9ボタン + サマリーヘッダー ──────────────────────────────────────────

class Widget3x3Glance : GlanceAppWidget() {

    @Composable
    override fun Content() {
        val context    = LocalContext.current
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
                .background(ColorProvider(Color(0xE2162018.toInt())))
                .cornerRadius(16.dp)
                .padding(8.dp),
            contentAlignment = Alignment.TopStart
        ) {
            Column(modifier = GlanceModifier.fillMaxSize()) {

                // ── ヘッダー ──────────────────────────────────────────────────
                Row(
                    modifier            = GlanceModifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 2.dp),
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
                                    color      = ColorProvider(Color(0xFFF0F4EF.toInt())),
                                    fontSize   = 13.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Text(
                                " / $target kcal",
                                style = TextStyle(
                                    color    = ColorProvider(Color(0x8CF0F4EF.toInt())),
                                    fontSize = 10.sp
                                )
                            )
                        }
                        Text(
                            "あと $remaining kcal",
                            style = TextStyle(
                                color      = ColorProvider(Color(0xFF82A280.toInt())),
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
                                    modifier = GlanceModifier.defaultWeight().fillMaxHeight().padding(2.dp)
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
