package com.fieseros.bgos.calltracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/** Phone state is a wake-up hint, never proof of outcome or talk duration. */
class BgosCallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == TelephonyManager.ACTION_PHONE_STATE_CHANGED &&
            intent.getStringExtra(TelephonyManager.EXTRA_STATE) == TelephonyManager.EXTRA_STATE_IDLE) {
            CallCaptureWorker.enqueue(context)
        }
    }
}
