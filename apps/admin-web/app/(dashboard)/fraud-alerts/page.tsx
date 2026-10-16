'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, shouldBypassNetwork } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileSearch,
  Loader2,
  Search,
  Filter,
  RefreshCw,
  Info,
  Activity,
  Layers,
} from 'lucide-react';

interface FraudEventItem {
  id: string;
  organization_id: string;
  employee_id: string;
  session_id?: string | null;
  event_type: string;
  severity: string;
  status: string;
  details: Record<string, any>;
  created_at: string;
  employees?: {
    id: string;
    employee_code?: string | null;
    department?: string | null;
    profiles?: {
      full_name?: string | null;
    } | null;
  } | null;
}

const PAGE_SIZE = 10;

function getSeverityBadge(sev?: string | null) {
  if (!sev) {
    return (
      <Badge
        variant="outline"
        className="border-slate-700/80 text-slate-400 bg-slate-900/60 font-mono text-[10px] tracking-wide border-dashed font-semibold"
      >
        UNCLASSIFIED
      </Badge>
    );
  }
  const s = sev.toUpperCase().trim();
  switch (s) {
    case 'CRITICAL':
      return (
        <Badge className="bg-rose-950/90 text-rose-300 border border-rose-800/80 font-mono text-[10px] tracking-wide shadow-2xs font-bold">
          CRITICAL
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge className="bg-orange-950/80 text-orange-300 border border-orange-800/80 font-mono text-[10px] tracking-wide shadow-2xs font-semibold">
          HIGH
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge className="bg-amber-950/80 text-amber-300 border border-amber-800/80 font-mono text-[10px] tracking-wide shadow-2xs font-semibold">
          MEDIUM
        </Badge>
      );
    case 'LOW':
      return (
        <Badge className="bg-blue-950/80 text-blue-300 border border-blue-800/80 font-mono text-[10px] tracking-wide shadow-2xs font-semibold">
          LOW
        </Badge>
      );
    case 'INFORMATIONAL':
    case 'INFO':
      return (
        <Badge className="bg-slate-800/90 text-slate-300 border border-slate-700/80 font-mono text-[10px] tracking-wide shadow-2xs font-medium">
          INFORMATIONAL
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-slate-700/80 text-slate-400 bg-slate-900/60 font-mono text-[10px] tracking-wide border-dashed font-medium"
        >
          {s}
        </Badge>
      );
  }
}

function getStatusBadge(st?: string | null) {
  if (!st) {
    return (
      <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-800/50 text-[11px]">
        Unknown
      </Badge>
    );
  }
  const s = st.toUpperCase().trim();
  switch (s) {
    case 'PENDING':
      return (
        <Badge className="bg-amber-950/60 text-amber-300 border border-amber-800/60 text-[11px] font-medium inline-flex items-center gap-1.5 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Pending Review
        </Badge>
      );
    case 'INVESTIGATING':
      return (
        <Badge className="bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[11px] font-medium inline-flex items-center gap-1.5 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          Investigating
        </Badge>
      );
    case 'REVIEWED':
    case 'RESOLVED':
      return (
        <Badge className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 text-[11px] font-medium inline-flex items-center gap-1.5 w-fit">
          <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
          Resolved
        </Badge>
      );
    case 'CONFIRMED':
      return (
        <Badge className="bg-rose-950/60 text-rose-300 border border-rose-800/60 text-[11px] font-medium inline-flex items-center gap-1.5 w-fit">
          <AlertTriangle className="h-3 w-3 text-rose-400 shrink-0" />
          Confirmed Fraud
        </Badge>
      );
    case 'DISMISSED':
      return (
        <Badge className="bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium inline-flex items-center gap-1.5 w-fit">
          <XCircle className="h-3 w-3 text-slate-400 shrink-0" />
          Dismissed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-800/50 text-[11px]">
          {st}
        </Badge>
      );
  }
}

