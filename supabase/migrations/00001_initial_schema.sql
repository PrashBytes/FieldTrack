-- ==============================================================================
-- FieldTrack Enterprise Migration: 00001_initial_schema.sql
-- Multi-Tenant GPS Tracking & Employee Attendance Platform
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. IMMUTABILITY TRIGGER FOR LOCATION POINTS
CREATE OR REPLACE FUNCTION prevent_location_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Location points are immutable audit records and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. TABLE DEFINITIONS
-- ==============================================================================

-- 4.1 ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 PROFILES (references auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE' CHECK (upper(role) IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  employee_code TEXT,
  email TEXT,
  phone TEXT,
  department TEXT NOT NULL DEFAULT 'Operations',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (upper(status) IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_LEAVE', 'TERMINATED')),
  employment_status TEXT GENERATED ALWAYS AS (status) STORED,
  account_status TEXT GENERATED ALWAYS AS (status) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.4 DEVICES
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_identifier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (upper(status) IN ('ACTIVE', 'PENDING', 'REVOKED')),
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_employee_device UNIQUE (employee_id, device_identifier)
);

-- 4.5 ATTENDANCE SESSIONS
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  check_in_location geometry(Point, 4326),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (upper(status) IN ('ACTIVE', 'COMPLETED', 'AUTO_COMPLETED', 'CANCELLED')),
  check_in_at TIMESTAMPTZ GENERATED ALWAYS AS (check_in_time) STORED,
  check_out_at TIMESTAMPTZ GENERATED ALWAYS AS (check_out_time) STORED,
  attendance_status TEXT GENERATED ALWAYS AS (status) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce maximum of ONE active attendance session per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_attendance_session
  ON attendance_sessions(employee_id)
  WHERE upper(status) = 'ACTIVE';

-- 4.6 LOCATION POINTS (Immutable GPS Tracking Points)
CREATE TABLE IF NOT EXISTS location_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coordinates geometry(Point, 4326) NOT NULL,
  location geometry(Point, 4326) GENERATED ALWAYS AS (coordinates) STORED,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  is_mock BOOLEAN NOT NULL DEFAULT false,
  idempotency_key TEXT UNIQUE,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.7 FRAUD EVENTS
CREATE TABLE IF NOT EXISTS fraud_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (upper(severity) IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (upper(status) IN ('PENDING', 'REVIEWED', 'DISMISSED', 'CONFIRMED')),
  review_status TEXT GENERATED ALWAYS AS (status) STORED,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.8 GEOFENCES (Auxiliary tenant table)
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'office' CHECK (type IN ('office', 'field_site', 'restricted_zone')),
  center geometry(Point, 4326) NOT NULL,
  radius_meters DOUBLE PRECISION NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.9 AUDIT LOGS (Auxiliary security table)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. INDEXES (Tenancy, Performance & Geospatial GIST)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_devices_org ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_employee ON devices(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_sessions(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance_sessions(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_location ON attendance_sessions USING GIST(check_in_location);

CREATE INDEX IF NOT EXISTS idx_location_points_org ON location_points(organization_id);
CREATE INDEX IF NOT EXISTS idx_location_points_session ON location_points(session_id);
CREATE INDEX IF NOT EXISTS idx_location_points_employee ON location_points(employee_id);
CREATE INDEX IF NOT EXISTS idx_location_points_captured_at ON location_points(captured_at);
CREATE INDEX IF NOT EXISTS idx_location_points_coordinates ON location_points USING GIST(coordinates);

CREATE INDEX IF NOT EXISTS idx_fraud_events_org ON fraud_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_events_employee ON fraud_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_fraud_events_status ON fraud_events(status);
CREATE INDEX IF NOT EXISTS idx_geofences_org ON geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_center ON geofences USING GIST(center);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);

-- ==============================================================================
-- 6. TRIGGERS (Updated_at and Immutability)
-- ==============================================================================

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_attendance_sessions_updated_at BEFORE UPDATE ON attendance_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_fraud_events_updated_at BEFORE UPDATE ON fraud_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enforce location_points immutability trigger
CREATE TRIGGER trg_location_points_immutable BEFORE UPDATE OR DELETE ON location_points FOR EACH ROW EXECUTE FUNCTION prevent_location_modification();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT upper(role) FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM employees WHERE profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND upper(role) = 'SUPER_ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION is_org_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
      AND upper(role) IN ('COMPANY_ADMIN', 'SUPER_ADMIN')
  );
$$;

-- ==============================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 9. STRICT RLS POLICIES
-- ==============================================================================

-- 9.1 ORGANIZATIONS
CREATE POLICY org_select ON organizations
  FOR SELECT USING (
    id = current_user_org_id() OR is_super_admin()
  );

CREATE POLICY org_update ON organizations
  FOR UPDATE USING (
    (id = current_user_org_id() AND is_org_admin()) OR is_super_admin()
  );

-- 9.2 PROFILES
-- COMPANY_ADMIN/MANAGER can read all profiles in their org; EMPLOYEE can read only their own profile
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
    OR id = auth.uid()
  );

CREATE POLICY profiles_insert ON profiles
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
    OR id = auth.uid()
  );

CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
    OR id = auth.uid()
  );

