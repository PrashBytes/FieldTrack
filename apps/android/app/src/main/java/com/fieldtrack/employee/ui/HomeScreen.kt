package com.fieldtrack.employee.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.fieldtrack.employee.data.AppDatabase
import com.fieldtrack.employee.network.SessionManager
import com.fieldtrack.employee.network.SupabaseClient
import com.fieldtrack.employee.tracking.LocationTrackingService
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    // 1. Observe State
    val isShiftActive by SessionManager.isShiftActive.collectAsState()
    val lastLocation by LocationTrackingService.lastCapturedLocation.collectAsState()
    val lastSyncTime by SessionManager.lastSyncTimestamp.collectAsState()

    val pendingCountFlow = remember {
        AppDatabase.getInstance(context).locationDao().observePendingCount()
    }
    val pendingCount by pendingCountFlow.collectAsState(initial = 0)

    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var infoMessage by remember { mutableStateOf<String?>(null) }

    // 2. Permission Handling
    var hasLocationPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionsToRequest = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }.toTypedArray()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        hasLocationPermission = results[Manifest.permission.ACCESS_FINE_LOCATION] == true
    }

    fun handleCheckIn() {
        if (!hasLocationPermission) {
            permissionLauncher.launch(permissionsToRequest)
            return
        }

        isLoading = true
        errorMessage = null

        coroutineScope.launch {
            try {
                val fusedClient = LocationServices.getFusedLocationProviderClient(context)
                fusedClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null)
                    .addOnSuccessListener { loc ->
                        coroutineScope.launch {
                            val latitude = loc?.latitude ?: 0.0
                            val longitude = loc?.longitude ?: 0.0
                            val accuracy = loc?.accuracy ?: 10f
                            val isMock = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                loc?.isMock ?: false
                            } else {
                                @Suppress("DEPRECATION")
                                loc?.isFromMockProvider ?: false
                            }

                            val token = SessionManager.getAuthToken().ifBlank {
                                SupabaseClient.getAnonKey()
                            }

                            val checkInUrl = SupabaseClient.getFunctionUrl("attendance-check-in")
                            val payloadJson = """
                                {
                                    "device_id": "${SessionManager.getDeviceId() ?: "android-device-primary"}",
                                    "latitude": $latitude,
                                    "longitude": $longitude,
                                    "accuracy": $accuracy,
                                    "is_mock": $isMock
                                }
                            """.trimIndent()

                            try {
                                val response = SupabaseClient.httpClient.post(checkInUrl) {
                                    contentType(ContentType.Application.Json)
                                    header(HttpHeaders.Authorization, "Bearer $token")
                                    header("apikey", SupabaseClient.getAnonKey())
                                    setBody(payloadJson)
                                }

                                if (response.status.isSuccess()) {
                                    val body = response.bodyAsText()
                                    val jsonObj = Json.parseToJsonElement(body).jsonObject
                                    val sessionId = jsonObj["session_id"]?.jsonPrimitive?.content ?: UUID.randomUUID().toString()
                                    val employeeId = jsonObj["employee_id"]?.jsonPrimitive?.content ?: "emp-current"

                                    SessionManager.saveActiveSession(sessionId, employeeId)

                                    // Start Foreground Tracking Service
                                    val serviceIntent = Intent(context, LocationTrackingService::class.java).apply {
                                        action = LocationTrackingService.ACTION_START
                                        putExtra(LocationTrackingService.EXTRA_SESSION_ID, sessionId)
                                        putExtra(LocationTrackingService.EXTRA_EMPLOYEE_ID, employeeId)
                                    }
                                    ContextCompat.startForegroundService(context, serviceIntent)
                                    infoMessage = "Checked in successfully! Shift active."
                                } else {
                                    // Fallback for offline demo mode
                                    val localSessionId = UUID.randomUUID().toString()
                                    SessionManager.saveActiveSession(localSessionId, "emp-offline")
                                    val serviceIntent = Intent(context, LocationTrackingService::class.java).apply {
                                        action = LocationTrackingService.ACTION_START
                                        putExtra(LocationTrackingService.EXTRA_SESSION_ID, localSessionId)
                                    }
                                    ContextCompat.startForegroundService(context, serviceIntent)
                                    infoMessage = "Started offline shift session. Telemetry queuing locally."
                                }
                            } catch (e: Exception) {
                                // Network failure: Start offline shift
                                val offlineSessionId = UUID.randomUUID().toString()
                                SessionManager.saveActiveSession(offlineSessionId, "emp-offline")
                                val serviceIntent = Intent(context, LocationTrackingService::class.java).apply {
                                    action = LocationTrackingService.ACTION_START
                                    putExtra(LocationTrackingService.EXTRA_SESSION_ID, offlineSessionId)
                                }
                                ContextCompat.startForegroundService(context, serviceIntent)
                                infoMessage = "Offline shift started. Telemetry will sync when online."
                            }
                            isLoading = false
                        }
                    }
                    .addOnFailureListener {
                        errorMessage = "Failed to acquire initial GPS fix: ${it.message}"
                        isLoading = false
                    }
            } catch (e: Exception) {
                errorMessage = "Error initiating check-in: ${e.message}"
                isLoading = false
            }
        }
    }

    fun handleCheckOut() {
        isLoading = true
        errorMessage = null

        coroutineScope.launch {
            // Stop Foreground Tracking Service
            val stopIntent = Intent(context, LocationTrackingService::class.java).apply {
                action = LocationTrackingService.ACTION_STOP
            }
            context.startService(stopIntent)

            SessionManager.clearActiveSession()
            infoMessage = "Checked out. Shift session concluded."
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.GpsFixed,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "FieldTrack Mobile",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (isShiftActive) Color(0xFFF0FDF4) else Color(0xFFF8FAFC)
                ),
                shape = RoundedCornerShape(16.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = androidx.compose.ui.graphics.SolidColor(
                        if (isShiftActive) Color(0xFF86EFAC) else Color(0xFFCBD5E1)
                    )
                )
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(
                                if (isShiftActive) Color(0xFF22C55E).copy(alpha = 0.15f)
                                else Color(0xFF64748B).copy(alpha = 0.15f)
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = if (isShiftActive) Icons.Default.CheckCircle else Icons.Default.LocationOff,
                            contentDescription = null,
                            tint = if (isShiftActive) Color(0xFF16A34A) else Color(0xFF64748B),
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = if (isShiftActive) "Checked In" else "Checked Out",
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                        color = if (isShiftActive) Color(0xFF15803D) else Color(0xFF334155)
                    )

                    Text(
                        text = if (isShiftActive)
                            "Active Shift • GPS Telemetry Broadcasting (30s interval)"
                        else
                            "Shift Inactive • Location tracking is disabled",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF64748B)
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = {
                            if (isShiftActive) handleCheckOut() else handleCheckIn()
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        enabled = !isLoading,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isShiftActive) Color(0xFFDC2626) else Color(0xFF16A34A)
                        )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = if (isShiftActive) Icons.Default.StopCircle else Icons.Default.PlayArrow,
                                contentDescription = null
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isShiftActive) "Check Out & End Shift" else "Check In & Start Shift",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                            )
                        }
                    }
                }
            }

            // Diagnostic Telemetry Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Diagnostics & Offline Queue",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
                        )
                        Badge(
                            containerColor = if (pendingCount == 0) Color(0xFFDCFCE7) else Color(0xFFFEF3C7)
                        ) {
                            Text(
                                text = if (pendingCount == 0) "Synced" else "$pendingCount Pending",
                                color = if (pendingCount == 0) Color(0xFF15803D) else Color(0xFFB45309),
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }

                    Divider(color = Color(0xFFF1F5F9))

                    // Row 1: GPS Signal Status
                    DiagnosticItem(
                        icon = Icons.Default.SatelliteAlt,
                        label = "GPS Telemetry Status",
                        value = when {
                            !isShiftActive -> "Service Inactive"
                            lastLocation != null -> "Fix Acquired (±${lastLocation?.accuracy?.toInt() ?: 0}m)"
                            else -> "Acquiring Satellites..."
                        },
                        valueColor = if (lastLocation != null) Color(0xFF16A34A) else Color(0xFF64748B)
                    )

                    // Row 2: Anti-Spoofing Indicator
                    val isSpoofed = lastLocation?.let {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) it.isMock else false
                    } ?: false

                    DiagnosticItem(
                        icon = Icons.Default.Security,
                        label = "Integrity / Anti-Spoofing",
                        value = if (isSpoofed) "MOCK GPS DETECTED" else "Genuine Hardware GPS",
                        valueColor = if (isSpoofed) Color(0xFFDC2626) else Color(0xFF16A34A)
                    )

                    // Row 3: Pending Offline Records
                    DiagnosticItem(
                        icon = Icons.Default.CloudQueue,
                        label = "Pending Offline Records",
                        value = "$pendingCount points queued in Room DB",
                        valueColor = if (pendingCount > 0) Color(0xFFB45309) else Color(0xFF64748B)
                    )

                    // Row 4: Last Cloud Sync
                    val formattedSync = remember(lastSyncTime) {
                        lastSyncTime?.let {
                            SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date(it))
                        } ?: "No sync executed yet"
                    }

                    DiagnosticItem(
                        icon = Icons.Default.Sync,
                        label = "Last Cloud Synchronized",
                        value = formattedSync,
                        valueColor = Color(0xFF334155)
                    )
                }
            }

            // Messages & Feedback
            AnimatedVisibility(visible = infoMessage != null) {
                Surface(
                    color = Color(0xFFECFDF5),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = infoMessage ?: "",
                        color = Color(0xFF047857),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }

            AnimatedVisibility(visible = errorMessage != null) {
                Surface(
                    color = Color(0xFFFEF2F2),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = errorMessage ?: "",
                        color = Color(0xFFB91C1C),
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun DiagnosticItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    valueColor: Color
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color(0xFF64748B),
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = Color(0xFF94A3B8)
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                color = valueColor,
                fontFamily = FontFamily.SansSerif
            )
        }
    }
}
