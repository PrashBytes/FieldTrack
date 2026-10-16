/**
 * Mock Seed Data & Authentication Fallback for Local Development
 * When local Supabase or cloud backend is not connected/reachable.
 */

export interface MockUserAccount {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
  organization_id: string;
  phone: string;
}

export const MOCK_ACCOUNTS: MockUserAccount[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@acmelogistics.com',
    full_name: 'Sarah Connor',
    role: 'company_admin',
    organization_id: '00000000-0000-0000-0000-000000000001',
    phone: '+1 (555) 019-2831',
  },
  {
    id: '22222222-2222-2222-2222-222222222221',
    email: 'john.doe@acmelogistics.com',
    full_name: 'John Doe',
    role: 'employee',
    organization_id: '00000000-0000-0000-0000-000000000001',
    phone: '+91-9876543210',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'alex.vance@acmelogistics.com',
    full_name: 'Alex Vance',
    role: 'employee',
    organization_id: '00000000-0000-0000-0000-000000000001',
    phone: '+91-9876543211',
  },
  {
    id: '22222222-2222-2222-2222-222222222223',
    email: 'marcus.wright@acmelogistics.com',
    full_name: 'Marcus Wright',
    role: 'employee',
    organization_id: '00000000-0000-0000-0000-000000000001',
    phone: '+91-9876543212',
  },
];

export const MOCK_ORGANIZATION = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Acme Logistics',
  timezone: 'Asia/Kolkata',
  settings: {
    timezone: 'Asia/Kolkata',
    tracking_interval_seconds: 30,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    tracking_policy: {
      target_interval_seconds: 30,
      min_interval_seconds: 15,
      max_interval_seconds: 120,
      stationary_interval_seconds: 60,
      accuracy_threshold_meters: 50,
      stationary_speed_threshold_mps: 1.0,
      enforce_geofence_checkin: true,
    },
    security_policy: {
      session_timeout_hours: 12,
      single_device_binding: true,
      require_play_integrity: true,
      detect_mock_locations: true,
      disallow_rooted_devices: true,
      max_devices_per_employee: 1,
    },
  },
};

export const MOCK_EMPLOYEES = [
  {
    id: '33333333-3333-3333-3333-333333333331',
    organization_id: '00000000-0000-0000-0000-000000000001',
    profile_id: '22222222-2222-2222-2222-222222222221',
    employee_code: 'EMP-101',
    email: 'john.doe@acmelogistics.com',
    phone: '+91-9876543210',
    department: 'Fleet Dispatch',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    profiles: {
      full_name: 'John Doe',
      email: 'john.doe@acmelogistics.com',
      role: 'EMPLOYEE',
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333332',
    organization_id: '00000000-0000-0000-0000-000000000001',
    profile_id: '22222222-2222-2222-2222-222222222222',
    employee_code: 'EMP-102',
    email: 'alex.vance@acmelogistics.com',
    phone: '+91-9876543211',
    department: 'Warehouse Operations',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    profiles: {
      full_name: 'Alex Vance',
      email: 'alex.vance@acmelogistics.com',
      role: 'EMPLOYEE',
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    organization_id: '00000000-0000-0000-0000-000000000001',
    profile_id: '22222222-2222-2222-2222-222222222223',
    employee_code: 'EMP-103',
    email: 'marcus.wright@acmelogistics.com',
    phone: '+91-9876543212',
    department: 'Field Logistics',
    status: 'ACTIVE',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    profiles: {
      full_name: 'Marcus Wright',
      email: 'marcus.wright@acmelogistics.com',
      role: 'EMPLOYEE',
    },
  },
];

export const MOCK_DEVICES = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333331',
    device_identifier: 'android-pixel-7a-dev-01',
    status: 'ACTIVE',
    last_seen_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333332',
    device_identifier: 'android-samsung-s23-dev-02',
    status: 'ACTIVE',
    last_seen_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: '44444444-4444-4444-4444-444444444443',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333333',
    device_identifier: 'android-moto-g-dev-03',
    status: 'ACTIVE',
    last_seen_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export const MOCK_GEOFENCES = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    organization_id: '00000000-0000-0000-0000-000000000001',
    name: 'HQ Central Logistics Hub',
    type: 'office',
    center: 'POINT(77.5946 12.9716)',
    radius_meters: 100.0,
    is_active: true,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    organization_id: '00000000-0000-0000-0000-000000000001',
    name: 'East Distribution Facility',
    type: 'field_site',
    center: 'POINT(77.6412 12.9352)',
    radius_meters: 250.0,
    is_active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];

export const MOCK_ATTENDANCE_SESSIONS = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333331',
    device_id: '44444444-4444-4444-4444-444444444441',
    check_in_time: new Date(Date.now() - 4 * 3600000).toISOString(),
    check_out_time: null,
    status: 'ACTIVE',
    check_in_location: 'POINT(77.5946 12.9716)',
    employees: {
      id: '33333333-3333-3333-3333-333333333331',
      employee_code: 'EMP-101',
      department: 'Fleet Dispatch',
      profiles: {
        full_name: 'John Doe',
        role: 'EMPLOYEE',
      },
    },
    devices: {
      id: '44444444-4444-4444-4444-444444444441',
      device_identifier: 'android-pixel-7a-dev-01',
      status: 'ACTIVE',
    },
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333332',
    device_id: '44444444-4444-4444-4444-444444444442',
    check_in_time: new Date(Date.now() - 28 * 3600000).toISOString(),
    check_out_time: new Date(Date.now() - 20 * 3600000).toISOString(),
    status: 'COMPLETED',
    check_in_location: 'POINT(77.6412 12.9352)',
    employees: {
      id: '33333333-3333-3333-3333-333333333332',
      employee_code: 'EMP-102',
      department: 'Warehouse Operations',
      profiles: {
        full_name: 'Alex Vance',
        role: 'EMPLOYEE',
      },
    },
    devices: {
      id: '44444444-4444-4444-4444-444444444442',
      device_identifier: 'android-samsung-s23-dev-02',
      status: 'ACTIVE',
    },
  },
];