-- 9.3 EMPLOYEES
-- COMPANY_ADMIN/MANAGER can read all employees in their org; EMPLOYEE can read only their own
CREATE POLICY employees_select ON employees
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
    OR profile_id = auth.uid()
  );

CREATE POLICY employees_admin_all ON employees
  FOR ALL USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
  );

-- 9.4 DEVICES
-- COMPANY_ADMIN can manage all devices in their org; EMPLOYEE can view their own device
CREATE POLICY devices_select ON devices
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
    OR employee_id = current_employee_id()
  );

CREATE POLICY devices_admin_all ON devices
  FOR ALL USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
  );

-- 9.5 ATTENDANCE SESSIONS
-- COMPANY_ADMIN can read/write for their org; EMPLOYEE can read and check in/out for themselves
CREATE POLICY attendance_sessions_select ON attendance_sessions
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
    OR employee_id = current_employee_id()
  );

CREATE POLICY attendance_sessions_insert ON attendance_sessions
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
    OR (employee_id = current_employee_id() AND organization_id = current_user_org_id())
  );

CREATE POLICY attendance_sessions_update ON attendance_sessions
  FOR UPDATE USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
    OR (employee_id = current_employee_id() AND organization_id = current_user_org_id())
  );

-- 9.6 LOCATION POINTS (Append-only & Tamper-resistant)
-- COMPANY_ADMIN can view all points for their org; EMPLOYEE can view only their own points
CREATE POLICY location_points_select ON location_points
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
    OR employee_id = current_employee_id()
  );

CREATE POLICY location_points_insert ON location_points
  FOR INSERT WITH CHECK (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
    OR (employee_id = current_employee_id() AND organization_id = current_user_org_id())
  );

-- Strictly IMMUTABLE: no user can UPDATE or DELETE location points once written
CREATE POLICY location_points_no_update ON location_points
  FOR UPDATE USING (false);

CREATE POLICY location_points_no_delete ON location_points
  FOR DELETE USING (false);

-- 9.7 FRAUD EVENTS
-- Only COMPANY_ADMIN and MANAGERS can read fraud events; COMPANY_ADMIN can update status
CREATE POLICY fraud_events_select ON fraud_events
  FOR SELECT USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND current_user_role() IN ('COMPANY_ADMIN', 'MANAGER'))
  );

CREATE POLICY fraud_events_admin_all ON fraud_events
  FOR ALL USING (
    is_super_admin()
    OR (organization_id = current_user_org_id() AND is_org_admin())
  );

-- 9.8 GEOFENCES & AUDIT LOGS
CREATE POLICY geofences_select ON geofences
  FOR SELECT USING (
    is_super_admin() OR organization_id = current_user_org_id()
  );

CREATE POLICY geofences_admin_all ON geofences
  FOR ALL USING (
    is_super_admin() OR (organization_id = current_user_org_id() AND is_org_admin())
  );

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (
    is_super_admin() OR (organization_id = current_user_org_id() AND is_org_admin())
  );

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (
    is_super_admin() OR organization_id = current_user_org_id()
  );
