# FieldTrack Android App

Native Android employee app for secure attendance and GPS tracking.

## Tech Stack
- Kotlin + Jetpack Compose
- Fused Location Provider
- Foreground Service for GPS tracking
- Room database for offline storage
- WorkManager for synchronization
- Play Integrity API
- Android Keystore

## Setup

1. Open this directory in Android Studio
2. Add `local.properties`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
3. Build and run on a real device (emulator GPS is unreliable)

## Features
- Employee login
- Device registration
- Check-in / Check-out
- Background GPS tracking during active sessions
- Offline location queue with auto-sync
- Mock location detection
- Play Integrity verification
- Attendance history
- Privacy policy in-app

## Permissions
- `ACCESS_FINE_LOCATION` — precise GPS
- `ACCESS_COARSE_LOCATION` — fallback
- `FOREGROUND_SERVICE` — tracking notification
- `FOREGROUND_SERVICE_LOCATION` — location service type
- `POST_NOTIFICATIONS` — tracking notification (Android 13+)

Background location is NOT requested. Tracking uses a foreground service only during active work sessions.
