'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollText, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

interface AuditLogItem {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

const PAGE_SIZE = 15;

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      let query = supabase
        .from('audit_logs')
        .select(
          `
          id, actor_id, action, target_type, target_id, metadata, created_at,
          profiles:actor_id (full_name)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', profile.organization_id);

      if (search.trim()) {
        query = query.or(
          `action.ilike.%${search.trim()}%,target_type.ilike.%${search.trim()}%`
        );
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error('Audit log query error:', error);
      } else {
        setLogs((data as unknown as AuditLogItem[]) || []);
        setTotal(count || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id, search, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 250);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('REVOKE')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (act.includes('UPDATE') || act.includes('CORRECTION')) {
      return <Badge className="bg-amber-600 text-white">{action}</Badge>;
    }
    if (act.includes('CREATE') || act.includes('INSERT')) {
      return <Badge className="bg-emerald-600 text-white">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Immutable log of security and administrative operations across your organization"
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by action or target entity..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No audit logs recorded</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Administrative actions (corrections, employee status changes, geofence mutations) will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target Entity</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const actorName = log.profiles?.full_name || 'System / Service';
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {actorName}
                          </TableCell>
                          <TableCell>{getActionBadge(log.action)}</TableCell>
                          <TableCell className="text-xs font-mono text-slate-600">
                            {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)})` : ''}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="mr-1 h-3.5 w-3.5" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-slate-500">
                    Page {page + 1} of {totalPages} ({total} entries)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Metadata Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Audit Entry Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 py-2 text-sm">
              <div className="flex justify-between border-b pb-1 text-xs">
                <span className="text-slate-500">Log ID</span>
                <span className="font-mono">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-xs">
                <span className="text-slate-500">Actor</span>
                <span className="font-medium">{selectedLog.profiles?.full_name || 'System / Service'}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-xs">
                <span className="text-slate-500">Action</span>
                <span>{selectedLog.action}</span>
              </div>
              <div className="flex justify-between border-b pb-1 text-xs">
                <span className="text-slate-500">Target Type</span>
                <span className="font-mono">{selectedLog.target_type}</span>
              </div>
              <div className="space-y-1 pt-2">
                <span className="text-xs font-semibold text-slate-700">Payload Metadata</span>
                <pre className="max-h-48 overflow-auto rounded bg-slate-100 p-2 text-[11px] font-mono text-slate-800">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
