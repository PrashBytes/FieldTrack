package com.fieldtrack.employee.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.fieldtrack.employee.data.FieldTrackDatabase
import com.fieldtrack.employee.network.SupabaseClient
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray

@Serializable
data class LocationPayload(
    val latitude: Double,
    val longitude: Double,
    val accuracy: Double?,
    val altitude: Double?,
    val speed: Double?,
    val bearing: Double?,
    val provider: String?,
    val is_mock: Boolean,
    val captured_at: String,
    val monotonic_elapsed_ms: Long?,
    val idempotency_key: String
)

@Serializable
data class IngestResponse(
    val success: Boolean?,
    val accepted: Int = 0,
    val rejected: Int = 0,
    val error: String? = null
)

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val dao = FieldTrackDatabase.get().locationDao()
        val pending = dao.getPendingList()

        if (pending.isEmpty()) return Result.success()

        val token = getAuthToken() ?: return Result.retry()
        val client = SupabaseClient.httpClient

        val points = pending.map { entity ->
            LocationPayload(
                latitude = entity.latitude,
                longitude = entity.longitude,
                accuracy = entity.accuracy?.toDouble(),
                altitude = entity.altitude,
                speed = entity.speed?.toDouble(),
                bearing = entity.bearing?.toDouble(),
                provider = entity.provider,
                is_mock = entity.isMock,
                captured_at = java.time.Instant.ofEpochMilli(entity.capturedAt).toString(),
                monotonic_elapsed_ms = entity.monotonicElapsedMs,
                idempotency_key = entity.idempotencyKey
            )
        }

        val requestBody = buildJsonObject {
            put("session_id", pending.first().sessionId)
            put("location_session_id", pending.first().locationSessionId)
            put("device_id", pending.first().deviceId ?: "")
            put("employee_id", pending.first().employeeId)
            putJsonArray("points") {
                for (p in points) {
                    add(buildJsonObject {
                        put("latitude", p.latitude)
                        put("longitude", p.longitude)
                        put("accuracy", p.accuracy)
                        put("altitude", p.altitude)
                        put("speed", p.speed)
                        put("bearing", p.bearing)
                        put("provider", p.provider)
                        put("is_mock", p.is_mock)
                        put("captured_at", p.captured_at)
                        put("monotonic_elapsed_ms", p.monotonic_elapsed_ms)
                        put("idempotency_key", p.idempotency_key)
                    })
                }
            }
        }

        return try {
            val response: HttpResponse = client.post(SupabaseClient.getFunctionUrl("location-ingest")) {
                header(HttpHeaders.Authorization, "Bearer $token")
                header(HttpHeaders.ContentType, ContentType.Application.Json)
                setBody(requestBody.toString())
            }

            if (response.status.isSuccess()) {
                val body = response.readAsText()
                val result = Json { ignoreUnknownKeys = true }.decodeFromString(IngestResponse.serializer(), body)
                if (result.success == true || result.accepted > 0) {
                    pending.forEach { dao.updateStatus(it.id, "synced") }
                    dao.deleteSynced()
                    Result.success()
                } else {
                    Result.retry()
                }
            } else {
                Result.retry()
            }
        } catch (e: Exception) {
            Result.retry()
        }
    }

    private fun getAuthToken(): String? {
        val prefs = applicationContext.getSharedPreferences("fieldtrack", Context.MODE_PRIVATE)
        return prefs.getString("auth_token", null)
    }
}
