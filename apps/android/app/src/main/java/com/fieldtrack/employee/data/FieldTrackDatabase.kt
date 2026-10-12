package com.fieldtrack.employee.data

import android.content.Context
import androidx.room.Database
import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Room
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "location_queue")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val sessionId: String,
    val locationSessionId: String,
    val deviceId: String?,
    val employeeId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float?,
    val altitude: Double?,
    val speed: Float?,
    val bearing: Float?,
    val provider: String?,
    val isMock: Boolean,
    val capturedAt: Long,
    val monotonicElapsedMs: Long?,
    val idempotencyKey: String,
    val syncStatus: String = "pending"
)

@Dao
interface LocationDao {
    @Query("SELECT * FROM location_queue WHERE syncStatus = 'pending' ORDER BY capturedAt ASC LIMIT 200")
    fun getPending(): Flow<List<LocationEntity>>

    @Query("SELECT * FROM location_queue WHERE syncStatus = 'pending' ORDER BY capturedAt ASC LIMIT 200")
    suspend fun getPendingList(): List<LocationEntity>

    @Query("SELECT COUNT(*) FROM location_queue WHERE syncStatus = 'pending'")
    fun getPendingCount(): Flow<Int>

    @Insert
    suspend fun insert(entity: LocationEntity): Long

    @Query("UPDATE location_queue SET syncStatus = :status WHERE id = :id")
    suspend fun updateStatus(id: Long, status: String)

    @Query("DELETE FROM location_queue WHERE syncStatus = 'synced'")
    suspend fun deleteSynced()

    @Query("SELECT COUNT(*) FROM location_queue WHERE syncStatus = 'pending'")
    suspend fun getPendingCountSync(): Int
}

@Database(entities = [LocationEntity::class], version = 1, exportSchema = false)
abstract class FieldTrackDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao

    companion object {
        @Volatile private var INSTANCE: FieldTrackDatabase? = null

        fun init(context: Context) {
            if (INSTANCE == null) {
                synchronized(this) {
                    INSTANCE = Room.databaseBuilder(
                        context.applicationContext,
                        FieldTrackDatabase::class.java,
                        "fieldtrack.db"
                    ).fallbackToDestructiveMigration().build()
                }
            }
        }

        fun get(): FieldTrackDatabase = INSTANCE ?: throw IllegalStateException("Database not initialized")
    }
}
