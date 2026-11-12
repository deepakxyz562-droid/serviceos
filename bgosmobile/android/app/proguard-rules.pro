# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.

# React Native & TurboModules
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-dontwarn com.facebook.react.**

# Expo Modules Core & Reflection
-keep class expo.modules.** { *; }
-keep class * extends expo.modules.kotlin.modules.Module { *; }
-keep class * extends expo.modules.core.interfaces.Package { *; }
-dontwarn expo.modules.**
-dontwarn expo.modules.core.errors.**
-dontwarn expo.modules.kotlin.types.**

# Expo SecureStore (Keystore persistence)
-keep class expo.modules.securestore.** { *; }

# Expo Notifications & Channels
-keep class expo.modules.notifications.** { *; }

# Firebase & Auth TurboModules
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# React Native Worklets
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.worklets.**

# React Native Screens, Gestures, Safe Area, WebView
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.th3rdwave.safeareacontext.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }
