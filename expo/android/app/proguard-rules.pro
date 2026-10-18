# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# ホーム画面ウィジェット (Glance + JS ブリッジ)。SDK 58 からリリースビルドで R8 が既定で有効になったため、
# リフレクション経由で呼ばれる NativeModule / Receiver が削られないよう丸ごと残す。
-keep class app.akizony.hachibu.widget.** { *; }
