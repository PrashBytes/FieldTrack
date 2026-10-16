package com.fieldtrack.employee

import com.fieldtrack.employee.data.LocationEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit test for Room LocationDao offline queue management semantics.
 * Verifies insertion, batch limits, sorting, and state transitions (PENDING -> SYNCED -> PURGED).
 */
class LocationQueueRepositoryTest {

    // In-memory simulation of LocationDao for standalone fast unit testing
    private class FakeLocationDao {
        private val queue = mutableListOf<LocationEntity>()
        private var idCounter = 1L

        fun insert(point: LocationEntity): Long {
            val assigned = point.copy(id = idCounter++)
            queue.add(assigned)
            return assigned.id
        }

        fun insertBatch(points: List<LocationEntity>) {
            points.forEach { insert(it) }
        }

        fun getPendingBatch(limit: Int = 50): List<LocationEntity> {
            return queue.filter { it.syncStatus == "PENDING" }
                .sortedBy { it.capturedAt }
                .take(limit)
        }

        fun getPendingCount(): Int {
            return queue.count { it.syncStatus == "PENDING" }
        }

        fun markSynced(ids: List<Long>) {
            for (i in queue.indices) {
                if (queue[i].id in ids) {
                    queue[i] = queue[i].copy(syncStatus = "SYNCED")
                }
            }
        }

        fun purgeSynced() {
            queue.removeAll { it.syncStatus == "SYNCED" }
        }

        fun getAll(): List<LocationEntity> = queue.toList()
    }

    private lateinit var dao: FakeLocationDao

    @Before
    fun setUp() {
        dao = FakeLocationDao()
    }

    @Test
    fun testInsertAndFetchPendingBatch() {
        val baseTime = 1700000000000L
        // Insert 3 points with incremental timestamps
        val id1 = dao.insert(LocationEntity(sessionId = "sess-1", latitude = 37.7749, longitude = -122.4194, capturedAt = baseTime + 1000))
        val id2 = dao.insert(LocationEntity(sessionId = "sess-1", latitude = 37.7750, longitude = -122.4190, capturedAt = baseTime + 2000))
        val id3 = dao.insert(LocationEntity(sessionId = "sess-1", latitude = 37.7752, longitude = -122.4185, capturedAt = baseTime + 3000))

        assertEquals(3, dao.getPendingCount())
        val batch = dao.getPendingBatch(limit = 2)
        assertEquals("Batch limit should restrict output count to 2", 2, batch.size)
        assertEquals("Batch should be ordered ascending by capturedAt", id1, batch[0].id)
        assertEquals(id2, batch[1].id)
    }

    @Test
    fun testMarkSyncedAndPurge() {
        val baseTime = 1700000000000L
        val id1 = dao.insert(LocationEntity(sessionId = "sess-1", latitude = 37.7749, longitude = -122.4194, capturedAt = baseTime))
        val id2 = dao.insert(LocationEntity(sessionId = "sess-1", latitude = 37.7750, longitude = -122.4190, capturedAt = baseTime + 1000))

        // Mark id1 as SYNCED
        dao.markSynced(listOf(id1))

        assertEquals("Pending count should drop to 1", 1, dao.getPendingCount())
        val remainingPending = dao.getPendingBatch(limit = 10)
        assertEquals(1, remainingPending.size)
        assertEquals(id2, remainingPending[0].id)

        // Purge synced
        dao.purgeSynced()
        val allRemaining = dao.getAll()
        assertEquals(1, allRemaining.size)
        assertEquals(id2, allRemaining[0].id)
    }

    @Test
    fun testMockFlagPersistence() {
        val realPointId = dao.insert(
            LocationEntity(sessionId = "sess-2", latitude = 40.7128, longitude = -74.0060, isMock = false)
        )
        val mockPointId = dao.insert(
            LocationEntity(sessionId = "sess-2", latitude = 40.7128, longitude = -74.0060, isMock = true)
        )

        val batch = dao.getPendingBatch(limit = 10)
        val realPoint = batch.first { it.id == realPointId }
        val mockPoint = batch.first { it.id == mockPointId }

        assertFalse("Real point should have isMock=false", realPoint.isMock)
        assertTrue("Mock point should have isMock=true", mockPoint.isMock)
    }
}
