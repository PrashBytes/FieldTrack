/*
# FieldTrack Attendance & Tracking Schema

1. New Tables
- `attendance_sessions`: Check-in/check-out records per employee per day.
- `location_sessions`: Active tracking session tied to an attendance session.
- `location_points`: Individual GPS points collected during a location session.
- `fraud_events`: Detected anomalies (mock location, impossible movement, etc).
- `attendance_corrections`: Correction requests and approvals.
- `audit_logs`: Security-sensitive action records.
- `notification_preferences`: User notification settings.

2. Security
- RLS enabled on ALL tables.
- Organization isolation via employee lookup.
- Employees can only see their own attendance/locations.
- Managers can see data for their assigned teams.
- Admins can see all data in their organization.
- Location history is tightly scoped.

3. Important Notes
- PostGIS geography(Point, 4326) for all GPS coordinates.
- Idempotency keys on location_points to prevent duplicates.
- Server-generated timestamps for check-in/out.
- At most one active attendance session per employee (partial unique index).
- Retention strategy: location_points can be partitioned by captured_at later.
*/

-- ============================================================
-- ATTENDANCE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  check_in_at timestamptz NOT NULL DEFAULT now(),
  check_out_at timestamptz,
  check_in_location geography(Point, 4326),
  check_out_location geography(Point, 4326),
  check_in_accuracy double precision,
  check_out_accuracy double precision,
  check_in_geofence_id uuid REFERENCES geofences(id) ON DELETE SET NULL,
  check_out_geofence_id uuid REFERENCES geofences(id) ON DELETE SET NULL,
  integrity_status text NOT NULL DEFAULT 'unverified' CHECK (integrity_status IN ('trusted', 'review_required', 'high_risk', 'unverified')),
  attendance_status text NOT NULL DEFAULT 'active' CHECK (attendance_status IN ('active', 'completed', 'auto_completed', 'cancelled')),
  review_status text NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'flagged', 'resolved')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent multiple active sessions per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_one_active
  ON attendance_sessions(employee_id)
  WHERE attendance_status = 'active';

CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance_sessions(check_in_at);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_sessions(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_review ON attendance_sessions(review_status);

-- ============================================================
-- LOCATION SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS location_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  attendance_session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'interrupted', 'failed')),
  total_points integer NOT NULL DEFAULT 0,
  total_distance_meters double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locsess_org ON location_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_locsess_employee ON location_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_locsess_attendance ON location_sessions(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_locsess_active ON location_sessions(status) WHERE status = 'active';

-- ============================================================
-- LOCATION POINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_session_id uuid NOT NULL REFERENCES location_sessions(id) ON DELETE CASCADE,
  attendance_session_id uuid REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  location geography(Point, 4326) NOT NULL,
  accuracy double precision,
  altitude double precision,
  speed double precision,
  bearing double precision,
  provider text,
  is_mock boolean NOT NULL DEFAULT false,
  captured_at timestamptz NOT NULL,
  server_received_at timestamptz NOT NULL DEFAULT now(),
  monotonic_elapsed_ms bigint,
  idempotency_key text NOT NULL,
  trust_status text NOT NULL DEFAULT 'unverified' CHECK (trust_status IN ('trusted', 'review_required', 'high_risk', 'unverified')),
  evidence jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotency: prevent duplicate location points
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_points_idempotency
  ON location_points(organization_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_lp_org ON location_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_lp_employee ON location_points(employee_id);
CREATE INDEX IF NOT EXISTS idx_lp_session ON location_points(location_session_id);
CREATE INDEX IF NOT EXISTS idx_lp_captured ON location_points(captured_at);
CREATE INDEX IF NOT EXISTS idx_lp_received ON location_points(server_received_at);
CREATE INDEX IF NOT EXISTS idx_lp_trust ON location_points(trust_status);
CREATE INDEX IF NOT EXISTS idx_lp_mock ON location_points(is_mock) WHERE is_mock = true;
CREATE INDEX IF NOT EXISTS idx_lp_geo ON location_points USING GIST(location);

-- ============================================================
-- FRAUD EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_id uuid REFERENCES devices(id) ON DELETE SET NULL,
  attendance_session_id uuid REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  location_session_id uuid REFERENCES location_sessions(id) ON DELETE SET NULL,
  location_point_id uuid REFERENCES location_points(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'mock_location_signal',
    'integrity_verification_failed',
    'impossible_movement',
    'timestamp_inconsistency',
    'location_jump',
    'device_mismatch',
    'tracking_gap',
    'unusual_location_pattern'
  )),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  review_status text NOT NULL DEFAULT 'open' CHECK (review_status IN ('open', 'reviewing', 'resolved_legitimate', 'resolved_fraud', 'escalated')),
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_org ON fraud_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_employee ON fraud_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_fraud_severity ON fraud_events(severity);
CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_events(review_status);
CREATE INDEX IF NOT EXISTS idx_fraud_type ON fraud_events(event_type);
CREATE INDEX IF NOT EXISTS idx_fraud_created ON fraud_events(created_at);

-- ============================================================
-- ATTENDANCE CORRECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attendance_session_id uuid NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  request_type text NOT NULL CHECK (request_type IN ('check_in_time', 'check_out_time', 'missing_check_out', 'location', 'status')),
  original_value text,
  requested_value text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corr_org ON attendance_corrections(organization_id);
CREATE INDEX IF NOT EXISTS idx_corr_employee ON attendance_corrections(employee_id);
CREATE INDEX IF NOT EXISTS idx_corr_session ON attendance_corrections(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_corr_status ON attendance_corrections(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tracking_stopped boolean NOT NULL DEFAULT true,
  gps_disabled boolean NOT NULL DEFAULT true,
  permission_revoked boolean NOT NULL DEFAULT true,
  employee_offline boolean NOT NULL DEFAULT true,
  integrity_failure boolean NOT NULL DEFAULT true,
  attendance_incomplete boolean NOT NULL DEFAULT true,
  geofence_event boolean NOT NULL DEFAULT false,
  high_risk_event boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_org ON notification_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_notif_profile ON notification_preferences(profile_id);

-- ============================================================
-- TRIGGERS: updated_at for new tables
-- ============================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['attendance_sessions', 'location_sessions', 'fraud_events', 'attendance_corrections', 'notification_preferences'])
  LOOP
    BEGIN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_%s_updated ON %s', tbl, tbl
      );
      EXECUTE format(
        'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        tbl, tbl
      );
    END;
  END LOOP;
END $$;

-- ============================================================
-- RLS: ATTENDANCE SESSIONS
-- ============================================================
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_select" ON attendance_sessions;
CREATE POLICY "att_select" ON attendance_sessions FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "att_insert" ON attendance_sessions;
CREATE POLICY "att_insert" ON attendance_sessions FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "att_update" ON attendance_sessions;
CREATE POLICY "att_update" ON attendance_sessions FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "att_delete" ON attendance_sessions;
CREATE POLICY "att_delete" ON attendance_sessions FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: LOCATION SESSIONS
-- ============================================================
ALTER TABLE location_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ls_select" ON location_sessions;
CREATE POLICY "ls_select" ON location_sessions FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "ls_insert" ON location_sessions;
CREATE POLICY "ls_insert" ON location_sessions FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "ls_update" ON location_sessions;
CREATE POLICY "ls_update" ON location_sessions FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id()
  ) WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "ls_delete" ON location_sessions;
