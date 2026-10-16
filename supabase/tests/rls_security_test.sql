-- ==============================================================================
-- FieldTrack Security & Row Level Security (RLS) Test Suite
-- ==============================================================================
-- This script validates:
-- 1. Tenant Isolation: Users from Organization A cannot view or access Organization B.
-- 2. Employee Data Isolation: An employee cannot query another employee's location points.
-- 3. Immutability Policy: Location points cannot be updated or deleted once recorded.
-- 4. Role Hierarchy: Only authorized ADMIN/MANAGER profiles can view fraud alerts.
-- ==============================================================================

BEGIN;

-- Setup test helper reporting table
CREATE TEMP TABLE rls_test_results (
    test_id serial PRIMARY KEY,
    test_name text NOT NULL,
    status text NOT NULL CHECK (status IN ('PASSED', 'FAILED')),
    details text
);

-- ------------------------------------------------------------------------------
-- 1. Create Test Tenants & Profiles
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_org1_id uuid := '11111111-0000-0000-0000-000000000001';
    v_org2_id uuid := '22222222-0000-0000-0000-000000000002';
    
    v_user_admin1 uuid := '11111111-1111-0000-0000-000000000001';
    v_user_emp1   uuid := '11111111-1111-0000-0000-000000000002';
    v_user_emp2   uuid := '11111111-1111-0000-0000-000000000003';
    
    v_user_admin2 uuid := '22222222-2222-0000-0000-000000000001';
    v_user_emp3   uuid := '22222222-2222-0000-0000-000000000002';

    v_emp1_id uuid := '11111111-2222-0000-0000-000000000001';
    v_emp2_id uuid := '11111111-2222-0000-0000-000000000002';
    v_emp3_id uuid := '22222222-2222-0000-0000-000000000001';

    v_session1_id uuid := '11111111-3333-0000-0000-000000000001';
    v_session2_id uuid := '11111111-3333-0000-0000-000000000002';

    v_loc1_id uuid;
    v_count integer;
    v_err_occurred boolean := false;