export const MOCK_LOCATION_POINTS = [
  { id: '88888888-8888-8888-8888-888888888801', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.5946 12.9716)', accuracy: 4.2, speed: 0.0, is_mock: false, captured_at: new Date(Date.now() - 3.8 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888802', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.5962 12.9725)', accuracy: 5.1, speed: 7.8, is_mock: false, captured_at: new Date(Date.now() - 3.6 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888803', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6001 12.9741)', accuracy: 4.8, speed: 9.4, is_mock: false, captured_at: new Date(Date.now() - 3.4 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888804', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6045 12.9758)', accuracy: 6.0, speed: 11.2, is_mock: false, captured_at: new Date(Date.now() - 3.2 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888805', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6102 12.9780)', accuracy: 5.5, speed: 10.5, is_mock: false, captured_at: new Date(Date.now() - 3.0 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888806', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6150 12.9810)', accuracy: 25.0, speed: 12.0, is_mock: true, captured_at: new Date(Date.now() - 2.8 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888807', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6205 12.9835)', accuracy: 4.2, speed: 8.5, is_mock: false, captured_at: new Date(Date.now() - 2.6 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888808', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6280 12.9850)', accuracy: 5.0, speed: 9.1, is_mock: false, captured_at: new Date(Date.now() - 2.4 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888809', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6350 12.9870)', accuracy: 4.9, speed: 8.9, is_mock: false, captured_at: new Date(Date.now() - 2.2 * 3600000).toISOString() },
  { id: '88888888-8888-8888-8888-888888888810', session_id: '66666666-6666-6666-6666-666666666661', employee_id: '33333333-3333-3333-3333-333333333331', coordinates: 'POINT(77.6412 12.9890)', accuracy: 3.8, speed: 0.0, is_mock: false, captured_at: new Date(Date.now() - 2.0 * 3600000).toISOString() },
];

