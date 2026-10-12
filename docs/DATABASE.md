# FieldTrack — Database Schema

## Overview

PostgreSQL with PostGIS extension. All tables use UUID primary keys, timestamptz for timestamps, and RLS for access control.

## Tables

### organizations
Top-level tenant entities. Each company is an organization.
- `id`, `name`, `slug`, `timezone`, `workweek`
- `attendance_policy` (JSONB): require_geofence, require_photo, grace_minutes
- `location_sampling_policy` (JSONB): target/min/max/stationary intervals
- `data_retention_days`, `privacy_contact`

### profiles
Links `auth.users` to an organization and role.
- `id` (= auth.uid()), `organization_id`, `email`, `full_name`
- `role`: super_admin | company_admin | manager | employee
- `is_active`

### departments
Organization-scoped departments.
- `id`, `organization_id`, `name`, `description`, `is_active`

### teams
Teams within departments.
- `id`, `organization_id`, `department_id`, `name`, `is_active`

### manager_team_assignments
Many-to-many between managers (profiles) and teams.
- `manager_id`, `team_id` (unique pair)

### shifts
Work shift definitions.
- `id`, `organization_id`, `name`, `start_time`, `end_time`, `grace_minutes`

### employees
Employee records linked to profiles, departments, teams, shifts.
- `id`, `organization_id`, `profile_id`, `employee_code` (unique per org)
- `employment_status`: active | on_leave | terminated | suspended
- `account_status`: pending | active | disabled

### devices
Registered devices for employees (device binding).
- `id`, `organization_id`, `employee_id`, `device_identifier`
- `play_integrity_status`: verified | failed | unknown | not_checked
- `is_active`, `registered_at`, `revoked_at`, `last_seen_at`

### geofences
Geographic boundaries for attendance validation.
- `id`, `organization_id`, `name`, `type` (office/field_site/restricted_zone)
- `center` (geography Point 4326), `radius_meters`, `is_active`

### attendance_sessions
Check-in/check-out records per employee per day.
- `id`, `organization_id`, `employee_id`, `device_id`, `shift_id`
- `check_in_at`, `check_out_at`, `check_in_location`, `check_out_location`
- `integrity_status`: trusted | review_required | high_risk | unverified
- `attendance_status`: active | completed | auto_completed | cancelled
- `review_status`: pending | reviewed | flagged | resolved
- **Unique constraint**: one active session per employee (partial unique index)

### location_sessions
Active tracking session tied to an attendance session.
- `id`, `organization_id`, `employee_id`, `attendance_session_id`
- `started_at`, `ended_at`, `status`: active | ended | interrupted | failed
- `total_points`, `total_distance_meters`

### location_points
Individual GPS points. High-volume table.
- `id`, `organization_id`, `employee_id`, `location_session_id`
- `location` (geography Point 4326), `accuracy`, `altitude`, `speed`, `bearing`
- `is_mock`, `captured_at`, `server_received_at`, `monotonic_elapsed_ms`
- `idempotency_key` (unique per org — prevents duplicates)
- `trust_status`: trusted | review_required | high_risk | unverified
- `evidence` (JSONB)
- **Indexes**: organization, employee, session, captured_at, GiST on location

### fraud_events
Detected anomalies with review workflow.
- `id`, `organization_id`, `employee_id`, `device_id`
- `event_type`: mock_location_signal | integrity_verification_failed | impossible_movement | timestamp_inconsistency | location_jump | device_mismatch | tracking_gap | unusual_location_pattern
- `severity`: low | medium | high | critical
- `evidence` (JSONB), `review_status`, `reviewer_id`, `resolution_reason`

### attendance_corrections
Correction requests and approvals.
- `id`, `organization_id`, `attendance_session_id`, `employee_id`
- `request_type`: check_in_time | check_out_time | missing_check_out | location | status
- `original_value`, `requested_value`, `reason`
- `status`: pending | approved | rejected
- `reviewed_by`, `review_reason`

### audit_logs
Append-only security-sensitive action records.
- `id`, `organization_id`, `actor_id`, `actor_email`
- `action`, `target_type`, `target_id`, `metadata` (JSONB)
- `reason`, `ip_address`, `user_agent`

### notification_preferences
Per-user notification settings.
- `id`, `organization_id`, `profile_id`
- Boolean flags for each notification type

## RLS Strategy

- Every table has RLS enabled
- `get_current_org_id()` helper returns the current user's org
- `is_admin()` and `is_super_admin()` helpers for role checks
- Organization isolation: `organization_id = get_current_org_id()`
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)

## Retention Strategy

- `location_points` is the highest-volume table
- Configurable retention via `organizations.data_retention_days`
- Future: partition `location_points` by `captured_at` for scale
- Audit logs retained longer for compliance
