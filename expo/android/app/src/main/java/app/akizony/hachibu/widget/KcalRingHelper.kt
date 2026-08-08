package app.akizony.hachibu.widget

import android.graphics.*

object KcalRingHelper {

    /**
     * カロリーリングを Bitmap に描画して返す。
     * @param sizePx  出力 Bitmap のピクセルサイズ（正方形）
     * @param showLabel true = 中央に「のこり / 数値 / kcal」を描画
     * 呼び出し側は @color/widget_* リソース (values/ + values-night/) を
     * ContextCompat.getColor() で解決して渡すこと。システムの colorScheme に
     * 自動追従させるため。
     * @param trackColor リング未達部分の色 (@color/widget_btn_surface)
     * @param progressColor リング進捗部分の色 (@color/widget_accent)
     * @param textPrimary 中央の数値の色 (@color/widget_text_primary)
     * @param textSecondary 「のこり」「kcal」ラベルの色 (@color/widget_text_secondary)
     */
    fun createRingBitmap(
        sizePx: Int,
        consumed: Int,
        target: Int,
        showLabel: Boolean = true,
        trackColor: Int,
        progressColor: Int,
        textPrimary: Int,
        textSecondary: Int
    ): Bitmap {
        val bmp = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)

        val strokeW  = sizePx * 0.12f
        val radius   = (sizePx - strokeW) / 2f
        val cx       = sizePx / 2f
        val cy       = sizePx / 2f
        val progress = (consumed.toFloat() / target.toFloat().coerceAtLeast(1f)).coerceIn(0f, 1f)

        // Track
        canvas.drawCircle(cx, cy, radius, Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color      = trackColor
            style      = Paint.Style.STROKE
            strokeWidth = strokeW
        })

        // Progress arc
        if (progress > 0f) {
            val margin = strokeW / 2f
            canvas.drawArc(
                RectF(margin, margin, sizePx - margin, sizePx - margin),
                -90f, 360f * progress, false,
                Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    color       = progressColor
                    style       = Paint.Style.STROKE
                    strokeWidth = strokeW
                    strokeCap   = Paint.Cap.ROUND
                }
            )
        }

        if (showLabel) {
            val remaining = (target - consumed).coerceAtLeast(0)
            val valText   = remaining.toString()

            val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = textSecondary; textAlign = Paint.Align.CENTER
                textSize = sizePx * 0.10f; typeface = Typeface.DEFAULT_BOLD
            }
            val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = textPrimary; textAlign = Paint.Align.CENTER
                textSize = sizePx * 0.24f; typeface = Typeface.DEFAULT_BOLD
            }
            val unitPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                color = textSecondary; textAlign = Paint.Align.CENTER
                textSize = sizePx * 0.09f
            }

            val blockH = labelPaint.textSize + valuePaint.textSize * 0.9f + unitPaint.textSize * 1.3f
            val baseY  = cy - blockH / 2f + labelPaint.textSize

            canvas.drawText("のこり",  cx, baseY,                                         labelPaint)
            canvas.drawText(valText,   cx, baseY + valuePaint.textSize * 0.9f,             valuePaint)
            canvas.drawText("kcal",    cx, baseY + valuePaint.textSize * 0.9f + unitPaint.textSize * 1.3f, unitPaint)
        }

        return bmp
    }
}
