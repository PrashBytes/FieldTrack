export type UserRole = 'super_admin' | 'company_admin' | 'manager' | 'employee';

export type Permission =
  | 'employees.read'
  | 'employees.create'
  | 'employees.update'
  | 'employees.disable'
  | 'attendance.read'
  | 'attendance.correct'
  | 'tracking.read'
  | 'tracking.live'
  | 'routes.read'
  | 'geofences.manage'
  | 'fraud.read'
  | 'fraud.review'
  | 'reports.export'
  | 'audit.read'
  | 'settings.manage';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'employees.read', 'employees.create', 'employees.update', 'employees.disable',
    'attendance.read', 'attendance.correct',
    'tracking.read', 'tracking.live',
    'routes.read',
    'geofences.manage',
    'fraud.read', 'fraud.review',
    'reports.export',
    'audit.read',
    'settings.manage',
  ],
  company_admin: [
    'employees.read', 'employees.create', 'employees.update', 'employees.disable',
    'attendance.read', 'attendance.correct',
    'tracking.read', 'tracking.live',
    'routes.read',
    'geofences.manage',
    'fraud.read', 'fraud.review',
    'reports.export',
    'audit.read',
    'settings.manage',
  ],
  manager: [
    'employees.read', 'employees.update',
    'attendance.read', 'attendance.correct',
    'tracking.read', 'tracking.live',
    'routes.read',
    'fraud.read',
    'reports.export',
  ],
  employee: [
    'attendance.read',
  ],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'super_admin' || role === 'company_admin';
}