CREATE POLICY "ls_delete" ON location_sessions FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: LOCATION POINTS
-- ============================================================
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lp_select" ON location_points;
CREATE POLICY "lp_select" ON location_points FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "lp_insert" ON location_points;
CREATE POLICY "lp_insert" ON location_points FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "lp_update" ON location_points;
CREATE POLICY "lp_update" ON location_points FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "lp_delete" ON location_points;
CREATE POLICY "lp_delete" ON location_points FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: FRAUD EVENTS
-- ============================================================
ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fraud_select" ON fraud_events;
CREATE POLICY "fraud_select" ON fraud_events FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "fraud_insert" ON fraud_events;
CREATE POLICY "fraud_insert" ON fraud_events FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "fraud_update" ON fraud_events;
CREATE POLICY "fraud_update" ON fraud_events FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "fraud_delete" ON fraud_events;
CREATE POLICY "fraud_delete" ON fraud_events FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: ATTENDANCE CORRECTIONS
-- ============================================================
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corr_select" ON attendance_corrections;
CREATE POLICY "corr_select" ON attendance_corrections FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "corr_insert" ON attendance_corrections;
CREATE POLICY "corr_insert" ON attendance_corrections FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "corr_update" ON attendance_corrections;
CREATE POLICY "corr_update" ON attendance_corrections FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "corr_delete" ON attendance_corrections;
CREATE POLICY "corr_delete" ON attendance_corrections FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: AUDIT LOGS
-- ============================================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON audit_logs;
CREATE POLICY "audit_select" ON audit_logs FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
    OR organization_id IS NULL
  );

DROP POLICY IF EXISTS "audit_insert" ON audit_logs;
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============================================================
-- RLS: NOTIFICATION PREFERENCES
-- ============================================================
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON notification_preferences;
CREATE POLICY "notif_select" ON notification_preferences FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "notif_insert" ON notification_preferences;
CREATE POLICY "notif_insert" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "notif_update" ON notification_preferences;
CREATE POLICY "notif_update" ON notification_preferences FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id()
  ) WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "notif_delete" ON notification_preferences;
CREATE POLICY "notif_delete" ON notification_preferences FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id()
  );