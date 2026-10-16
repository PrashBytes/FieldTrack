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
import { Textarea } from '@/components/ui/textarea';
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
  Clock,
  MapPin,
  Smartphone,
  Shield,
  FileCheck2,
  Loader2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  device_id: string | null;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  check_in_location: any;
  employees?: {
    id: string;
    employee_code: string | null;
    department: string;
    profiles?: {
      full_name: string | null;
      role: string;
    } | null;
  } | null;
  devices?: {
    id: string;
    device_identifier: string;
    status: string;
  } | null;
}

interface LocationBreadcrumb {
  id: string;
  captured_at: string;
  coordinates: any;
  accuracy: number | null;
  speed: number | null;
  is_mock: boolean;
}

export default function AttendanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { profile } = useAuth();

  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [points, setPoints] = useState<LocationBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);

  // Correction Workflow Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [corrStatus, setCorrStatus] = useState<string>('COMPLETED');
  const [corrCheckIn, setCorrCheckIn] = useState<string>('');
  const [corrCheckOut, setCorrCheckOut] = useState<string>('');
  const [corrNotes, setCorrNotes] = useState<string>('');
  const [savingCorrection, setSavingCorrection] = useState(false);

  const fetchRecord = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const [attRes, ptsRes] = await Promise.all([
        supabase
          .from('attendance_sessions')
          .select(
            `
            id, employee_id, device_id, check_in_time, check_out_time, status, check_in_location,
            employees (
              id, employee_code, department,
              profiles (full_name, role)
            ),
            devices (id, device_identifier, status)
          `
          )
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle(),

        supabase
          .from('location_points')
          .select('id, captured_at, coordinates, accuracy, speed, is_mock')
          .eq('session_id', id)
          .order('captured_at', { ascending: true })
          .limit(100),
      ]);

      if (attRes.data) {
        const item = attRes.data as unknown as AttendanceRecord;
        setRecord(item);
        setCorrStatus(item.status);
        // Pre-fill correction ISO strings formatted for datetime-local
        if (item.check_in_time) {
          setCorrCheckIn(new Date(item.check_in_time).toISOString().slice(0, 16));
        }
        if (item.check_out_time) {
          setCorrCheckOut(new Date(item.check_out_time).toISOString().slice(0, 16));
        } else {
          setCorrCheckOut(new Date().toISOString().slice(0, 16));
        }
      }

      setPoints((ptsRes.data as LocationBreadcrumb[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id, profile?.organization_id]);

  // Handle Correction Approval & Submission
  const handleSaveCorrection = async () => {
    if (!record) return;
    setSavingCorrection(true);

    try {
      const updates: any = {
        status: corrStatus,
      };

      if (corrCheckIn) {
        updates.check_in_time = new Date(corrCheckIn).toISOString();
      }
      if (corrCheckOut) {
        updates.check_out_time = new Date(corrCheckOut).toISOString();
      }

      const { error } = await supabase
        .from('attendance_sessions')
        .update(updates)
        .eq('id', record.id);

      if (error) {
        toast.error(`Correction update failed: ${error.message}`);
      } else {
        // Log to audit_logs if available
        await supabase.from('audit_logs').insert({
          organization_id: profile?.organization_id,
          actor_id: profile?.id,
          action: 'ATTENDANCE_CORRECTION_APPLIED',
          target_type: 'attendance_session',
          target_id: record.id,
          metadata: {
            previous_status: record.status,
            new_status: corrStatus,
            notes: corrNotes.trim(),
            corrected_by: profile?.full_name || 'Admin',
          },
        });

        toast.success('Attendance record corrected successfully');
        setRecord({
          ...record,
          status: corrStatus,
          check_in_time: updates.check_in_time || record.check_in_time,
          check_out_time: updates.check_out_time || record.check_out_time,
        });
        setCorrectionModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving correction');
    } finally {
      setSavingCorrection(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Attendance Record Detail" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <PageHeader title="Record Not Found" />
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Attendance session record could not be found.
            <div className="mt-4">
              <Link href="/attendance">
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Attendance List
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const empName = record.employees?.profiles?.full_name || 'Field Staff';
  const checkInDate = new Date(record.check_in_time);
  const checkOutDate = record.check_out_time ? new Date(record.check_out_time) : null;
  const durationMin = checkOutDate
    ? Math.max(0, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000))
    : Math.max(0, Math.round((Date.now() - checkInDate.getTime()) / 60000));

  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${empName} - Attendance Record`}
        description={`Session ID: ${record.id} · ${checkInDate.toLocaleDateString()}`}
      >
        <div className="flex items-center gap-2">
          <Link href="/attendance">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <Button onClick={() => setCorrectionModalOpen(true)}>
            <FileCheck2 className="mr-2 h-4 w-4" />
            Request / Apply Correction
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Summary cards */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Session Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Current Status</span>
                <StatusBadge
                  variant={
                    record.status.toUpperCase() === 'ACTIVE'
                      ? 'info'
                      : record.status.toUpperCase() === 'COMPLETED'
                      ? 'success'
                      : 'neutral'
                  }
                >
                  {record.status}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Duration</span>
                <span className="font-medium text-slate-800">
                  {hours}h {minutes}m {checkOutDate ? '' : '(Ongoing)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Employee Code</span>
                <span className="font-mono text-xs">
                  {record.employees?.employee_code || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Department</span>
                <span className="font-medium">
                  {record.employees?.department || 'Operations'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-blue-600" />
                Timestamps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="border-b pb-2">
                <span className="text-xs text-slate-400">Check-In</span>
                <p className="font-medium text-slate-800">
                  {checkInDate.toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs text-slate-400">Check-Out</span>
                <p className="font-medium text-slate-800">
                  {checkOutDate ? checkOutDate.toLocaleString() : 'Not Checked Out Yet'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-slate-600" />
                Device Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {record.devices ? (
                <div className="space-y-1">
                  <p className="font-mono text-xs text-slate-700">
                    {record.devices.device_identifier}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {record.devices.status}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No device metadata tied to session.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: GPS breadcrumbs */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Recorded GPS Coordinates ({points.length} points)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {points.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No GPS breadcrumb coordinates recorded during this session.
                </div>
              ) : (
                <div className="max-h-[460px] overflow-y-auto rounded-md border">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b">
                      <tr>
                        <th className="p-2.5">Captured At</th>
                        <th className="p-2.5">Accuracy</th>
                        <th className="p-2.5">Speed</th>
                        <th className="p-2.5">Mock Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {points.map((pt) => (
                        <tr key={pt.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono">
                            {new Date(pt.captured_at).toLocaleTimeString()}
                          </td>
                          <td className="p-2.5">
                            ±{pt.accuracy ? Math.round(pt.accuracy) : 0}m
                          </td>
                          <td className="p-2.5">
                            {pt.speed !== null ? `${pt.speed.toFixed(1)} m/s` : '0 m/s'}
                          </td>
                          <td className="p-2.5">
                            {pt.is_mock ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                                <Shield className="h-3 w-3" /> Spoofed
                              </span>
                            ) : (
                              <span className="text-slate-400">Verified</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance Correction Modal */}
      <Dialog open={correctionModalOpen} onOpenChange={setCorrectionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance Correction Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Session Status</Label>
              <Select value={corrStatus} onValueChange={setCorrStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE (In Progress)</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED (Regular Shift)</SelectItem>
                  <SelectItem value="AUTO_COMPLETED">AUTO_COMPLETED (Shift Timeout)</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED (Void Session)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="corrCheckIn">Adjusted Check-In</Label>
                <Input
                  id="corrCheckIn"
                  type="datetime-local"
                  value={corrCheckIn}
                  onChange={(e) => setCorrCheckIn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="corrCheckOut">Adjusted Check-Out</Label>
                <Input
                  id="corrCheckOut"
                  type="datetime-local"
                  value={corrCheckOut}
                  onChange={(e) => setCorrCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="corrNotes">Administrative Reason / Justification *</Label>
              <Textarea
                id="corrNotes"
                placeholder="Reason for correction (e.g. employee forgot checkout due to network downtime)..."
                value={corrNotes}
                onChange={(e) => setCorrNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCorrectionModalOpen(false)}
              disabled={savingCorrection}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveCorrection} disabled={savingCorrection}>
              {savingCorrection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Approve & Save Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
