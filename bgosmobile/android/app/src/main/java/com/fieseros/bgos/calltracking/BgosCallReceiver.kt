package com.fieseros.bgos.calltracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.telephony.TelephonyManager

/**
 * BgosCallReceiver
 * BroadcastReceiver listening for cellular phone state transitions.
 * Tracks calls when enabled and triggers post-call notification prompts.
 */
class BgosCallReceiver : BroadcastReceiver() {

    companion object {
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var callStartTime: Long = 0
        private var savedNumber: String? = null
        private var isIncoming = false
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            return
        }

        val prefs: SharedPreferences =
            context.getSharedPreferences("bgos_call_tracking_prefs", Context.MODE_PRIVATE)
        val isTrackingEnabled = prefs.getBoolean("tracking_enabled", false)

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        if (!incomingNumber.isNullOrBlank()) {
            savedNumber = incomingNumber
        }

        if (stateStr == lastState) {
            return
        }

        when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                isIncoming = true
                callStartTime = System.currentTimeMillis()
            }

            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.EXTRA_STATE_RINGING) {
                    isIncoming = false
                    callStartTime = System.currentTimeMillis()
                }
            }

            TelephonyManager.EXTRA_STATE_IDLE -> {
                // Call ended or missed call
                val durationSec = if (callStartTime > 0) {
                    ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                } else {
                    0
                }

                val targetNumber = savedNumber ?: "Unknown"

                // If user enabled background tracking, show the post-call heads-up prompt
                if (isTrackingEnabled && targetNumber != "Unknown") {
                    PostCallNotificationManager.showPostCallNotification(
                        context,
                        targetNumber,
                        durationSec
                    )
                }

                // Reset state
                callStartTime = 0
                savedNumber = null
                isIncoming = false
            }
        }

        lastState = stateStr
    }
}
