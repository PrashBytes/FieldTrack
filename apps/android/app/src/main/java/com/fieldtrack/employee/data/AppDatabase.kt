package com.fieldtrack.employee.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/**
 * Room Entity representing an offline GPS tracking breadcrumb.
 */
@Entity(tableName = "location_queue")
data class LocationEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val sessionId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null,
    val speed: Float? = null,
    val isMock: Boolean = false,
    val capturedAt: Long = System.currentTimeMillis(),
    val syncStatus: String = "PENDING" // "PENDING" or "SYNCED"
)

/**
 * Data Access Object for local offline location queue.
 */
@Dao
interface LocationDao {
    @Insert
    suspend fun insert(point: LocationEntity): Long

    @Insert
    suspend fun insertBatch(points: List<LocationEntity>)

    @Query("SELECT * FROM location_queue WHERE syncStatus = 'PENDING' ORDER BY capturedAt ASC LIMIT :limit")
    suspend fun getPendingBatch(limit: Int = 50): List<LocationEntity>

    @Query("SELECT COUNT(*) FROM location_queue WHERE syncStatus = 'PENDING'")
    fun observePendingCount(): Flow<Int>

    @Query("SELECT COUNT(*) FROM location_queue WHERE syncStatus = 'PENDING'")
    suspend fun getPendingCount(): Int

    @Query("UPDATE location_queue SET syncStatus = 'SYNCED' WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM location_queue WHERE syncStatus = 'SYNCED' OR id IN (:ids)")
    suspend fun deleteSynced(ids: List<Long>)

    @Query("DELETE FROM location_queue WHERE syncStatus = 'SYNCED'")
    suspend fun purgeSynced()

    @Query("DELETE FROM location_queue")
    suspend fun clearAll()
}

/**
 * Room Database Singleton for offline-first telemetry storage.
 */
@Database(entities = [LocationEntity::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun locationDao(): LocationDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "fieldtrack_offline.db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