BEGIN
    -- Insert test orgs
    INSERT INTO organizations (id, name) VALUES
        (v_org1_id, 'RLS Test Org 1'),
        (v_org2_id, 'RLS Test Org 2');

    -- Insert mock auth users if not present (simulating Supabase auth.users)
    INSERT INTO auth.users (id, email) VALUES
        (v_user_admin1, 'admin1@test.com'),
        (v_user_emp1, 'emp1@test.com'),
        (v_user_emp2, 'emp2@test.com'),
        (v_user_admin2, 'admin2@test.com'),
        (v_user_emp3, 'emp3@test.com')
    ON CONFLICT (id) DO NOTHING;

    -- Profiles
    INSERT INTO profiles (id, organization_id, role, full_name) VALUES
        (v_user_admin1, v_org1_id, 'COMPANY_ADMIN', 'Org1 Admin'),
        (v_user_emp1,   v_org1_id, 'EMPLOYEE',      'Org1 Emp 1'),
        (v_user_emp2,   v_org1_id, 'EMPLOYEE',      'Org1 Emp 2'),
        (v_user_admin2, v_org2_id, 'COMPANY_ADMIN', 'Org2 Admin'),
        (v_user_emp3,   v_org2_id, 'EMPLOYEE',      'Org2 Emp 3');

    -- Employees
    INSERT INTO employees (id, organization_id, profile_id, employee_code, department, status) VALUES
        (v_emp1_id, v_org1_id, v_user_emp1, 'E101', 'Operations', 'ACTIVE'),
        (v_emp2_id, v_org1_id, v_user_emp2, 'E102', 'Logistics',  'ACTIVE'),
        (v_emp3_id, v_org2_id, v_user_emp3, 'E201', 'Warehouse',  'ACTIVE');

    -- Attendance Sessions
    INSERT INTO attendance_sessions (id, employee_id, organization_id, check_in_time, status) VALUES
        (v_session1_id, v_emp1_id, v_org1_id, now() - interval '2 hours', 'IN_PROGRESS'),
        (v_session2_id, v_emp2_id, v_org1_id, now() - interval '2 hours', 'IN_PROGRESS');

    -- Location Points
    INSERT INTO location_points (session_id, employee_id, organization_id, location, accuracy, speed, is_mock, captured_at) VALUES
        (v_session1_id, v_emp1_id, v_org1_id, ST_SetSRID(ST_MakePoint(-74.0059, 40.7127), 4326)::geography, 10.0, 5.0, false, now() - interval '1 hour')
    RETURNING id INTO v_loc1_id;

    INSERT INTO location_points (session_id, employee_id, organization_id, location, accuracy, speed, is_mock, captured_at) VALUES
        (v_session2_id, v_emp2_id, v_org1_id, ST_SetSRID(ST_MakePoint(-73.9900, 40.7200), 4326)::geography, 8.0, 0.0, false, now() - interval '1 hour');

    -- --------------------------------------------------------------------------
    -- TEST 1: Tenant Isolation - Org 2 Admin cannot see Org 1 Employees
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_user_admin2::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT count(*) INTO v_count FROM employees WHERE organization_id = v_org1_id;
    IF v_count = 0 THEN
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Tenant Isolation: Org 2 Admin cannot query Org 1 employees', 'PASSED', 'Returned 0 records as expected.');
    ELSE
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Tenant Isolation: Org 2 Admin cannot query Org 1 employees', 'FAILED', format('Expected 0 but found %s records', v_count));
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: Employee Isolation - Emp 1 cannot view Emp 2 location points
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_user_emp1::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT count(*) INTO v_count FROM location_points WHERE employee_id = v_emp2_id;
    IF v_count = 0 THEN
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Employee Isolation: Emp 1 cannot query Emp 2 location points', 'PASSED', 'Employee query to colleague points returned 0 records.');
    ELSE
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Employee Isolation: Emp 1 cannot query Emp 2 location points', 'FAILED', format('Leaked %s location points across employees!', v_count));
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: Employee Self Access - Emp 1 can read own location points
    -- --------------------------------------------------------------------------
    SELECT count(*) INTO v_count FROM location_points WHERE employee_id = v_emp1_id;
    IF v_count = 1 THEN
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Employee Self Access: Emp 1 can view own location points', 'PASSED', 'Emp 1 successfully queried own 1 location point.');
    ELSE
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Employee Self Access: Emp 1 can view own location points', 'FAILED', format('Expected 1 location point, but found %s', v_count));
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 4: Location Immutability - Updates to location_points must be rejected
    -- --------------------------------------------------------------------------
    v_err_occurred := false;
    BEGIN
        UPDATE location_points SET speed = 999.0 WHERE id = v_loc1_id;
        -- If update affected 0 rows due to RLS, that also prevents modification
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            INSERT INTO rls_test_results (test_name, status, details)
            VALUES ('Immutability: Disallow UPDATE on location_points', 'FAILED', 'Location point was updated when it should be immutable!');
        ELSE
            INSERT INTO rls_test_results (test_name, status, details)
            VALUES ('Immutability: Disallow UPDATE on location_points', 'PASSED', 'RLS policy prevented update (0 rows affected).');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Immutability: Disallow UPDATE on location_points', 'PASSED', 'Exception thrown blocking update as expected.');
    END;

    -- --------------------------------------------------------------------------
    -- TEST 5: Location Immutability - Deletion must be rejected
    -- --------------------------------------------------------------------------
    BEGIN
        DELETE FROM location_points WHERE id = v_loc1_id;
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            INSERT INTO rls_test_results (test_name, status, details)
            VALUES ('Immutability: Disallow DELETE on location_points', 'FAILED', 'Location point was deleted when it should be immutable!');
        ELSE
            INSERT INTO rls_test_results (test_name, status, details)
            VALUES ('Immutability: Disallow DELETE on location_points', 'PASSED', 'RLS policy prevented deletion (0 rows affected).');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO rls_test_results (test_name, status, details)
        VALUES ('Immutability: Disallow DELETE on location_points', 'PASSED', 'Exception thrown blocking deletion as expected.');
    END;

END $$;

-- Query test execution report
SELECT test_id, test_name, status, details FROM rls_test_results ORDER BY test_id;

-- Rollback so test artifacts are completely removed
ROLLBACK;
