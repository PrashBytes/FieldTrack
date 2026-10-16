'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Smartphone,
  CalendarCheck,
  ShieldAlert,
  Loader2,
  Edit,
  Power,
  CheckCircle2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface EmployeeProfile {
  id: string;
  employee_code: string | null;
  department: string;
  status: string;
  created_at: string;
  email?: string | null;
  phone?: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    role: string;
  } | null;
}

interface DeviceItem {
  id: string;
  device_identifier: string;
  status: string;
  last_seen_at: string | null;
  created_at: string;
}

interface AttendanceItem {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
}

interface FraudItem {
  id: string;
  event_type: string;
  severity: string;
  status: string;
  created_at: string;
}

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useAuth();

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [fraudEvents, setFraudEvents] = useState<FraudItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Status toggle state
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Edit Department / Code dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editDept, setEditDept] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Device revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchEmployeeData = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const [empRes, devRes, attRes, fraudRes] = await Promise.all([
        supabase
          .from('employees')
          .select(
            `
            id, employee_code, department, status, created_at, email, phone,
            profiles (id, full_name, role)
          `
          )
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),

        supabase
          .from('devices')
          .select('id, device_identifier, status, last_seen_at, created_at')
          .eq('employee_id', id)
          .order('created_at', { ascending: false }),

        supabase
          .from('attendance_sessions')
          .select('id, check_in_time, check_out_time, status')
          .eq('employee_id', id)
          .order('check_in_time', { ascending: false })
          .limit(10),

        supabase
          .from('fraud_events')
          .select('id, event_type, severity, status, created_at')
          .eq('employee_id', id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (empRes.data) {
        const emp = empRes.data as unknown as EmployeeProfile;
        setEmployee(emp);
        setEditDept(emp.department || '');
        setEditCode(emp.employee_code || '');
      }

      setDevices((devRes.data as DeviceItem[]) || []);
      setAttendance((attRes.data as AttendanceItem[]) || []);
      setFraudEvents((fraudRes.data as FraudItem[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [id, profile?.organization_id]);

  // Toggle Active/Inactive or Suspended
  const handleToggleStatus = async () => {
    if (!employee) return;
    const isCurrentlyActive = employee.status.toUpperCase() === 'ACTIVE';
    const nextStatus = isCurrentlyActive ? 'SUSPENDED' : 'ACTIVE';

    setTogglingStatus(true);
    const { error } = await supabase
      .from('employees')
      .update({ status: nextStatus })
      .eq('id', employee.id);

    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
    } else {
      toast.success(`Employee account marked as ${nextStatus}.`);
      setEmployee({ ...employee, status: nextStatus });
    }
    setTogglingStatus(false);
  };

  // Save Department / Shift details
  const handleSaveEdit = async () => {
    if (!employee) return;
    setEditSaving(true);

    const { error } = await supabase
      .from('employees')
      .update({
        department: editDept.trim(),
        employee_code: editCode.trim() || null,
      })
      .eq('id', employee.id);

    if (error) {
      toast.error(`Update failed: ${error.message}`);
    } else {
      toast.success('Employee assignment updated');
      setEmployee({
        ...employee,
        department: editDept.trim(),
        employee_code: editCode.trim() || null,
      });
      setEditOpen(false);
    }
    setEditSaving(false);
  };

  // Revoke device access
  const handleRevokeDevice = async (deviceId: string) => {
    setRevokingId(deviceId);
    const { error } = await supabase
      .from('devices')
      .update({ status: 'REVOKED' })
      .eq('id', deviceId);

    if (error) {
      toast.error(`Device revoke failed: ${error.message}`);
    } else {
      toast.success('Device revoked successfully');
      setDevices(
        devices.map((d) => (d.id === deviceId ? { ...d, status: 'REVOKED' } : d))
      );
    }
    setRevokingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Employee Details" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="space-y-4">
        <PageHeader title="Employee Not Found" />
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            The requested employee could not be found or access is restricted.
            <div className="mt-4">
              <Link href="/employees">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Directory
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const empName = employee.profiles?.full_name || 'Staff Member';
  const isActive = employee.status.toUpperCase() === 'ACTIVE';

  return (
    <div className="space-y-6">
      <PageHeader
        title={empName}
        description={`${employee.employee_code || employee.id.slice(0, 8)} · ${employee.department}`}
      >
        <div className="flex items-center gap-2">
          <Link href="/employees">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Info
          </Button>
          <Button
            variant={isActive ? 'destructive' : 'default'}
            onClick={handleToggleStatus}
            disabled={togglingStatus}
          >
            {togglingStatus ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Power className="mr-2 h-4 w-4" />
            )}
            {isActive ? 'Deactivate Account' : 'Activate Account'}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile & Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Employee ID</span>
              <span className="font-mono font-medium">
                {employee.employee_code || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Department</span>
              <span className="font-medium">{employee.department}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{employee.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium">{employee.phone || '—'}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Role</span>
              <span className="font-medium">
                {employee.profiles?.role || 'EMPLOYEE'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm border-b pb-2">
              <span className="text-slate-500">Account Status</span>
              <StatusBadge variant={isActive ? 'success' : 'danger'}>
                {employee.status}
              </StatusBadge>
            </div>
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-slate-500">Registered</span>
              <span className="font-medium text-slate-700">
                {new Date(employee.created_at).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Details: Devices & Attendance */}
        <div className="space-y-6 lg:col-span-2">
          {/* Registered Devices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Registered Devices ({devices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No mobile devices registered for this employee yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Identifier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((dev) => (
                      <TableRow key={dev.id}>
                        <TableCell className="font-mono text-xs">
                          {dev.device_identifier}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              dev.status.toUpperCase() === 'ACTIVE'
                                ? 'success'
                                : 'danger'
                            }
                          >
                            {dev.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {dev.last_seen_at
                            ? new Date(dev.last_seen_at).toLocaleString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          {dev.status.toUpperCase() === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRevokeDevice(dev.id)}
                              disabled={revokingId === dev.id}
                            >
                              {revokingId === dev.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Revoke'
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Attendance Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Recent Attendance Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  No attendance history recorded.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Check-In</TableHead>
                      <TableHead>Check-Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="text-xs">
                          {new Date(att.check_in_time).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {att.check_out_time
                            ? new Date(att.check_out_time).toLocaleString()
                            : 'In Progress'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              att.status.toUpperCase() === 'ACTIVE'
                                ? 'info'
                                : 'success'
                            }
                          >
                            {att.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/attendance/${att.id}`}>
                            <Button variant="ghost" size="sm">
                              View Record
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Security & Fraud Events */}
          {fraudEvents.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  Security Alerts ({fraudEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudEvents.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-xs font-medium">
                          {f.event_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-xs">{f.severity}</TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              f.status.toUpperCase() === 'PENDING'
                                ? 'warning'
                                : 'info'
                            }
                          >
                            {f.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(f.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Assignment Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editCode">Employee ID Code</Label>
              <Input
                id="editCode"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                placeholder="EMP-101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDept">Department</Label>
              <Input
                id="editDept"
                value={editDept}
                onChange={(e) => setEditDept(e.target.value)}
                placeholder="Operations"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={editSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editSaving}>
              {editSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
