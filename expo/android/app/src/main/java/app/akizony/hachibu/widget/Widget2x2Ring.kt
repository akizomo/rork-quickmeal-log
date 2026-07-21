package app.akizony.hachibu.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.*
import androidx.glance.GlanceId
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.unit.ColorProvider

// ── 2×2: カロリーリングのみ ────────────────────────────────────────────────────

class Widget2x2RingGlance : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { Content(context) }
    }

    @Composable
    private fun Content(context: Context) {
        val consumed = WidgetStateManager.getConsumedKcal(context)
        val target   = WidgetStateManager.getTargetKcal(context)
        val density  = context.resources.displayMetrics.density
        val size     = LocalSize.current
        // ウィジェット内側の最小辺を正方形リングに使う (padding 8dp × 2)
        val ringDp   = (minOf(size.width.value, size.height.value) - 16f).coerceAtLeast(48f)
        val ringPx   = (ringDp * density).toInt()
        val ringBmp  = KcalRingHelper.createRingBitmap(ringPx, consumed, target, showLabel = true)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xFF1D1913.toInt())))
                .cornerRadius(16.dp)
                .padding(8.dp)
                .clickable(openAppAction(context)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                provider           = BitmapImageProvider(ringBmp),
                contentDescription = "カロリーリング — タップでアプリを開く",
                contentScale       = ContentScale.Fit,
                modifier           = GlanceModifier.fillMaxSize()
            )
        }
    }
}

class Widget2x2RingReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = Widget2x2RingGlance()
}
