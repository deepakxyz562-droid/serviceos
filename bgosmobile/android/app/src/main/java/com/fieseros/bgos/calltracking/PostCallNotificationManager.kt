package com.fieseros.bgos.calltracking

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.fieseros.bgos.MainActivity
import com.fieseros.bgos.R

/**
 * PostCallNotificationManager
 * Shows a high-priority heads-up action notification right after a call ends.
 * Uses standard notifications; delivery remains subject to user notification settings.
 */
object PostCallNotificationManager {

    private const val CHANNEL_ID = "bgos_call_tracker_channel"
    private const val CHANNEL_NAME = "BGOS Call Tracker"

    fun showPostCallNotification(context: Context, phoneNumber: String, durationSec: Int) {
        if (Build.VERSION.SDK_INT >= 33 && androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) return
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        // 1. Create Notification Channel on Android 8+ (API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Post-call quick action prompt for lead capture and follow-ups"
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }

        // 2. Intent to open BGOS app directly
        val appIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            data = Uri.parse("bgos://phone")
        }
        val appPendingIntent = PendingIntent.getActivity(
            context,
            phoneNumber.hashCode(),
            appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 3. Intent to open WhatsApp directly with prefilled follow-up
        val waUrl = "https://wa.me/${phoneNumber.replace(Regex("[^0-9]"), "")}?text=" +
                Uri.encode("Hi! Following up on our phone conversation. How can I assist you with your requirements?")
        val waIntent = Intent(Intent.ACTION_VIEW, Uri.parse(waUrl)).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val waPendingIntent = PendingIntent.getActivity(
            context,
            (phoneNumber + "_wa").hashCode(),
            waIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val durationLabel = if (durationSec > 0) "${durationSec}s talk time" else "No recorded talk time"

        // 4. Build Notification
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Call saved: $phoneNumber")
            .setContentText("$durationLabel • Open your call tracker to review")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setContentIntent(appPendingIntent)
            .addAction(0, "Review call", appPendingIntent)
            .addAction(0, "💬 WhatsApp", waPendingIntent)
            .build()

        notificationManager.notify(phoneNumber.hashCode(), notification)
    }
}
