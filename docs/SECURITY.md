# FieldTrack — Security Model

## Authentication

- Supabase Auth with email/password (no magic links, no social providers)
- Session tokens stored in HTTP-only cookies
- Middleware validates session on every protected route
- Email confirmation is OFF by default

## Authorization

### Roles
| Role | Scope |
|------|-------|
| super_admin | All organizations |
| company_admin | Own organization only |
| manager | Assigned teams only |
| employee | Own data only |

### Permissions
Granular permissions enforced via RLS policies:
- employees.read/create/update/disable
- attendance.read/correct
- tracking.read/live
- routes.read
- geofences.manage
- fraud.read/review
- reports.export
- audit.read
- settings.manage

## Multi-Tenancy

- Every tenant-scoped table has `organization_id`
- RLS policies use `get_current_org_id()` helper to enforce isolation
- Cross-organization access is denied at the database level
- Super admins bypass org isolation

## Row Level Security

- RLS enabled on ALL tables
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE)
- `auth.uid()` used for ownership checks (never `current_user`)
- `USING (true)` only for intentionally public data

## Location Data Protection

- Location history is tightly scoped
- Employees can only see their own location data
- Managers see only their assigned teams' data
- Route history access is audited
- Data retention is configurable per organization

## Anti-Spoofing

### Layered Detection (no single signal is sufficient)
1. **Mock Location Signal**: `Location.isMock()` on Android
2. **Play Integrity**: Server-verified integrity tokens
3. **Device Binding**: Employee bound to registered device
4. **Movement Plausibility**: Speed/distance/time analysis
5. **Location Quality**: Accuracy, staleness, repeated coordinates
6. **Server-Side Trust Decision**: TRUSTED, REVIEW_REQUIRED, HIGH_RISK, UNVERIFIED

### Important Limitations
- Absence of mock flag does NOT prove authenticity
- Not every fast movement is fraud (consider transport mode)
- Root detection is not reliable as sole security control
- GPS anomalies are NOT automatic proof of misconduct

## Secret Management

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (safe)
- `SUPABASE_SERVICE_ROLE_KEY` is ONLY used in edge functions (server-side)
- Android app uses anon key only
- No backend secrets in browser or Android code

## Audit Trail

All security-sensitive actions are logged:
- Login/logout, employee creation/deactivation
- Device registration/revocation
- Attendance corrections, geofence modifications
- Fraud review actions, report exports
- Role/permission changes

Audit logs are append-only — ordinary users cannot edit or delete them.
