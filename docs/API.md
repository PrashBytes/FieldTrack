# FieldTrack — API Reference

## Authentication

All API calls require a valid Supabase Auth JWT token in the `Authorization: Bearer <token>` header.

## Edge Functions

### POST /functions/v1/attendance-check-in

Creates a new attendance session and starts tracking.

**Request:**
```json
{
  "employee_id": "uuid",
  "device_id": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 5.0,
  "is_mock": false,
  "integrity_token": "optional"
}
```

**Response (200):**
```json
{
  "success": true,
  "session_id": "uuid",
  "location_session_id": "uuid",
  "check_in_at": "ISO timestamp",
  "integrity_status": "trusted"
}
```

**Errors:** 401 (invalid token), 403 (not active), 409 (active session exists)

---

### POST /functions/v1/attendance-check-out

Closes an active attendance session.

**Request:**
```json
{
  "session_id": "uuid",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 5.0,
  "is_mock": false
}
```

**Response (200):**
```json
{
  "success": true,
  "check_out_at": "ISO timestamp"
}
```

---

### POST /functions/v1/location-ingest

Batch upload of GPS location points.

**Request:**
```json
{
  "session_id": "uuid",
  "location_session_id": "uuid",
  "device_id": "uuid",
  "employee_id": "uuid",
  "points": [
    {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "accuracy": 5.0,
      "altitude": 900.0,
      "speed": 0.0,
      "bearing": 180.0,
      "provider": "fused",
      "is_mock": false,
      "captured_at": "ISO timestamp",
      "monotonic_elapsed_ms": 12345,
      "idempotency_key": "unique-key"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "accepted": 1,
  "rejected": 0,
  "accepted_ids": ["uuid"],
  "rejected_ids": []
}
```

**Limits:** Max 200 points per batch. Duplicate idempotency keys are silently skipped.

---

### POST /functions/v1/integrity-verify

Verifies device integrity via Play Integrity token.

**Request:**
```json
{
  "device_id": "uuid",
  "integrity_token": "play-integrity-token",
  "request_hash": "optional-binding-hash"
}
```

**Response (200):**
```json
{
  "success": true,
  "integrity_status": "verified",
  "evidence": { "token_provided": true, "verified_at": "ISO timestamp" }
}
```

## Database (Direct Supabase Client)

The admin web app uses the Supabase JS client directly for reads (dashboard, employee lists, attendance, etc.). RLS policies enforce access control. All writes to sensitive tables go through edge functions.

## CORS

All edge function responses include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey
```
