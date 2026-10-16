-- ==============================================================================
-- FieldTrack Enterprise Seed Data: supabase/seed.sql
-- Development and Integration Testing Mock Dataset
-- ==============================================================================

-- 1. DEMO ORGANIZATION
INSERT INTO public.organizations (
  id,
  name,
  settings,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Acme Logistics',
  '{"timezone": "Asia/Kolkata", "tracking_interval_seconds": 30, "require_geofence": true}'::jsonb,
  now() - interval '30 days',
  now()
) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. AUTH USERS (Mock Supabase Auth Records)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@acmelogistics.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm', -- mock hash
    now() - interval '30 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Sarah Connor"}'::jsonb,
    now() - interval '30 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'john.doe@acmelogistics.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm',
    now() - interval '20 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "John Doe"}'::jsonb,
    now() - interval '20 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'alex.vance@acmelogistics.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm',
    now() - interval '15 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Alex Vance"}'::jsonb,
    now() - interval '15 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'marcus.wright@acmelogistics.com',
    '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm',
    now() - interval '10 days',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Marcus Wright"}'::jsonb,
    now() - interval '10 days',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- 3. PROFILES
INSERT INTO public.profiles (
  id,
  organization_id,
  role,
  full_name,
  created_at,
  updated_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'COMPANY_ADMIN',
    'Sarah Connor',
    now() - interval '30 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222221',
    '00000000-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'John Doe',
    now() - interval '20 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'Alex Vance',
    now() - interval '15 days',
    now()
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '00000000-0000-0000-0000-000000000001',
    'EMPLOYEE',
    'Marcus Wright',
    now() - interval '10 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 4. EMPLOYEES
INSERT INTO public.employees (
  id,
  organization_id,
  profile_id,
  employee_code,
  email,
  phone,
  department,
  status,
  created_at,
  updated_at
) VALUES
  (
    '33333333-3333-3333-3333-333333333331',
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222221',
    'EMP-101',
    'john.doe@acmelogistics.com',
    '+91-9876543210',
    'Fleet Dispatch',
    'ACTIVE',
    now() - interval '20 days',
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333332',
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222',
    'EMP-102',
    'alex.vance@acmelogistics.com',
    '+91-9876543211',
    'Warehouse Operations',
    'ACTIVE',
    now() - interval '15 days',
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222223',
    'EMP-103',
    'marcus.wright@acmelogistics.com',
    '+91-9876543212',
    'Field Logistics',
    'ACTIVE',
    now() - interval '10 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  department = EXCLUDED.department,
  status = EXCLUDED.status;

-- 5. ACTIVE REGISTERED DEVICES
INSERT INTO public.devices (
  id,
  organization_id,
  employee_id,
  device_identifier,
  status,
  last_seen_at,
  created_at,
  updated_at
) VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333331',
    'android-pixel-7a-dev-01',
    'ACTIVE',
    now() - interval '5 minutes',
    now() - interval '20 days',
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333332',
    'android-samsung-s23-dev-02',
    'ACTIVE',
    now() - interval '2 hours',
    now() - interval '15 days',
    now()
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'android-moto-g-dev-03',
    'ACTIVE',
    now() - interval '1 day',
    now() - interval '10 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  last_seen_at = EXCLUDED.last_seen_at;

-- 6. ACTIVE GEOFENCES
INSERT INTO public.geofences (
  id,
  organization_id,
  name,
  type,
  center,
  radius_meters,
  is_active,
  created_at,
  updated_at
) VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '00000000-0000-0000-0000-000000000001',
    'HQ Central Logistics Hub',
    'office',
    ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326),
    100.0,
    true,
    now() - interval '25 days',
    now()
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '00000000-0000-0000-0000-000000000001',
    'East Distribution Facility',
    'field_site',
    ST_SetSRID(ST_MakePoint(77.6412, 12.9352), 4326),
    250.0,
    true,
    now() - interval '20 days',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  radius_meters = EXCLUDED.radius_meters;

-- 7. ATTENDANCE SESSIONS
INSERT INTO public.attendance_sessions (
  id,
  organization_id,
  employee_id,
  device_id,
  check_in_time,
  check_out_time,
  check_in_location,
  status,
  created_at,
  updated_at
) VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333331',
    '44444444-4444-4444-4444-444444444441',
    now() - interval '4 hours',
    NULL,
    ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326),
    'ACTIVE',
    now() - interval '4 hours',
    now()
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333332',
    '44444444-4444-4444-4444-444444444442',
    now() - interval '1 day' + interval '8 hours',
    now() - interval '1 day' + interval '16 hours' + interval '30 minutes',
    ST_SetSRID(ST_MakePoint(77.6412, 12.9352), 4326),
    'COMPLETED',
    now() - interval '1 day',
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. REALISTIC SEQUENCE OF LOCATION POINTS (GPS Route for Employee 1 Session)
INSERT INTO public.location_points (
  id,
  session_id,
  employee_id,
  organization_id,
  coordinates,
  accuracy,
  speed,
  is_mock,
  idempotency_key,
  captured_at,
  created_at
) VALUES
  ('88888888-8888-8888-8888-888888888801', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.5946, 12.9716), 4326), 4.2, 0.0, false, 'pt-seed-01', now() - interval '3 hours' - interval '50 minutes', now()),
  ('88888888-8888-8888-8888-888888888802', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.5962, 12.9725), 4326), 5.1, 7.8, false, 'pt-seed-02', now() - interval '3 hours' - interval '40 minutes', now()),
  ('88888888-8888-8888-8888-888888888803', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6001, 12.9741), 4326), 4.8, 9.4, false, 'pt-seed-03', now() - interval '3 hours' - interval '30 minutes', now()),
  ('88888888-8888-8888-8888-888888888804', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6045, 12.9758), 4326), 6.0, 11.2, false, 'pt-seed-04', now() - interval '3 hours' - interval '20 minutes', now()),
  ('88888888-8888-8888-8888-888888888805', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6102, 12.9780), 4326), 5.5, 10.5, false, 'pt-seed-05', now() - interval '3 hours' - interval '10 minutes', now()),
  -- Point 06: Flagged with Mock Location provider
  ('88888888-8888-8888-8888-888888888806', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6150, 12.9810), 4326), 25.0, 12.0, true, 'pt-seed-06', now() - interval '3 hours', now()),
  ('88888888-8888-8888-8888-888888888807', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6205, 12.9835), 4326), 4.2, 8.5, false, 'pt-seed-07', now() - interval '2 hours' - interval '50 minutes', now()),
  ('88888888-8888-8888-8888-888888888808', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6280, 12.9850), 4326), 5.0, 9.1, false, 'pt-seed-08', now() - interval '2 hours' - interval '40 minutes', now()),
  ('88888888-8888-8888-8888-888888888809', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6350, 12.9870), 4326), 4.9, 8.9, false, 'pt-seed-09', now() - interval '2 hours' - interval '30 minutes', now()),
  ('88888888-8888-8888-8888-888888888810', '66666666-6666-6666-6666-666666666661', '33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000001', ST_SetSRID(ST_MakePoint(77.6412, 12.9890), 4326), 3.8, 0.0, false, 'pt-seed-10', now() - interval '2 hours', now())
