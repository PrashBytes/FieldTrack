package com.fieldtrack.employee.network

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Manages active user authentication session, token, and sync timestamps.
 */
object SessionManager {
    private const val PREFS_NAME = "fieldtrack_session_prefs"
    private const val KEY_JWT_TOKEN = "jwt_token"
    private const val KEY_ACTIVE_SESSION_ID = "active_session_id"
    private const val KEY_EMPLOYEE_ID = "employee_id"
    private const val KEY_DEVICE_ID = "device_id"
    private const val KEY_LAST_SYNC_TIME = "last_sync_timestamp"

    private lateinit var prefs: SharedPreferences

    private val _lastSyncTimestamp = MutableStateFlow<Long?>(null)
    val lastSyncTimestamp: StateFlow<Long?> = _lastSyncTimestamp.asStateFlow()

    private val _isShiftActive = MutableStateFlow(false)
    val isShiftActive: StateFlow<Boolean> = _isShiftActive.asStateFlow()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val lastSync = prefs.getLong(KEY_LAST_SYNC_TIME, 0L)
        if (lastSync > 0) {
            _lastSyncTimestamp.value = lastSync
        }
        val currentSession = prefs.getString(KEY_ACTIVE_SESSION_ID, null)
        _isShiftActive.value = !currentSession.isNullOrBlank()
    }

    fun saveAuthToken(token: String) {
        prefs.edit().putString(KEY_JWT_TOKEN, token).apply()
    }

    fun getAuthToken(): String {
        return prefs.getString(KEY_JWT_TOKEN, "") ?: ""
    }

    fun saveActiveSession(sessionId: String, employeeId: String, deviceId: String? = null) {
        prefs.edit()
            .putString(KEY_ACTIVE_SESSION_ID, sessionId)
            .putString(KEY_EMPLOYEE_ID, employeeId)
            .putString(KEY_DEVICE_ID, deviceId)
            .apply()
        _isShiftActive.value = true
    }

    fun clearActiveSession() {
        prefs.edit()
            .remove(KEY_ACTIVE_SESSION_ID)
            .apply()
        _isShiftActive.value = false
    }

    fun getActiveSessionId(): String? {
        return prefs.getString(KEY_ACTIVE_SESSION_ID, null)
    }

    fun getEmployeeId(): String {
        return prefs.getString(KEY_EMPLOYEE_ID, "") ?: ""
    }

    fun getDeviceId(): String? {
        return prefs.getString(KEY_DEVICE_ID, null)
    }

    fun updateLastSyncTimestamp(timestamp: Long = System.currentTimeMillis()) {
        prefs.edit().putLong(KEY_LAST_SYNC_TIME, timestamp).apply()
        _lastSyncTimestamp.value = timestamp
    }
}
