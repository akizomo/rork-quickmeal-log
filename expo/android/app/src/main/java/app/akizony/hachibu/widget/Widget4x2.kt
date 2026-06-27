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

// ── 4×2: リング + 4ボタン ─────────────────────────────────────────────────────

class Widget4x2Glance : GlanceAppWidget() {

    @Composable
    override fun Content() {
        val context    = LocalContext.current
        val categories = WidgetStateManager.getCategories(context).take(4)
        val logged     = WidgetStateManager.getLoggedCategories(context)
        val consumed   = WidgetStateManager.getConsumedKcal(context)
        val target     = WidgetStateManager.getTargetKcal(context)
        val density    = context.resources.displayMetrics.density
        val ringPx     = (128 * density).toInt()
        val ringBmp    = KcalRingHelper.createRingBitmap(ringPx, consumed, target, showLabel = true)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xE2162018.toInt())))
                .cornerRadius(16.dp)
                .padding(10.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(modifier = GlanceModifier.fillMaxSize()) {

                // 左: カロリーリング
                Box(
                    modifier = GlanceModifier.fillMaxHeight().defaultWeight(),
                    contentAlignment = Alignment.Center
                ) {
                    Image(
                        provider           = BitmapImageProvider(ringBmp),
                        contentDescription = "カロリーリング",
                        contentScale       = ContentScale.Fit,
                        modifier           = GlanceModifier.fillMaxSize()
                    )
                }

                // 区切り線
                Box(
                    modifier = GlanceModifier
                        .width(1.dp)
                        .fillMaxHeight()
                        .padding(vertical = 8.dp)
                        .background(ColorProvider(Color(0x1AFFFFFF)))
                )

                // 右: 2×2 ボタン
                Column(
                    modifier = GlanceModifier.fillMaxHeight().defaultWeight().padding(start = 8.dp)
                ) {
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
}

class Widget4x2Receiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = Widget4x2Glance()
}
