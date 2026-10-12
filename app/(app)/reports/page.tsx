'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Download, FileBarChart, Loader2 } from 'lucide-react';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportType, setReportType] = useState('daily_attendance');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<{ total: number; active: number; completed: number } | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    setLoading(true);
    (async () => {
      const from = new Date(dateFrom + 'T00:00:00').toISOString();
      const to = new Date(dateTo + 'T23:59:59').toISOString();
      const { data, count } = await supabase
        .from('attendance_sessions')
        .select('id, attendance_status', { count: 'exact' })
        .eq('organization_id', profile.organization_id)
        .gte('check_in_at', from)
        .lte('check_in_at', to);

      setStats({
        total: count || 0,
        active: data?.filter((s) => s.attendance_status === 'active').length || 0,
        completed: data?.filter((s) => s.attendance_status === 'completed').length || 0,
      });
      setLoading(false);
    })();
  }, [profile?.organization_id, dateFrom, dateTo]);

  const handleExport = async () => {
    if (!profile?.organization_id) return;
    setExporting(true);

    try {
      const from = new Date(dateFrom + 'T00:00:00').toISOString();
      const to = new Date(dateTo + 'T23:59:59').toISOString();

      let query = supabase
        .from('attendance_sessions')
        .select(`
          id, check_in_at, check_out_at, attendance_status, integrity_status, review_status,
          employees (full_name, employee_code)
        `)
        .eq('organization_id', profile.organization_id)
        .gte('check_in_at', from)
        .lte('check_in_at', to)
        .order('check_in_at', { ascending: true });

      if (reportType === 'fraud_events') {
        query = supabase
          .from('fraud_events')
          .select(`
            id, event_type, severity, review_status, created_at, description,
            employees (full_name, employee_code)
          `)
          .eq('organization_id', profile.organization_id)
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true }) as any;
      }

      const { data, error } = await query;
      if (error) throw error;

      const csvRows: string[] = [];
      if (reportType === 'fraud_events') {
        csvRows.push('Employee,Code,Event Type,Severity,Status,Date,Description');
        (data || []).forEach((r: any) => {
          csvRows.push([
            r.employees?.full_name || '',
            r.employees?.employee_code || '',
            r.event_type,
            r.severity,
            r.review_status,
            new Date(r.created_at).toISOString(),
            (r.description || '').replace(/,/g, ';'),
          ].join(','));
        });
      } else {
        csvRows.push('Employee,Code,Check In,Check Out,Status,Integrity,Review');
        (data || []).forEach((r: any) => {
          csvRows.push([
            r.employees?.full_name || '',
            r.employees?.employee_code || '',
            new Date(r.check_in_at).toISOString(),
            r.check_out_at ? new Date(r.check_out_at).toISOString() : '',
            r.attendance_status,
            r.integrity_status,
            r.review_status,
          ].join(','));
        });
      }

      const csv = csvRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_${dateFrom}_${dateTo}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      await supabase.from('audit_logs').insert({
        organization_id: profile.organization_id,
        actor_id: profile.id,
        actor_email: profile.email,
        action: 'report_export',
        target_type: 'report',
        metadata: { report_type: reportType, date_from: dateFrom, date_to: dateTo },
      });

      toast.success('Report exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    }
    setExporting(false);
  };

  return (
    <div>
      <PageHeader title="Reports" description="Generate and export attendance and tracking reports" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Generate Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily_attendance">Daily Attendance</SelectItem>
                  <SelectItem value="fraud_events">Fraud Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileBarChart className="h-5 w-5" />Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : stats ? (
              <>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Total Sessions</span><span className="text-lg font-bold">{stats.total}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Active</span><span className="text-lg font-bold text-blue-600">{stats.active}</span></div>
                <div className="flex justify-between"><span className="text-sm text-slate-500">Completed</span><span className="text-lg font-bold text-emerald-600">{stats.completed}</span></div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
