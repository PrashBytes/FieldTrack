package com.fieldtrack.employee.tracking

import android.location.Location
import android.os.Build

/**
 * Utility for parsing and verifying GPS mock status and anti-spoofing flags.
 */
object MockLocationDetector {

    /**
     * Inspects Android location object to determine if the coordinate originates
     * from a mock provider or mock location application.
     */
    fun isMockLocation(location: Location): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            location.isMock
        } else {
            @Suppress("DEPRECATION")
            location.isFromMockProvider
        }
    }

    /**
     * Checks if coordinates fall within physical Earth latitude/longitude limits.
     */
    fun isValidCoordinate(latitude: Double, longitude: Double): Boolean {
        return latitude in -90.0..90.0 && longitude in -180.0..180.0
    }

    /**
     * Calculates speed in m/s between two timestamped points.
     * Returns true if speed exceeds realistic human vehicular limits (e.g., 200 m/s = 720 km/h).
     */
    fun isImpossibleMovement(
        lat1: Double, lon1: Double, time1Millis: Long,
        lat2: Double, lon2: Double, time2Millis: Long,
        maxSpeedMps: Double = 150.0 // ~540 km/h
    ): Boolean {
        val timeDeltaSec = (time2Millis - time1Millis) / 1000.0
        if (timeDeltaSec <= 0) return false

        val distanceMeters = calculateHaversineDistance(lat1, lon1, lat2, lon2)
        val calculatedSpeed = distanceMeters / timeDeltaSec
        return calculatedSpeed > maxSpeedMps
    }

    /**
     * Haversine formula for distance between two points in meters.
     */
    fun calculateHaversineDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Double {
        val earthRadius = 6371000.0 // meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return earthRadius * c
    }
}