ON CONFLICT (id) DO NOTHING;

-- 9. FLAGGED FRAUD EVENTS FOR SECURITY REVIEW TESTING
INSERT INTO public.fraud_events (
  id,
  organization_id,
  employee_id,
  session_id,
  event_type,
  severity,
  status,
  details,
  created_at,
  updated_at
) VALUES
  (
    '77777777-7777-7777-7777-777777777771',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    'IMPOSSIBLE_MOVEMENT',
    'CRITICAL',
    'PENDING',
    '{"calculated_speed_kmh": 184, "threshold_kmh": 130, "distance_meters": 15400, "time_delta_seconds": 300, "origin": [12.9716, 77.5946], "destination": [13.0827, 77.5877], "confidence": 0.98, "risk_score": 96}'::jsonb,
    now() - interval '1 hour',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333331',
    '66666666-6666-6666-6666-666666666661',
    'MOCK_LOCATION_SIGNAL',
    'HIGH',
    'INVESTIGATING',
    '{"is_mock": true, "accuracy": 25.0, "latitude": 12.9810, "longitude": 77.6150, "device_app": "fake_gps_spoofer_v2", "risk_score": 88}'::jsonb,
    now() - interval '3 hours',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777773',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333332',
    '66666666-6666-6666-6666-666666666662',
    'GEOFENCE_PROXIMITY_DEVIATION',
    'MEDIUM',
    'PENDING',
    '{"target_geofence": "North Warehouse Depot", "distance_from_boundary_m": 245, "horizontal_accuracy_m": 68.4, "risk_score": 54}'::jsonb,
    now() - interval '7 hours',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777774',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333331',
    '66666666-6666-6666-6666-666666666661',
    'CELL_TOWER_TIMESTAMPS_DESYNC',
    'LOW',
    'RESOLVED',
    '{"time_delta_ms": 3800, "cell_id": "404-45-12894", "resolution_note": "Verified cellular handover lag between BTS towers.", "reviewed_by": "Sarah Connor", "risk_score": 18}'::jsonb,
    now() - interval '18 hours',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777775',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333332',
    '66666666-6666-6666-6666-666666666662',
    'BATTERY_SAVER_GPS_THROTTLE',
    'INFORMATIONAL',
    'DISMISSED',
    '{"battery_level": 14, "sample_interval_sec": 60, "resolution_note": "Legitimate OS battery saver power throttling.", "reviewed_by": "Sarah Connor", "risk_score": 5}'::jsonb,
    now() - interval '36 hours',
    now()
  ),
  (
    '77777777-7777-7777-7777-777777777776',
    '00000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    'PLAY_INTEGRITY_COMPROMISED',
    'HIGH',
    'CONFIRMED',
    '{"app_licensing": "UNLICENSED", "device_recognition": "MEETS_NO_INTEGRITY", "resolution_note": "Device root detected with Magisk active.", "reviewed_by": "Sarah Connor", "risk_score": 95}'::jsonb,
    now() - interval '48 hours',
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  details = EXCLUDED.details;
