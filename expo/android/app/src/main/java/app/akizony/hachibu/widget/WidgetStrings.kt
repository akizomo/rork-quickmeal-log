package app.akizony.hachibu.widget

/**
 * ウィジェット (Glance) 内の固定文言。JS 側の locales JSON とは別管理 —
 * ネイティブ Kotlin は React Native の i18n ランタイムに乗らないため、
 * WidgetStateManager に保存された uiLanguage を見て手動で分岐する。
 */
object WidgetStrings {

    fun ringContentDescription(isEn: Boolean, tappable: Boolean): String = when {
        isEn && tappable  -> "Calorie ring — tap to open the app"
        isEn              -> "Calorie ring"
        tappable           -> "カロリーリング — タップでアプリを開く"
        else               -> "カロリーリング"
    }

    fun remainingKcal(isEn: Boolean, remaining: Int): String =
        if (isEn) "$remaining kcal left" else "あと $remaining kcal"

    fun undo(isEn: Boolean): String = if (isEn) "Undo" else "取り消す"

    /** カロリーリング中央の「のこり」ラベル (KcalRingHelper に渡す)。 */
    fun remainingRingLabel(isEn: Boolean): String = if (isEn) "left" else "のこり"
}
