package com.fieldtrack.employee.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.fieldtrack.employee.data.AppDatabase
import com.fieldtrack.employee.network.SessionManager
import com.fieldtrack.employee.network.SupabaseClient
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.UUID

@Serializable
data class SyncPointPayload(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val is_mock: Boolean = false,
    val captured_at: String,
    val idempotency_key: String
)

@Serializable
data class BatchIngestRequest(
    val session_id: String,
    val idempotency_key: String,
    val points: List<SyncPointPayload>
)

/**
 * Offline-first WorkManager worker for uploading batches of pending GPS telemetry to Supabase.
 */
class LocationSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    override suspend fun doWork(): Result {
        val dao = AppDatabase.getInstance(applicationContext).locationDao()
        val pendingPoints = dao.getPendingBatch(limit = 50)

        if (pendingPoints.isEmpty()) {
            return Result.success()
        }

        val token = SessionManager.getAuthToken().ifBlank {
            SupabaseClient.getAnonKey()
        }

        // Group points by sessionId
        val pointsBySession = pendingPoints.groupBy { it.sessionId }

        for ((sessionId, points) in pointsBySession) {
            val batchIdempotencyKey = UUID.randomUUID().toString()

            val syncPayload = BatchIngestRequest(
                session_id = sessionId,
                idempotency_key = batchIdempotencyKey,
                points = points.map { pt ->
                    val isoTimestamp = try {
                        Instant.ofEpochMilli(pt.capturedAt).toString()
                    } catch (e: Exception) {
                        Instant.now().toString()
                    }

                    SyncPointPayload(
                        latitude = pt.latitude,
                        longitude = pt.longitude,
                        accuracy = pt.accuracy,
                        speed = pt.speed,
                        is_mock = pt.isMock,
                        captured_at = isoTimestamp,
                        idempotency_key = "pt-${pt.id}-${pt.capturedAt}"
                    )
                }
            )

            try {
                val ingestUrl = SupabaseClient.getFunctionUrl("location-ingest")
                val response = SupabaseClient.httpClient.post(ingestUrl) {
                    contentType(ContentType.Application.Json)
                    header(HttpHeaders.Authorization, "Bearer $token")
                    header("apikey", SupabaseClient.getAnonKey())
                    header("Idempotency-Key", batchIdempotencyKey)
                    setBody(json.encodeToString(syncPayload))
                }

                if (response.status.isSuccess()) {
                    val syncedIds = points.map { it.id }
                    // Mark as synced and purge to prevent local storage bloat
                    dao.deleteSynced(syncedIds)
                    SessionManager.updateLastSyncTimestamp()
                } else if (response.status.value in 400..499 && response.status.value != 408) {
                    // Client validation error (e.g. closed session); purge invalid points to unblock queue
                    val invalidIds = points.map { it.id }
                    dao.deleteSynced(invalidIds)
                } else {
                    // Server error 5xx, retry with exponential backoff
                    return Result.retry()
                }
            } catch (e: Exception) {
                // Network unavailable or timeout; schedule retry
                return Result.retry()
            }
        }

        // If additional pending records remain in local queue, trigger another pass
        val remainingCount = dao.getPendingCount()
        if (remainingCount > 0) {
            return Result.retry()
        }

        return Result.success()
    }
}
