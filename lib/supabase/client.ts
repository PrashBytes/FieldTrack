import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          timezone: string;
          workweek: string[];
          default_shift_id: string | null;
          default_geofence_id: string | null;
          attendance_policy: {
            require_geofence?: boolean;
            require_photo?: boolean;
            grace_minutes?: number;
          };
          location_sampling_policy: {
            target_interval_seconds?: number;
            min_interval_seconds?: number;
            max_interval_seconds?: number;
            stationary_interval_seconds?: number;
          };
          data_retention_days: number;
          privacy_contact: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['organizations']['Row']>;
        Update: Partial<Database['public']['Tables']['organizations']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string;
          full_name: string | null;
          role: 'super_admin' | 'company_admin' | 'manager' | 'employee';
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['departments']['Row']>;
        Update: Partial<Database['public']['Tables']['departments']['Row']>;
      };
      teams: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['teams']['Row']>;
        Update: Partial<Database['public']['Tables']['teams']['Row']>;
      };
      shifts: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          start_time: string;
          end_time: string;
          grace_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['shifts']['Row']>;
        Update: Partial<Database['public']['Tables']['shifts']['Row']>;
      };
      employees: {
        Row: {
          id: string;
          organization_id: string;
          profile_id: string | null;
          employee_code: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          department_id: string | null;
          team_id: string | null;
          manager_id: string | null;
          shift_id: string | null;
          employment_status: 'active' | 'on_leave' | 'terminated' | 'suspended';
          account_status: 'pending' | 'active' | 'disabled';
          designation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['employees']['Row']>;
        Update: Partial<Database['public']['Tables']['employees']['Row']>;
      };
      devices: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          device_identifier: string;
          device_name: string | null;
          platform: string;
          os_version: string | null;
          app_version: string | null;
          play_integrity_status: 'verified' | 'failed' | 'unknown' | 'not_checked';
          is_active: boolean;
          registered_at: string;
          revoked_at: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['devices']['Row']>;
        Update: Partial<Database['public']['Tables']['devices']['Row']>;
      };
      geofences: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          type: 'office' | 'field_site' | 'restricted_zone';
          center: string;
          radius_meters: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['geofences']['Row']>;
        Update: Partial<Database['public']['Tables']['geofences']['Row']>;
      };
      attendance_sessions: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          device_id: string | null;
          shift_id: string | null;
          check_in_at: string;
          check_out_at: string | null;
          check_in_location: string | null;
          check_out_location: string | null;
          check_in_accuracy: number | null;
          check_out_accuracy: number | null;
          check_in_geofence_id: string | null;
          check_out_geofence_id: string | null;
          integrity_status: 'trusted' | 'review_required' | 'high_risk' | 'unverified';
          attendance_status: 'active' | 'completed' | 'auto_completed' | 'cancelled';
          review_status: 'pending' | 'reviewed' | 'flagged' | 'resolved';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['attendance_sessions']['Row']>;
        Update: Partial<Database['public']['Tables']['attendance_sessions']['Row']>;
      };
      location_sessions: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          attendance_session_id: string;
          device_id: string | null;
          started_at: string;
          ended_at: string | null;
          status: 'active' | 'ended' | 'interrupted' | 'failed';
          total_points: number;
          total_distance_meters: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['location_sessions']['Row']>;
        Update: Partial<Database['public']['Tables']['location_sessions']['Row']>;
      };
      location_points: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          location_session_id: string;
          attendance_session_id: string | null;
          device_id: string | null;
          location: string;
          accuracy: number | null;
          altitude: number | null;
          speed: number | null;
          bearing: number | null;
          provider: string | null;
          is_mock: boolean;
          captured_at: string;
          server_received_at: string;
          monotonic_elapsed_ms: number | null;
          idempotency_key: string;
          trust_status: 'trusted' | 'review_required' | 'high_risk' | 'unverified';
          evidence: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['location_points']['Row']>;
        Update: Partial<Database['public']['Tables']['location_points']['Row']>;
      };
      fraud_events: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          device_id: string | null;
          attendance_session_id: string | null;
          location_session_id: string | null;
          location_point_id: string | null;
          event_type: 'mock_location_signal' | 'integrity_verification_failed' | 'impossible_movement' | 'timestamp_inconsistency' | 'location_jump' | 'device_mismatch' | 'tracking_gap' | 'unusual_location_pattern';
          severity: 'low' | 'medium' | 'high' | 'critical';
          evidence: Record<string, unknown>;
          description: string | null;
          review_status: 'open' | 'reviewing' | 'resolved_legitimate' | 'resolved_fraud' | 'escalated';
          reviewer_id: string | null;
          reviewed_at: string | null;
          resolution_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['fraud_events']['Row']>;
        Update: Partial<Database['public']['Tables']['fraud_events']['Row']>;
      };
      attendance_corrections: {
        Row: {
          id: string;
          organization_id: string;
          attendance_session_id: string;
          employee_id: string;
          requested_by: string;
          requested_at: string;
          request_type: 'check_in_time' | 'check_out_time' | 'missing_check_out' | 'location' | 'status';
          original_value: string | null;
          requested_value: string | null;
          reason: string;
          status: 'pending' | 'approved' | 'rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['attendance_corrections']['Row']>;
        Update: Partial<Database['public']['Tables']['attendance_corrections']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          metadata: Record<string, unknown>;
          reason: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['audit_logs']['Row']>;
        Update: never;
      };
    };
  };
};
