/*
# FieldTrack Core Schema - Organizations, Profiles, Employees, Departments, Teams

1. New Tables
- `organizations`: Top-level tenant entities (companies). Each org is isolated.
- `profiles`: Links auth.users to an organization and role (super_admin, company_admin, manager, employee).
- `departments`: Departments within an organization.
- `teams`: Teams within a department.
- `manager_team_assignments`: Many-to-many between managers (profiles) and teams.
- `employees`: Employee records linked to profiles, departments, teams, shifts.
- `shifts`: Work shift definitions (start time, end time, grace period).
- `devices`: Registered devices for employees (device binding).
- `geofences`: Geographic fences for attendance validation.

2. Security
- RLS enabled on ALL tables.
- Policies enforce organization isolation via profile lookup.
- Only authenticated users can access data.
- Users can only see data within their own organization.
- Super admins can see all organizations.
- Managers can only see employees in their assigned teams.

3. Important Notes
- Uses UUID primary keys throughout.
- Uses timestamptz for all timestamps.
- Uses PostGIS geography(Point, 4326) for geofence centers.
- organization_id on all tenant-scoped tables for isolation.
- Employee codes are unique per organization.
- At most one active attendance session per employee (enforced later).
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  workweek text[] NOT NULL DEFAULT '{"mon","tue","wed","thu","fri"}',
  default_shift_id uuid,
  default_geofence_id uuid,
  attendance_policy jsonb NOT NULL DEFAULT '{"require_geofence": false, "require_photo": false, "grace_minutes": 15}'::jsonb,
  location_sampling_policy jsonb NOT NULL DEFAULT '{"target_interval_seconds": 30, "min_interval_seconds": 15, "max_interval_seconds": 120, "stationary_interval_seconds": 60}'::jsonb,
  data_retention_days integer NOT NULL DEFAULT 90,
  privacy_contact text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PROFILES (links auth.users to org + role)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'company_admin', 'manager', 'employee')),
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SHIFTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Update organizations to reference shifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organizations_default_shift_id_fkey'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT organizations_default_shift_id_fkey
    FOREIGN KEY (default_shift_id) REFERENCES shifts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MANAGER TEAM ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS manager_team_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(manager_id, team_id)
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  employee_code text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  employment_status text NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'on_leave', 'terminated', 'suspended')),
  account_status text NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'disabled')),
  designation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, employee_code)
);

-- ============================================================
-- DEVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  device_identifier text NOT NULL,
  device_name text,
  platform text DEFAULT 'android',
  os_version text,
  app_version text,
  play_integrity_status text DEFAULT 'unknown' CHECK (play_integrity_status IN ('verified', 'failed', 'unknown', 'not_checked')),
  is_active boolean NOT NULL DEFAULT true,
  registered_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GEOFENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS geofences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'office' CHECK (type IN ('office', 'field_site', 'restricted_zone')),
  center geography(Point, 4326) NOT NULL,
  radius_meters integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Update organizations to reference geofences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'organizations_default_geofence_id_fkey'
  ) THEN
    ALTER TABLE organizations
    ADD CONSTRAINT organizations_default_geofence_id_fkey
    FOREIGN KEY (default_geofence_id) REFERENCES geofences(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_departments_organization ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_organization ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_manager ON manager_team_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_assignments_team ON manager_team_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_organization ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_profile ON employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_team ON employees(team_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_shift ON employees(shift_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status, account_status);
CREATE INDEX IF NOT EXISTS idx_devices_organization ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_employee ON devices(employee_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_geofences_organization ON geofences(organization_id);
CREATE INDEX IF NOT EXISTS idx_geofences_active ON geofences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shifts_organization ON shifts(organization_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
-- Get the organization_id of the current authenticated user
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS uuid AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id FROM profiles WHERE id = auth.uid();
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is a super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is company_admin or super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'company_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_current_role()
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = auth.uid();
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS: ORGANIZATIONS
-- ============================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select" ON organizations;
CREATE POLICY "org_select" ON organizations FOR SELECT
  TO authenticated USING (
    id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "org_update" ON organizations;
CREATE POLICY "org_update" ON organizations FOR UPDATE
  TO authenticated USING (
    (id = get_current_org_id() AND is_admin()) OR is_super_admin()
  ) WITH CHECK (
    (id = get_current_org_id() AND is_admin()) OR is_super_admin()
  );

-- ============================================================
-- RLS: PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (
    id = auth.uid()
    OR (organization_id = get_current_org_id() AND is_admin())
  ) WITH CHECK (
    id = auth.uid()
    OR (organization_id = get_current_org_id() AND is_admin())
  );

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: SHIFTS
-- ============================================================
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shifts_select" ON shifts;
CREATE POLICY "shifts_select" ON shifts FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "shifts_insert" ON shifts;
CREATE POLICY "shifts_insert" ON shifts FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "shifts_update" ON shifts;
CREATE POLICY "shifts_update" ON shifts FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "shifts_delete" ON shifts;
CREATE POLICY "shifts_delete" ON shifts FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: DEPARTMENTS
-- ============================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "depts_select" ON departments;
CREATE POLICY "depts_select" ON departments FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "depts_insert" ON departments;
CREATE POLICY "depts_insert" ON departments FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "depts_update" ON departments;
CREATE POLICY "depts_update" ON departments FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "depts_delete" ON departments;
CREATE POLICY "depts_delete" ON departments FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: TEAMS
-- ============================================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "teams_insert" ON teams;
CREATE POLICY "teams_insert" ON teams FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "teams_update" ON teams;
CREATE POLICY "teams_update" ON teams FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "teams_delete" ON teams;
CREATE POLICY "teams_delete" ON teams FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: MANAGER_TEAM_ASSIGNMENTS
-- ============================================================
ALTER TABLE manager_team_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mta_select" ON manager_team_assignments;
CREATE POLICY "mta_select" ON manager_team_assignments FOR SELECT
  TO authenticated USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = manager_team_assignments.team_id
      AND t.organization_id = get_current_org_id()
    ) OR is_super_admin()
  );

DROP POLICY IF EXISTS "mta_insert" ON manager_team_assignments;
CREATE POLICY "mta_insert" ON manager_team_assignments FOR INSERT
  TO authenticated WITH CHECK (
    is_admin()
  );

DROP POLICY IF EXISTS "mta_delete" ON manager_team_assignments;
CREATE POLICY "mta_delete" ON manager_team_assignments FOR DELETE
  TO authenticated USING (
    is_admin()
  );

-- ============================================================
-- RLS: EMPLOYEES
-- ============================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "emp_select" ON employees;
CREATE POLICY "emp_select" ON employees FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "emp_insert" ON employees;
CREATE POLICY "emp_insert" ON employees FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "emp_update" ON employees;
CREATE POLICY "emp_update" ON employees FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "emp_delete" ON employees;
CREATE POLICY "emp_delete" ON employees FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: DEVICES
-- ============================================================
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_select" ON devices;
CREATE POLICY "dev_select" ON devices FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "dev_insert" ON devices;
CREATE POLICY "dev_insert" ON devices FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id()
  );

DROP POLICY IF EXISTS "dev_update" ON devices;
CREATE POLICY "dev_update" ON devices FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "dev_delete" ON devices;
CREATE POLICY "dev_delete" ON devices FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- RLS: GEOFENCES
-- ============================================================
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "geo_select" ON geofences;
CREATE POLICY "geo_select" ON geofences FOR SELECT
  TO authenticated USING (
    organization_id = get_current_org_id() OR is_super_admin()
  );

DROP POLICY IF EXISTS "geo_insert" ON geofences;
CREATE POLICY "geo_insert" ON geofences FOR INSERT
  TO authenticated WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "geo_update" ON geofences;
CREATE POLICY "geo_update" ON geofences FOR UPDATE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  ) WITH CHECK (
    organization_id = get_current_org_id() AND is_admin()
  );

DROP POLICY IF EXISTS "geo_delete" ON geofences;
CREATE POLICY "geo_delete" ON geofences FOR DELETE
  TO authenticated USING (
    organization_id = get_current_org_id() AND is_admin()
  );

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['organizations', 'profiles', 'departments', 'teams', 'employees', 'devices', 'geofences', 'shifts'])
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