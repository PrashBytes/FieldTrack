package com.fieldtrack.employee

import com.fieldtrack.employee.tracking.MockLocationDetector
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for Mock Location parsing and impossible movement detection logic.
 */
class MockLocationDetectorTest {

    @Test
    fun testValidCoordinates_Pass() {
        assertTrue(MockLocationDetector.isValidCoordinate(40.7128, -74.0060)) // New York
        assertTrue(MockLocationDetector.isValidCoordinate(0.0, 0.0))           // Equator / Meridian
        assertTrue(MockLocationDetector.isValidCoordinate(90.0, 180.0))        // Extreme bounds
        assertTrue(MockLocationDetector.isValidCoordinate(-90.0, -180.0))
    }

    @Test
    fun testInvalidCoordinates_Fail() {
        assertFalse(MockLocationDetector.isValidCoordinate(91.0, 0.0))
        assertFalse(MockLocationDetector.isValidCoordinate(-90.1, 0.0))
        assertFalse(MockLocationDetector.isValidCoordinate(0.0, 180.5))
        assertFalse(MockLocationDetector.isValidCoordinate(0.0, -181.0))
    }

    @Test
    fun testHaversineDistance_Calculation() {
        // Distance between Empire State Building (40.7484, -73.9857) and Chrysler Building (40.7516, -73.9755)
        // Approximate distance: ~920-950 meters
        val distance = MockLocationDetector.calculateHaversineDistance(
            40.7484, -73.9857,
            40.7516, -73.9755
        )
        assertTrue("Distance should be approximately 930m, was $distance", distance in 900.0..1000.0)
    }

    @Test
    fun testImpossibleMovement_FlaggedForTeleportation() {
        val now = 1700000000000L
        // Jump from NYC to London in 10 seconds
        val latNYC = 40.7128
        val lonNYC = -74.0060
        val latLON = 51.5074
        val lonLON = -0.1278

        val isImpossible = MockLocationDetector.isImpossibleMovement(
            lat1 = latNYC, lon1 = lonNYC, time1Millis = now,
            lat2 = latLON, lon2 = lonLON, time2Millis = now + 10_000L // 10 seconds later
        )

        assertTrue("Movement across the Atlantic in 10s must be flagged as impossible movement", isImpossible)
    }

    @Test
    fun testNormalVehicleMovement_NotFlagged() {
        val now = 1700000000000L
        // Travel ~600 meters in 60 seconds (~10 m/s or 36 km/h)
        val lat1 = 40.7128
        val lon1 = -74.0060
        val lat2 = 40.7180
        val lon2 = -74.0060

        val isImpossible = MockLocationDetector.isImpossibleMovement(
            lat1 = lat1, lon1 = lon1, time1Millis = now,
            lat2 = lat2, lon2 = lon2, time2Millis = now + 60_000L
        )

        assertFalse("Normal urban driving speed should not trigger fraud detection", isImpossible)
    }
}
