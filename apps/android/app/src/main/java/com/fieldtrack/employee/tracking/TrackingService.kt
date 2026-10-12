package com.fieldtrack.employee.tracking

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.fieldtrack.employee.data.FieldTrackDatabase
import com.fieldtrack.employee.data.LocationEntity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class TrackingService : Service() {

    companion object {
        const val CHANNEL_ID = "fieldtrack_tracking"
        const val NOTIFICATION_ID = 1001
        const val EXTRA_SESSION_ID = "session_id"
        const val EXTRA_LOCATION_SESSION_ID = "location_session_id"
        const val EXTRA_DEVICE_ID = "device_id"
        const val EXTRA_EMPLOYEE_ID = "employee_id"
    }

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)
    private lateinit var fusedClient: FusedLocationProviderClient
    private var locationCallback: LocationCallback? = null

    private var sessionId: String = ""
    private var locationSessionId: String = ""
    private var deviceId: String? = null
    private var employeeId: String = ""

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        sessionId = intent?.getStringExtra(EXTRA_SESSION_ID) ?: ""
        locationSessionId = intent?.getStringExtra(EXTRA_LOCATION_SESSION_ID) ?: ""
        deviceId = intent?.getStringExtra(EXTRA_DEVICE_ID)
        employeeId = intent?.getStringExtra(EXTRA_EMPLOYEE_ID) ?: ""

        startForeground(NOTIFICATION_ID, buildNotification("Tracking active"), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        startLocationUpdates()

        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 30_000L)
            .setMinUpdateIntervalMillis(15_000L)
            .setMaxUpdateDelayMillis(60_000L)
            .setWaitForAccurateLocation(false)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location -> saveLocation(location) }
            }
        }

        fusedClient.requestLocationUpdates(request, locationCallback, mainLooper)
    }

    private fun saveLocation(location: Location) {
        scope.launch {
            val entity = LocationEntity(
                sessionId = sessionId,
                locationSessionId = locationSessionId,
                deviceId = deviceId,
                employeeId = employeeId,
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = if (location.hasAccuracy()) location.accuracy else null,
                altitude = if (location.hasAltitude()) location.altitude else null,
                speed = if (location.hasSpeed()) location.speed else null,
                bearing = if (location.hasBearing()) location.bearing else null,
                provider = location.provider,
                isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) location.isMock else false,
                capturedAt = System.currentTimeMillis(),
                monotonicElapsedMs = null,
                idempotencyKey = UUID.randomUUID().toString()
            )
            FieldTrackDatabase.get().locationDao().insert(entity)
        }
    }

    private fun buildNotification(text: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("FieldTrack")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Location Tracking",
            NotificationManager.IMPORTANCE_LOW
        ).apply { description = "Notifies when location tracking is active" }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    override fun onDestroy() {
        locationCallback?.let { fusedClient.removeLocationUpdates(it) }
        job.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
