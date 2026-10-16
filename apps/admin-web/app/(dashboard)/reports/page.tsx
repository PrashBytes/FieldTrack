'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Download, FileBarChart, Loader2, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState('daily_attendance');
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<{ total: number; active: number; completed: number } | null>(
    null
  );

  useEffect(() => {
    if (!profile?.organization_id) return;
    setLoading(true);

    (async () => {
      const from = `${dateFrom}T00:00:00.000Z`;
      const to = `${dateTo}T23:59:59.999Z`;

      const { data, count } = await supabase
        .from('attendance_sessions')
        .select('id, status', { count: 'exact' })
        .eq('organization_id', profile.organization_id)
        .gte('check_in_time', from)
        .lte('check_in_time', to);

      setStats({
        total: count || 0,
        active: data?.filter((s) => s.status?.toUpperCase() === 'ACTIVE').length || 0,
        completed: data?.filter((s) => s.status?.toUpperCase() === 'COMPLETED').length || 0,
      });
      setLoading(false);
    })();
  }, [profile?.organization_id, dateFrom, dateTo]);

  const handleExport = async () => {
    if (!profile?.organization_id) return;
    setExporting(true);

    try {
      const from = `${dateFrom}T00:00:00.000Z`;
      const to = `${dateTo}T23:59:59.999Z`;

      const csvRows: string[] = [];

      if (reportType === 'fraud_events') {
        const { data, error } = await supabase
          .from('fraud_events')
          .select(`
            id, event_type, severity, status, created_at, details,
            employees (
              employee_code,
              profiles (full_name)
            )
          `)
          .eq('organization_id', profile.organization_id)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true });

        if (error) throw error;

        csvRows.push('Employee,Code,Event Type,Severity,Status,Date,Details');
        (data || []).forEach((r: any) => {
          const empName = r.employees?.profiles?.full_name || 'Staff Member';
          const empCode = r.employees?.employee_code || '';
          csvRows.push([
            `"${empName}"`,
            `"${empCode}"`,
            `"${r.event_type}"`,
            `"${r.severity}"`,
            `"${r.status}"`,
            `"${new Date(r.created_at).toISOString()}"`,
            `"${JSON.stringify(r.details || {}).replace(/"/g, '""')}"`,
          ].join(','));
        });
      } else {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select(`
            id, check_in_time, check_out_time, status,
            employees (
              employee_code, department,
              profiles (full_name)
            )
          `)
          .eq('organization_id', profile.organization_id)
          .gte('check_in_time', from)
          .lte('check_in_time', to)
          .order('check_in_time', { ascending: true });

        if (error) throw error;

        csvRows.push('Employee,Code,Department,Check In,Check Out,Status,Duration Hours');
        (data || []).forEach((r: any) => {
          const empName = r.employees?.profiles?.full_name || 'Staff Member';
          const empCode = r.employees?.employee_code || '';
          const dept = r.employees?.department || 'Operations';
          const checkIn = r.check_in_time ? new Date(r.check_in_time).toISOString() : '';
          const checkOut = r.check_out_time ? new Date(r.check_out_time).toISOString() : '';
          let duration = 'In Progress';
          if (r.check_in_time && r.check_out_time) {
            const diff = new Date(r.check_out_time).getTime() - new Date(r.check_in_time).getTime();
            duration = (diff / 3600000).toFixed(2);
          }

          csvRows.push([
            `"${empName}"`,
            `"${empCode}"`,
            `"${dept}"`,
            `"${checkIn}"`,
            `"${checkOut}"`,
            `"${r.status}"`,
            `"${duration}"`,
          ].join(','));
        });
      }

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FieldTrack_${reportType}_${dateFrom}_to_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Error generating export');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & Telemetry Reports"
        description="Generate and export audit-ready shift attendance and fraud anomaly CSV spreadsheets"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-blue-600" /> Export Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="report-type" className="text-xs font-medium">
                Report Type
              </Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_attendance">Employee Attendance & Duration</SelectItem>
                  <SelectItem value="fraud_events">Fraud & GPS Tampering Incidents</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date-from" className="text-xs font-medium">
                Date Range (From)
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date-to" className="text-xs font-medium">
                Date Range (To)
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full gap-2 mt-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing CSV...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download CSV Export
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Summary for Selected Range */}
        <Card className="lg:col-span-2 border shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" /> Range Summary Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border">
                  <p className="text-xs text-slate-500 font-medium">Total Shift Sessions</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">Active (In Progress)</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">{stats?.active ?? 0}</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">Completed Shifts</p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">{stats?.completed ?? 0}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-4 border text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Export Specifications:</p>
              <p>• Data is extracted directly from tenant-isolated PostgreSQL tables with PostGIS coordinates.</p>
              <p>• Timestamps are serialized in ISO-8601 UTC format for international payroll compatibility.</p>
              <p>• Fraud reports include JSON evidence payloads capturing mock signals and velocity data.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