export const MOCK_FRAUD_EVENTS = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333333',
    session_id: null,
    event_type: 'IMPOSSIBLE_MOVEMENT',
    severity: 'CRITICAL',
    status: 'PENDING',
    details: {
      calculated_speed_kmh: 184,
      threshold_kmh: 130,
      distance_meters: 15400,
      time_delta_seconds: 300,
      origin: [12.9716, 77.5946],
      destination: [13.0827, 77.5877],
      confidence: 0.98,
      risk_score: 96,
      notes: 'Teleportation anomaly: speed 184 km/h exceeded maximum fleet velocity threshold.',
    },
    created_at: new Date(Date.now() - 1.2 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333333',
      employee_code: 'EMP-103',
      department: 'Field Logistics',
      profiles: {
        full_name: 'Marcus Wright',
      },
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333331',
    session_id: '66666666-6666-6666-6666-666666666661',
    event_type: 'MOCK_LOCATION_SIGNAL',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    details: {
      is_mock: true,
      accuracy: 25.0,
      latitude: 12.9810,
      longitude: 77.6150,
      device_app: 'fake_gps_spoofer_v2',
      risk_score: 88,
      notes: 'Android TestProvider flag detected active while on duty shift.',
    },
    created_at: new Date(Date.now() - 3.5 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333331',
      employee_code: 'EMP-101',
      department: 'Fleet Dispatch',
      profiles: {
        full_name: 'John Doe',
      },
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777773',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333332',
    session_id: '66666666-6666-6666-6666-666666666662',
    event_type: 'GEOFENCE_PROXIMITY_DEVIATION',
    severity: 'MEDIUM',
    status: 'PENDING',
    details: {
      target_geofence: 'North Warehouse Depot',
      distance_from_boundary_m: 245,
      horizontal_accuracy_m: 68.4,
      risk_score: 54,
      notes: 'Check-in attempted 245m outside geofence boundary with moderate coordinate drift.',
    },
    created_at: new Date(Date.now() - 7.5 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333332',
      employee_code: 'EMP-102',
      department: 'Warehouse Operations',
      profiles: {
        full_name: 'Alex Vance',
      },
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777774',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333331',
    session_id: '66666666-6666-6666-6666-666666666661',
    event_type: 'CELL_TOWER_TIMESTAMPS_DESYNC',
    severity: 'LOW',
    status: 'RESOLVED',
    details: {
      time_delta_ms: 3800,
      cell_id: '404-45-12894',
      resolution_note: 'Verified cellular handover lag between BTS towers. No intentional manipulation.',
      reviewed_by: 'Sarah Connor',
      risk_score: 18,
    },
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333331',
      employee_code: 'EMP-101',
      department: 'Fleet Dispatch',
      profiles: {
        full_name: 'John Doe',
      },
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777775',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333332',
    session_id: '66666666-6666-6666-6666-666666666662',
    event_type: 'BATTERY_SAVER_GPS_THROTTLE',
    severity: 'INFORMATIONAL',
    status: 'DISMISSED',
    details: {
      battery_level: 14,
      sample_interval_sec: 60,
      resolution_note: 'Legitimate OS battery saver power throttling while operating off-grid.',
      reviewed_by: 'Sarah Connor',
      risk_score: 5,
    },
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333332',
      employee_code: 'EMP-102',
      department: 'Warehouse Operations',
      profiles: {
        full_name: 'Alex Vance',
      },
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777776',
    organization_id: '00000000-0000-0000-0000-000000000001',
    employee_id: '33333333-3333-3333-3333-333333333333',
    session_id: null,
    event_type: 'PLAY_INTEGRITY_COMPROMISED',
    severity: 'HIGH',
    status: 'CONFIRMED',
    details: {
      app_licensing: 'UNLICENSED',
      device_recognition: 'MEETS_NO_INTEGRITY',
      resolution_note: 'Device root detected with Magisk hide module active during dispatch.',
      reviewed_by: 'Sarah Connor',
      risk_score: 95,
    },
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
    employees: {
      id: '33333333-3333-3333-3333-333333333333',
      employee_code: 'EMP-103',
      department: 'Field Logistics',
      profiles: {
        full_name: 'Marcus Wright',
      },
    },
  },
];

export const MOCK_AUDIT_LOGS = [
  {
    id: '99999999-9999-9999-9999-999999999901',
    organization_id: '00000000-0000-0000-0000-000000000001',
    actor_id: '11111111-1111-1111-1111-111111111111',
    action: 'INITIAL_SEED_CONFIGURED',
    target_type: 'organization',
    target_id: '00000000-0000-0000-0000-000000000001',
    metadata: { environment: 'local_development', tenant: 'Acme Logistics' },
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    profiles: {
      full_name: 'Sarah Connor',
    },
  },
  {
    id: '99999999-9999-9999-9999-999999999902',
    actor_id: '11111111-1111-1111-1111-111111111111',
    organization_id: '00000000-0000-0000-0000-000000000001',
    action: 'GEOFENCE_CREATED',
    target_type: 'geofence',
    target_id: '55555555-5555-5555-5555-555555555551',
    metadata: { name: 'HQ Central Logistics Hub', radius: 100 },
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    profiles: {
      full_name: 'Sarah Connor',
    },
  },
];
