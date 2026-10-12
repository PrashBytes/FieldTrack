# FieldTrack — Architecture

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Admin Web      │     │  Android App     │     │  Supabase       │
│  (Next.js)      │     │  (Kotlin/Compose)│     │  (PostgreSQL    │
│                 │     │                  │     │   + PostGIS)    │
│  - Dashboard    │     │  - Login         │     │                 │
│  - Employee Mgmt│     │  - Check In/Out  │     │  - RLS Policies │
│  - Live Map     │     │  - GPS Tracking  │     │  - Edge Funcs   │
│  - Reports      │     │  - Offline Queue │     │  - Auth         │
│  - Fraud Review │     │  - Integrity     │     │  - Realtime     │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                         │
         └───────────────────────┴─────────────────────────┘
                    Supabase REST/Realtime API
```

## Components

### Admin Web (Next.js App Router)
- **Auth**: Supabase Auth, session-based, middleware-protected routes
- **State**: React hooks + Supabase client (TanStack Query available)
- **Maps**: Leaflet with OpenStreetMap tiles
- **UI**: shadcn/ui, Tailwind CSS, Lucide icons

### Android App (Kotlin + Jetpack Compose)
- **Auth**: Supabase Auth via REST
- **Location**: Fused Location Provider in foreground service
- **Offline**: Room database, WorkManager for sync
- **Integrity**: Play Integrity API, Android Keystore

### Backend (Supabase)
- **Database**: PostgreSQL with PostGIS for geospatial queries
- **Auth**: Supabase Auth (email/password)
- **Edge Functions**: Server-side privileged operations
  - `attendance-check-in`: Validates and creates attendance sessions
  - `attendance-check-out`: Closes sessions transactionally
  - `location-ingest`: Batch location ingestion with idempotency
  - `integrity-verify`: Play Integrity token verification
- **RLS**: Organization-scoped policies on every table

## Data Flow

### Check-in Flow
1. Employee authenticates on Android
2. App requests GPS location
3. App submits to `attendance-check-in` edge function
4. Function validates: auth, org membership, device, no existing session
5. Creates attendance_session + location_session
6. Returns session IDs to app
7. App starts foreground tracking service

### Location Ingestion Flow
1. Foreground service collects GPS points per sampling policy
2. Points stored in Room database (offline)
3. WorkManager syncs batches to `location-ingest` edge function
4. Function validates: auth, session active, coordinates, idempotency
5. Inserts location_points with trust status
6. Creates fraud_events for anomalies
7. Returns accepted/rejected IDs
8. App marks synced records in Room

### Live Tracking Flow
1. Admin opens live tracking page
2. Web queries active attendance sessions + latest location points
3. Map renders markers with color-coded trust status
4. Admin can select employees to focus

## Security Boundaries

- Browser never sees service-role keys
- Android never sees service-role keys
- All privileged operations go through edge functions
- RLS enforces organization isolation on every table
- Server generates all authoritative timestamps
- Client-supplied employee IDs, roles, org IDs are never trusted
