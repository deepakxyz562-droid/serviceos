package com.fieseros.bgos.calltracking

import android.Manifest
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Build
import android.provider.CallLog
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * CallTrackingBridgeModule
 * React Native bridge exposing native Android Telephony and Dual-SIM status to BGOS.
 */
class CallTrackingBridgeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BgosCallTracking"

    private val prefs: SharedPreferences by lazy {
        reactContext.getSharedPreferences("bgos_call_tracking_prefs", Context.MODE_PRIVATE)
    }

    /**
     * getSimCards
     * Returns a list of active SIM cards on the device via SubscriptionManager.
     */
    @ReactMethod
    fun getSimCards(promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_PHONE_STATE
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_PHONE_STATE permission is required to detect SIM cards.")
                return
            }

            val subscriptionManager =
                reactContext.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            if (subscriptionManager == null) {
                promise.resolve(Arguments.createArray())
                return
            }

            val list: List<SubscriptionInfo>? = subscriptionManager.activeSubscriptionInfoList
            val array: WritableArray = Arguments.createArray()

            list?.forEach { sub ->
                val map: WritableMap = Arguments.createMap()
                map.putInt("subscriptionId", sub.subscriptionId)
                map.putInt("simSlotIndex", sub.simSlotIndex)
                map.putString("displayName", sub.displayName?.toString() ?: "SIM ${sub.simSlotIndex + 1}")
                map.putString("carrierName", sub.carrierName?.toString() ?: "")
                map.putString("countryIso", sub.countryIso ?: "")
                array.pushMap(map)
            }

            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("SIM_ERROR", e.message, e)
        }
    }

    /**
     * getTrackingStatus
     * Returns whether background call tracking is enabled and the designated business SIM slot.
     */
    @ReactMethod
    fun getTrackingStatus(promise: Promise) {
        try {
            val enabled = prefs.getBoolean("tracking_enabled", false)
            val designatedSlot = prefs.getInt("designated_sim_slot", -1) // -1 means all SIMs

            val map: WritableMap = Arguments.createMap()
            map.putBoolean("enabled", enabled)
            map.putInt("designatedSimSlot", designatedSlot)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message, e)
        }
    }

    /**
     * setTrackingConfig
     * Configures background tracking and designates which SIM slot is monitored.
     */
    @ReactMethod
    fun setTrackingConfig(enabled: Boolean, designatedSimSlot: Int, promise: Promise) {
        try {
            prefs.edit()
                .putBoolean("tracking_enabled", enabled)
                .putInt("designated_sim_slot", designatedSimSlot)
                .apply()

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message, e)
        }
    }

    /**
     * getRecentCallLogs
     * Queries CallLog.Calls to fetch carrier-verified call history (duration, type, timestamp).
     */
    @ReactMethod
    fun getRecentCallLogs(limit: Int, promise: Promise) {
        try {
            if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.READ_CALL_LOG
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                promise.reject("PERMISSION_DENIED", "READ_CALL_LOG permission required.")
                return
            }

            val cursor = reactContext.contentResolver.query(
                CallLog.Calls.CONTENT_URI,
                arrayOf(
                    CallLog.Calls._ID,
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION,
                    CallLog.Calls.CACHED_NAME
                ),
                null,
                null,
                "${CallLog.Calls.DATE} DESC LIMIT ${limit.coerceIn(1, 100)}"
            )

            val array: WritableArray = Arguments.createArray()
            cursor?.use { c ->
                val idIdx = c.getColumnIndex(CallLog.Calls._ID)
                val numberIdx = c.getColumnIndex(CallLog.Calls.NUMBER)
                val typeIdx = c.getColumnIndex(CallLog.Calls.TYPE)
                val dateIdx = c.getColumnIndex(CallLog.Calls.DATE)
                val durationIdx = c.getColumnIndex(CallLog.Calls.DURATION)
                val nameIdx = c.getColumnIndex(CallLog.Calls.CACHED_NAME)

                while (c.moveToNext()) {
                    val map: WritableMap = Arguments.createMap()
                    map.putString("id", if (idIdx >= 0) c.getString(idIdx) else "")
                    map.putString("number", if (numberIdx >= 0) c.getString(numberIdx) else "")
                    val rawType = if (typeIdx >= 0) c.getInt(typeIdx) else 1
                    map.putString(
                        "type",
                        when (rawType) {
                            CallLog.Calls.INCOMING_TYPE -> "inbound"
                            CallLog.Calls.OUTGOING_TYPE -> "outbound"
                            CallLog.Calls.MISSED_TYPE -> "missed"
                            CallLog.Calls.REJECTED_TYPE -> "rejected"
                            else -> "other"
                        }
                    )
                    map.putDouble("timestamp", if (dateIdx >= 0) c.getLong(dateIdx).toDouble() else 0.0)
                    map.putInt("durationSec", if (durationIdx >= 0) c.getInt(durationIdx) else 0)
                    map.putString("cachedName", if (nameIdx >= 0) c.getString(nameIdx) ?: "" else "")
                    array.pushMap(map)
                }
            }

            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("CALL_LOG_ERROR", e.message, e)
        }
    }
}
