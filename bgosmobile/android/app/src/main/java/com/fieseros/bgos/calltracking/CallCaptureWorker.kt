package com.fieseros.bgos.calltracking

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import androidx.core.content.ContextCompat
import androidx.work.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/** Captures locally even offline. Upload acknowledgement removes individual events. */
class CallCaptureWorker(context: Context, params: WorkerParameters): Worker(context, params) {
    override fun doWork(): Result { return synchronized(lock) {
        val prefs = applicationContext.getSharedPreferences("bgos_call_tracking_prefs", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("tracking_enabled", false)) return Result.success()
        if (ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) return Result.failure()
        val account = prefs.getString("business_account", null) ?: return Result.failure()
        val since = prefs.getLong("capture_since", System.currentTimeMillis())
        try {
            val queue = JSONObject(prefs.getString("outbox", "{}") ?: "{}")
            val delivered = JSONObject(prefs.getString("delivered", "{}") ?: "{}")
            applicationContext.contentResolver.query(CallLog.Calls.CONTENT_URI,
                arrayOf(CallLog.Calls._ID,CallLog.Calls.NUMBER,CallLog.Calls.DATE,CallLog.Calls.DURATION,CallLog.Calls.TYPE,CallLog.Calls.PHONE_ACCOUNT_ID,CallLog.Calls.PHONE_ACCOUNT_COMPONENT_NAME),
                "${CallLog.Calls.DATE} >= ?", arrayOf(since.toString()), "${CallLog.Calls.DATE} ASC")?.use { c ->
                while(c.moveToNext()) {
                    val selected = "${c.getString(6)}|${c.getString(5)}"
                    if (selected != account) continue
                    val number = c.getString(1) ?: continue
                    if (number.isBlank()) continue
                    val timestamp = c.getLong(2)
                    val duration = c.getLong(3)
                    val type = when(c.getInt(4)) { 1 -> "inbound"; 2 -> "outbound"; 3 -> "missed"; 5 -> "rejected"; else -> continue }
                    val id = "${prefs.getString("device_id", "")}:${c.getLong(0)}:$timestamp"
                    if (delivered.has(id)) continue
                    queue.put(id, JSONObject().put("sourceEventId",id).put("customerPhone",number)
                        .put("timestamp",timestamp).put("durationSec",duration).put("callType",type))
                }
            }
            if (!prefs.edit().putString("outbox",queue.toString()).commit()) return Result.retry()
            CallSyncWorker.enqueue(applicationContext)
            Result.success()
        } catch (_: Exception) { Result.retry() }
    }
    }
    companion object {
        val lock = Any()
        fun enqueue(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork("bgos-call-capture",ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<CallCaptureWorker>().setInitialDelay(5,TimeUnit.SECONDS)
                    .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,30,TimeUnit.SECONDS).build())
        }
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("bgos-call-reconcile",ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<CallCaptureWorker>(15,TimeUnit.MINUTES).build())
            enqueue(context)
        }
    }
}
