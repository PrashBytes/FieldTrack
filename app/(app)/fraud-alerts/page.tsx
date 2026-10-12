'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, severityToVariant, reviewToVariant } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';

type FraudEvent = {
  id: string;
  event_type: string;
  severity: string;
  review_status: string;
  description: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
  employees: { full_name: string; employee_code: string } | null;
};

const PAGE_SIZE = 15;

export default function FraudAlertsPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<FraudEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<FraudEvent | null>(null);
  const [resolution, setResolution] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    let query = supabase
      .from('fraud_events')
      .select(`
        id, event_type, severity, review_status, description, evidence, created_at,
        employees (full_name, employee_code)
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id);

    if (statusFilter !== 'all') {
      query = query.eq('review_status', statusFilter);
    }

    query = query.order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, error, count } = await query;
    if (error) console.error(error);
    setEvents((data as unknown as FraudEvent[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [profile?.organization_id, statusFilter, page]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleReview = async (status: string) => {
    if (!selectedEvent || !profile?.id) return;
    setReviewing(true);
    const { error } = await supabase
      .from('fraud_events')
      .update({
        review_status: status,
        reviewer_id: profile.id,
        reviewed_at: new Date().toISOString(),
        resolution_reason: resolution || null,
      })
      .eq('id', selectedEvent.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Fraud event reviewed');
      setSelectedEvent(null);
      setResolution('');
      fetchEvents();
    }
    setReviewing(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Fraud Alerts" description="Review GPS anomalies and integrity violations" />

      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex gap-3">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="reviewing">Reviewing</SelectItem>
                <SelectItem value="resolved_legitimate">Resolved: Legitimate</SelectItem>
                <SelectItem value="resolved_fraud">Resolved: Fraud</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldAlert className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">No fraud events</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm font-medium">{e.employees?.full_name || 'Unknown'}</TableCell>
                      <TableCell className="text-sm">{e.event_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell><StatusBadge variant={severityToVariant(e.severity)}>{e.severity}</StatusBadge></TableCell>
                      <TableCell><StatusBadge variant={reviewToVariant(e.review_status)}>{e.review_status.replace(/_/g, ' ')}</StatusBadge></TableCell>
                      <TableCell className="text-sm text-slate-500">{new Date(e.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setSelectedEvent(e)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500">Page {page + 1} of {totalPages} ({total} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Fraud Event</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Employee</Label>
                  <p className="text-sm font-medium">{selectedEvent.employees?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Event Type</Label>
                  <p className="text-sm font-medium">{selectedEvent.event_type.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Severity</Label>
                  <StatusBadge variant={severityToVariant(selectedEvent.severity)}>{selectedEvent.severity}</StatusBadge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Date</Label>
                  <p className="text-sm">{new Date(selectedEvent.created_at).toLocaleString()}</p>
                </div>
              </div>
              {selectedEvent.description && (
                <div>
                  <Label className="text-xs text-slate-500">Description</Label>
                  <p className="text-sm">{selectedEvent.description}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-slate-500">Evidence</Label>
                <pre className="mt-1 max-h-40 overflow-y-auto rounded-md bg-slate-50 p-3 text-xs">
                  {JSON.stringify(selectedEvent.evidence, null, 2)}
                </pre>
              </div>
              <div className="space-y-2">
                <Label>Resolution Reason</Label>
                <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Explain the resolution..." />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleReview('resolved_legitimate')} disabled={reviewing}>
              Resolve: Legitimate
            </Button>
            <Button variant="destructive" onClick={() => handleReview('resolved_fraud')} disabled={reviewing}>
              Resolve: Fraud
            </Button>
            <Button variant="secondary" onClick={() => handleReview('escalated')} disabled={reviewing}>
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