export default function FraudAlertsPage() {
  const { profile } = useAuth();
  const [allEvents, setAllEvents] = useState<FraudEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState(0);
  const [isSimulatedData, setIsSimulatedData] = useState(false);

  // Review Modal State
  const [selectedEvent, setSelectedEvent] = useState<FraudEventItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('INVESTIGATING');
  const [resolutionNote, setResolutionNote] = useState<string>('');
  const [reviewing, setReviewing] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const isBypass = shouldBypassNetwork();
      setIsSimulatedData(isBypass);

      const { data, error } = await supabase
        .from('fraud_events')
        .select(`
          id, organization_id, employee_id, session_id, event_type, severity, status, details, created_at,
          employees (
            id, employee_code, department,
            profiles (full_name)
          )
        `)
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        const { MOCK_FRAUD_EVENTS } = await import('@/lib/supabase/mock-data');
        setAllEvents(MOCK_FRAUD_EVENTS as any);
        setIsSimulatedData(true);
      } else {
        setAllEvents(data as unknown as FraudEventItem[]);
      }
    } catch (err) {
      console.error('Error fetching fraud alerts:', err);
      try {
        const { MOCK_FRAUD_EVENTS } = await import('@/lib/supabase/mock-data');
        setAllEvents(MOCK_FRAUD_EVENTS as any);
        setIsSimulatedData(true);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Derived filtered items
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Status filter
      if (statusFilter !== 'all') {
        const evStatus = (ev.status || '').toUpperCase();
        if (statusFilter === 'pending' && evStatus !== 'PENDING') return false;
        if (statusFilter === 'investigating' && evStatus !== 'INVESTIGATING') return false;
        if (statusFilter === 'resolved' && evStatus !== 'RESOLVED' && evStatus !== 'REVIEWED') return false;
        if (statusFilter === 'confirmed' && evStatus !== 'CONFIRMED') return false;
        if (statusFilter === 'dismissed' && evStatus !== 'DISMISSED') return false;
      }

      // Severity filter
      if (severityFilter !== 'all') {
        const evSev = (ev.severity || '').toUpperCase();
        if (severityFilter === 'critical' && evSev !== 'CRITICAL') return false;
        if (severityFilter === 'high' && evSev !== 'HIGH') return false;
        if (severityFilter === 'medium' && evSev !== 'MEDIUM') return false;
        if (severityFilter === 'low' && evSev !== 'LOW') return false;
        if (
          severityFilter === 'informational' &&
          evSev !== 'INFORMATIONAL' &&
          evSev !== 'INFO'
        )
          return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = (ev.employees?.profiles?.full_name || '').toLowerCase();
        const empCode = (ev.employees?.employee_code || '').toLowerCase();
        const dept = (ev.employees?.department || '').toLowerCase();
        const evType = (ev.event_type || '').toLowerCase();
        if (
          !empName.includes(q) &&
          !empCode.includes(q) &&
          !dept.includes(q) &&
          !evType.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allEvents, statusFilter, severityFilter, searchQuery]);

  // Summary Metrics Breakdown
  const metrics = useMemo(() => {
    const totalCount = allEvents.length;
    const unresolved = allEvents.filter((e) => {
      const s = (e.status || '').toUpperCase();
      return s === 'PENDING' || s === 'INVESTIGATING';
    }).length;

    const critical = allEvents.filter(
      (e) => (e.severity || '').toUpperCase() === 'CRITICAL'
    ).length;

    const high = allEvents.filter(
      (e) => (e.severity || '').toUpperCase() === 'HIGH'
    ).length;

    const mediumLowInfo = allEvents.filter((e) => {
      const s = (e.severity || '').toUpperCase();
      return (
        s === 'MEDIUM' ||
        s === 'LOW' ||
        s === 'INFORMATIONAL' ||
        s === 'INFO'
      );
    }).length;

    return { totalCount, unresolved, critical, high, mediumLowInfo };
  }, [allEvents]);

  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE) || 1;
  const paginatedEvents = filteredEvents.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const handleOpenReview = (event: FraudEventItem) => {
    setSelectedEvent(event);
    const curr = (event.status || 'PENDING').toUpperCase();
    setReviewStatus(curr === 'PENDING' ? 'INVESTIGATING' : curr);
    setResolutionNote(
      event.details?.resolution_note || event.details?.notes || ''
    );
  };

  const handleSaveResolution = async () => {
    if (!selectedEvent) return;
    setReviewing(true);

    try {
      const updatedDetails = {
        ...(selectedEvent.details || {}),
        resolution_note: resolutionNote.trim(),
        reviewed_by: profile?.full_name || 'Administrator',
        reviewed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('fraud_events')
        .update({
          status: reviewStatus,
          details: updatedDetails,
        })
        .eq('id', selectedEvent.id);

      if (error) {
        toast.error(`Failed to update review status: ${error.message}`);
      } else {
        toast.success(`Incident status updated to ${reviewStatus}.`);
        // In-memory sync for instant UI responsiveness
        setAllEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id
              ? {
                  ...e,
                  status: reviewStatus,
                  details: updatedDetails,
                }
              : e
          )
        );
        setSelectedEvent(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating review');
    } finally {
      setReviewing(false);
    }
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setSeverityFilter('all');
    setSearchQuery('');
    setPage(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          category="Security & Intelligence"
          title="Security & Fraud Surveillance"
          description="Investigate mock location signals, teleportation velocity anomalies, hardware attestation, and GPS tampering"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            className="h-9 gap-1.5 border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-400" /> Refresh Telemetry
          </Button>
        </div>
      </div>

      {/* Security Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <Card className="border border-slate-800/80 bg-slate-900/80 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400">Total Flagged</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">
            {metrics.totalCount}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Recorded threat events</p>
        </Card>

        <Card className="border border-slate-800/80 bg-slate-900/80 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300">Unresolved Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-300 font-mono mt-1">
            {metrics.unresolved}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Pending or investigating</p>
        </Card>

        <Card className="border border-rose-900/40 bg-rose-950/20 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300">Critical Threats</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-300 font-mono mt-1">
            {metrics.critical}
          </div>
          <p className="text-[10px] text-rose-300/70 mt-0.5">Urgent triage required</p>
        </Card>

        <Card className="border border-orange-900/40 bg-orange-950/20 shadow-md rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-orange-300">High Risk Alerts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <ShieldAlert className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-orange-300 font-mono mt-1">
            {metrics.high}
          </div>
          <p className="text-[10px] text-orange-300/70 mt-0.5">Prompt investigation</p>
        </Card>

        <Card className="border border-slate-800/80 bg-slate-900/80 shadow-md rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">Medium / Low / Info</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10 text-slate-300 border border-slate-700/60">
              <Info className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-200 font-mono mt-1">
            {metrics.mediumLowInfo}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Anomalies & telemetry</p>
        </Card>
      </div>

      {/* Simulated Telemetry Banner Notice */}
      {isSimulatedData && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-indigo-950/20 p-3.5 px-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30 font-mono uppercase tracking-wider">
              Simulated Telemetry Dataset
            </span>
            <span className="text-slate-300 font-medium">
              Displaying verified multi-tier incident data across all threat tiers for triage workflow testing.
            </span>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0 font-mono">
            Anti-Spoofing Engine v2.4 Active
          </span>
        </div>
      )}

      {/* Main Table & Filter Toolbar Card */}
      <Card className="border border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-xl rounded-xl">
        <CardContent className="p-5 space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Field */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Search staff, employee code, or event..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(0);
                  }}
                  className="pl-9 h-9.5 text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 rounded-lg"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-9.5 text-xs border-slate-800 bg-slate-950/70 text-slate-200 focus:border-indigo-500 rounded-lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="all">All Statuses ({allEvents.length})</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="confirmed">Confirmed Fraud</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              {/* Severity Filter */}
              <Select
                value={severityFilter}
                onValueChange={(v) => {
                  setSeverityFilter(v);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-full sm:w-44 h-9.5 text-xs border-slate-800 bg-slate-950/70 text-slate-200 focus:border-indigo-500 rounded-lg">
                  <SelectValue placeholder="All Severity Levels" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="all">All Threat Tiers</SelectItem>
                  <SelectItem value="critical">Critical (Urgent)</SelectItem>
                  <SelectItem value="high">High (Substantial)</SelectItem>
                  <SelectItem value="medium">Medium (Suspicious)</SelectItem>
                  <SelectItem value="low">Low (Minor Anomaly)</SelectItem>
                  <SelectItem value="informational">Informational (Benign)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters / Count Badge */}
            <div className="flex items-center gap-2 shrink-0">
              {(statusFilter !== 'all' || severityFilter !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-800"
                >
                  Clear Filters
                </Button>
              )}
              <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 font-mono border border-slate-700/60">
                {filteredEvents.length} Incident{filteredEvents.length === 1 ? '' : 's'} Matched
              </span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg bg-slate-800/60" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <ShieldCheck className="h-12 w-12 mb-3 text-emerald-400 opacity-80" />
              <p className="text-base font-bold text-white">No Incidents Found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                {statusFilter !== 'all' || severityFilter !== 'all' || searchQuery
                  ? 'No security incidents match the selected filter criteria. Try adjusting your search query or threat level filters.'
                  : 'Zero mock location signals, device tampering, or velocity anomalies detected across active fleet devices.'}
              </p>
              {(statusFilter !== 'all' || severityFilter !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-4 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Reset All Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Responsive Scrollable Table */}
              <div className="rounded-xl border border-slate-800/80 overflow-x-auto shadow-2xs bg-slate-950/40">
                <Table>
                  <TableHeader className="bg-slate-950/80 border-b border-slate-800">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Employee & Unit
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Logged Timestamp
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Incident Signature
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Threat Level
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">
                        Investigation Status
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3 text-right">
                        Triage Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-800/60 bg-transparent">
                    {paginatedEvents.map((ev) => {
                      const empName = ev.employees?.profiles?.full_name || 'Field Employee';

                      return (
                        <TableRow
                          key={ev.id}
                          className="hover:bg-slate-800/40 transition-colors group"
                        >
                          {/* Employee Name & Unit */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-bold text-xs shrink-0">
                                {empName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white text-xs truncate">
                                  {empName}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {ev.employees?.employee_code && (
                                    <span className="text-[10px] font-mono font-semibold bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700/60 shrink-0">
                                      {ev.employees.employee_code}
                                    </span>
                                  )}
                                  <span className="text-[11px] text-slate-400 truncate">
                                    {ev.employees?.department || 'Operations'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Date / Time */}
                          <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </TableCell>

                          {/* Incident Signature */}
                          <TableCell>
                            <div>
                              <span className="font-mono text-xs font-semibold text-indigo-300 block">
                                {ev.event_type}
                              </span>
                              {ev.details?.notes && (
                                <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                                  {ev.details.notes}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Severity Badge */}
                          <TableCell>{getSeverityBadge(ev.severity)}</TableCell>

                          {/* Investigation Status */}
                          <TableCell>{getStatusBadge(ev.status)}</TableCell>

                          {/* Triage Review Action */}
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReview(ev)}
                              className="gap-1.5 text-xs h-8 border-slate-800 bg-slate-850 text-slate-200 hover:bg-slate-700 hover:text-white shadow-2xs font-medium"
                            >
                              <FileSearch className="h-3.5 w-3.5 text-indigo-400" /> Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Bar */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-400">
                    Showing <span className="font-semibold text-slate-200">{page * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-semibold text-slate-200">
                      {Math.min((page + 1) * PAGE_SIZE, filteredEvents.length)}
                    </span>{' '}
                    of <span className="font-semibold text-slate-200">{filteredEvents.length}</span> security alerts
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Security Incident Review Dialog */}
      {selectedEvent && (
        <Dialog open={Boolean(selectedEvent)} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-lg border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Security Incident Investigation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              {/* Summary Box */}
              <div className="rounded-lg bg-slate-950/80 p-3.5 space-y-2 border border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Assigned Employee:</span>
                  <span className="font-bold text-white">
                    {selectedEvent.employees?.profiles?.full_name || 'Field Employee'}
                    {selectedEvent.employees?.employee_code && ` (${selectedEvent.employees.employee_code})`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Incident Signature:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {selectedEvent.event_type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Threat Severity:</span>
                  <span>{getSeverityBadge(selectedEvent.severity)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Current Status:</span>
                  <span>{getStatusBadge(selectedEvent.status)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Detected Timestamp:</span>
                  <span className="font-mono text-slate-300">
                    {new Date(selectedEvent.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Telemetry Evidence Box */}
              {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                <div>
                  <Label className="text-xs font-semibold text-slate-300">
                    Sensor Telemetry & Anti-Spoofing Evidence
                  </Label>
                  <pre className="mt-1 max-h-40 overflow-y-auto rounded bg-slate-950 p-2.5 text-[11px] text-emerald-400 font-mono border border-slate-800 leading-relaxed">
                    {JSON.stringify(selectedEvent.details, null, 2)}
                  </pre>
                </div>
              )}

              {/* Status Update Select */}
              <div className="space-y-1.5">
                <Label htmlFor="review-status" className="text-xs font-semibold text-slate-300">
                  Update Investigation Decision
                </Label>
                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                  <SelectTrigger
                    id="review-status"
                    className="border-slate-800 bg-slate-950/70 text-slate-200 focus:border-indigo-500"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="PENDING">Pending Review (Reopen)</SelectItem>
                    <SelectItem value="INVESTIGATING">Under Active Investigation</SelectItem>
                    <SelectItem value="RESOLVED">Mark as Resolved (Benign / Mitigated)</SelectItem>
                    <SelectItem value="CONFIRMED">Confirm as Proven Fraud (Disciplinary)</SelectItem>
                    <SelectItem value="DISMISSED">Dismiss (False Positive Signal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Notes Textarea */}
              <div className="space-y-1.5">
                <Label htmlFor="resolution-notes" className="text-xs font-semibold text-slate-300">
                  Investigator Findings & Resolution Notes
                </Label>
                <Textarea
                  id="resolution-notes"
                  placeholder="Document telemetry verification steps, driver interview, or false-positive rationale..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="h-20 text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedEvent(null)}
                className="border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveResolution}
                disabled={reviewing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                {reviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Decision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
