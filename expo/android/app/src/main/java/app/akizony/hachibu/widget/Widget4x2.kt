package app.akizony.hachibu.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.GlanceId
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider

// ── 4×2: リング + 4ボタン ─────────────────────────────────────────────────────

class Widget4x2Glance : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent { Content(context) }
    }

    @Composable
    private fun Content(context: Context) {
        val categories = WidgetStateManager.getCategories(context).take(4)
        val logged     = WidgetStateManager.getLoggedCategories(context)
        val consumed   = WidgetStateManager.getConsumedKcal(context)
        val target     = WidgetStateManager.getTargetKcal(context)
        val density    = context.resources.displayMetrics.density
        // ウィジェット内側の高さ = 実高さ - 上下 padding(8dp × 2)。リング列幅もこれに合わせる
        val widgetH    = LocalSize.current.height
        val ringColDp  = (widgetH.value - 16f).coerceAtLeast(64f)
        val ringPx     = (ringColDp * density).toInt()
        val ringBmp    = KcalRingHelper.createRingBitmap(ringPx, consumed, target, showLabel = true)

        Box(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(Color(0xFF1D1913.toInt())))
                .cornerRadius(16.dp)   // radius.lg
                .padding(8.dp),        // spacing['2'] = 8
            contentAlignment = Alignment.Center
        ) {
            Row(modifier = GlanceModifier.fillMaxSize()) {

                // 左: カロリーリング — タップでアプリへ
                Box(
                    modifier = GlanceModifier
                        .fillMaxHeight()
                        .width(ringColDp.dp)
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

                // 区切り線: 外側透明 Box(8+1+8=17dp) で左右に spacing['2'] の余白
                Box(
                    modifier          = GlanceModifier.width(17.dp).fillMaxHeight(),
                    contentAlignment  = Alignment.Center
                ) {
                    Box(
                        modifier = GlanceModifier
                            .width(1.dp)
                            .fillMaxHeight()
                            .background(ColorProvider(Color(0x1AFFFFFF)))
                    ) {}
                }

                // 右: 2×2 ボタン (divider 外側 Box が 8dp gap を担うため start padding 不要)
                Column(
                    modifier = GlanceModifier.fillMaxHeight().defaultWeight()
                ) {
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
}

class Widget4x2Receiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget = Widget4x2Glance()
}
