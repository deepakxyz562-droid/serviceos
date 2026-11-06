package com.fieseros.bgos.calltracking

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.work.*
import org.json.JSONObject
import java.net.URL
import javax.net.ssl.HttpsURLConnection
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import java.security.KeyStore

/** Access token only; refresh credentials remain in Expo SecureStore. */
object CaptureCredentials {
    private const val alias = "bgos_call_capture_session"
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (!store.containsAlias(alias)) {
            KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply {
                init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            }.generateKey()
        }
        return store.getKey(alias,null) as SecretKey
    }
    fun encrypt(value: String): String {
        val cipher=Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE,key())
        return Base64.encodeToString(cipher.iv,Base64.NO_WRAP)+":"+Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)),Base64.NO_WRAP)
    }
    fun decrypt(value: String): String {
        val parts=value.split(":"); val cipher=Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,Base64.decode(parts[0],Base64.NO_WRAP)))
        return String(cipher.doFinal(Base64.decode(parts[1],Base64.NO_WRAP)),Charsets.UTF_8)
    }
}

class CallSyncWorker(context: Context,params: WorkerParameters): Worker(context,params) {
    override fun doWork(): Result {
        val prefs=applicationContext.getSharedPreferences("bgos_call_tracking_prefs",Context.MODE_PRIVATE)
        val identity: String
        val token: String
        val endpoint: String
        val queue: JSONObject
        synchronized(CallCaptureWorker.lock) {
            if (!prefs.getBoolean("tracking_enabled",false)) return Result.success()
            identity=prefs.getString("owner",null) ?: return Result.success()
            endpoint=prefs.getString("api_url",null) ?: return Result.success()
            val sealed=prefs.getString("access_token",null) ?: return Result.success()
            try {token=CaptureCredentials.decrypt(sealed)} catch (_:Exception){return Result.failure()}
            queue=JSONObject(prefs.getString("outbox","{}") ?: "{}")
        }
        if (!endpoint.startsWith("https://")) return Result.failure()
        for (id in queue.keys()) {
            synchronized(CallCaptureWorker.lock) {
                if (prefs.getString("owner",null)!=identity || !prefs.getBoolean("tracking_enabled",false)) return Result.success()
            }
            val call=queue.getJSONObject(id)
            val type=call.getString("callType")
            val format=java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",java.util.Locale.US).apply {timeZone=java.util.TimeZone.getTimeZone("UTC")}
            val body=JSONObject(call.toString()).put("captureSource","android_sim").put("createLead",false)
                .put("startedAt",format.format(java.util.Date(call.getLong("timestamp"))))
                .put("outcomeType",if(type=="missed" || type=="rejected")type else if(call.getLong("durationSec")>0)"connected" else "not_connected")
            try {
                val connection=URL(endpoint+"/api/calls").openConnection() as HttpsURLConnection
                try {
                    connection.instanceFollowRedirects=false
                    connection.connectTimeout=15000;connection.readTimeout=15000
                    connection.requestMethod="POST";connection.doOutput=true
                    connection.setRequestProperty("Content-Type","application/json")
                    connection.setRequestProperty("Authorization","Bearer $token")
                    connection.outputStream.use {it.write(body.toString().toByteArray(Charsets.UTF_8))}
                    val code=connection.responseCode
                    if(code==401 || code==403) {prefs.edit().putString("sync_error","Sign in to resume call sync").commit();return Result.success()}
                    if(code !in 200..299) {prefs.edit().putString("sync_error","Call sync needs attention ($code)").commit();return if(code==429 || code>=500)Result.retry() else Result.failure()}
                    val response=JSONObject(connection.inputStream.bufferedReader().use {it.readText()})
                    if (!response.optBoolean("success",false)) return Result.retry()
                    synchronized(CallCaptureWorker.lock) {
                        if(prefs.getString("owner",null)!=identity)return Result.success()
                        val pending=JSONObject(prefs.getString("outbox","{}") ?: "{}")
                        val delivered=JSONObject(prefs.getString("delivered","{}") ?: "{}")
                        pending.remove(id);delivered.put(id,true)
                        if(!prefs.edit().putString("outbox",pending.toString()).putString("delivered",delivered.toString()).remove("sync_error").commit())return Result.retry()
                    }
                    if (!isStopped) PostCallNotificationManager.showPostCallNotification(applicationContext,call.getString("customerPhone"),call.getInt("durationSec"))
                } finally {connection.disconnect()}
            } catch (_:Exception) {return Result.retry()}
        }
        return Result.success()
    }
    companion object {
        fun enqueue(context: Context) {
            WorkManager.getInstance(context).enqueueUniqueWork("bgos-call-upload",ExistingWorkPolicy.KEEP,
                OneTimeWorkRequestBuilder<CallSyncWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
        }
    }
}
