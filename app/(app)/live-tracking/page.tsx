'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Users, WifiOff } from 'lucide-react';
import { useLeafletMap } from '@/hooks/use-leaflet-map';

type EmployeeLocation = {
  employee_id: string;
  full_name: string;
  employee_code: string;
  last_lat: number | null;
  last_lng: number | null;
  last_accuracy: number | null;
  last_captured_at: string | null;
  last_trust_status: string;
  is_mock: boolean;
  attendance_status: string;
};

export default function LiveTrackingPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { containerRef, mapRef, L, ready } = useLeafletMap({ center: [20, 0], zoom: 2 });
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (!profile?.organization_id) return;

    (async () => {
      const orgId = profile.organization_id;

      const { data: activeSessions } = await supabase
        .from('attendance_sessions')
        .select(`
          id, employee_id, attendance_status, integrity_status,
          employees (id, full_name, employee_code)
        `)
        .eq('organization_id', orgId)
        .eq('attendance_status', 'active');

      if (!activeSessions || activeSessions.length === 0) {
        setLoading(false);
        return;
      }

      const empIds = activeSessions.map((s: any) => s.employee_id);
      const { data: recentPoints } = await supabase
        .from('location_points')
        .select('employee_id, location, accuracy, captured_at, trust_status, is_mock')
        .in('employee_id', empIds)
        .order('captured_at', { ascending: false })
        .limit(200);

      const latestByEmployee: Record<string, any> = {};
      for (const pt of recentPoints || []) {
        if (!latestByEmployee[pt.employee_id]) {
          latestByEmployee[pt.employee_id] = pt;
        }
      }

      const empLocations: EmployeeLocation[] = activeSessions.map((s: any) => {
        const pt = latestByEmployee[s.employee_id];
        const coords = pt?.location ? pt.location.replace('POINT(', '').replace(')', '').split(' ') : [];
        return {
          employee_id: s.employee_id,
          full_name: s.employees?.full_name || 'Unknown',
          employee_code: s.employees?.employee_code || '',
          last_lat: coords.length === 2 ? parseFloat(coords[1]) : null,
          last_lng: coords.length === 2 ? parseFloat(coords[0]) : null,
          last_accuracy: pt?.accuracy ?? null,
          last_captured_at: pt?.captured_at ?? null,
          last_trust_status: pt?.trust_status ?? 'unverified',
          is_mock: pt?.is_mock ?? false,
          attendance_status: s.attendance_status,
        };
      });

      setEmployees(empLocations);
      setLoading(false);
    })();
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!ready || !L || !mapRef.current) return;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    employees.forEach((emp) => {
      if (emp.last_lat == null || emp.last_lng == null) return;

      const color = emp.is_mock ? '#ef4444' : emp.last_trust_status === 'trusted' ? '#10b981' : emp.last_trust_status === 'high_risk' ? '#ef4444' : '#f59e0b';
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([emp.last_lat, emp.last_lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(`<b>${emp.full_name}</b><br/>${emp.employee_code}<br/>${emp.last_captured_at ? new Date(emp.last_captured_at).toLocaleString() : 'No data'}`);

      markersRef.current[emp.employee_id] = marker;
    });

    if (selected && markersRef.current[selected]) {
      markersRef.current[selected].openPopup();
      const emp = employees.find((e) => e.employee_id === selected);
      if (emp && emp.last_lat && emp.last_lng) {
        mapRef.current.setView([emp.last_lat, emp.last_lng], 15);
      }
    } else if (employees.length > 0 && employees[0].last_lat && employees[0].last_lng) {
      mapRef.current.setView([employees[0].last_lat!, employees[0].last_lng!], 13);
    }
  }, [employees, selected, ready, L, mapRef]);

  const filtered = employees.filter(
    (e) => e.full_name.toLowerCase().includes(search.toLowerCase()) || e.employee_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Live Tracking" description="Real-time employee locations during active work sessions" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-[600px] overflow-y-auto">
          <CardContent className="p-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No active sessions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((emp) => {
                  const isStale = emp.last_captured_at && (Date.now() - new Date(emp.last_captured_at).getTime()) > 300000;
                  return (
                    <button
                      key={emp.employee_id}
                      onClick={() => setSelected(emp.employee_id)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selected === emp.employee_id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-400">{emp.employee_code}</p>
                        </div>
                        {emp.last_lat == null ? (
                          <WifiOff className="h-4 w-4 text-slate-300" />
                        ) : isStale ? (
                          <span className="text-xs text-amber-500">stale</span>
                        ) : (
                          <MapPin className="h-4 w-4 text-emerald-500" />
                        )}
                      </div>
                      {emp.last_captured_at && (
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(emp.last_captured_at).toLocaleTimeString()}
                          {emp.last_accuracy && ` · ±${Math.round(emp.last_accuracy)}m`}
                        </p>
                      )}
                      <div className="mt-1 flex gap-1">
                        {emp.is_mock && <StatusBadge variant="danger">mock</StatusBadge>}
                        <StatusBadge variant={emp.last_trust_status === 'trusted' ? 'success' : emp.last_trust_status === 'high_risk' ? 'danger' : 'neutral'}>
                          {emp.last_trust_status}
                        </StatusBadge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-[600px] overflow-hidden p-0">
          <div ref={containerRef} className="h-full w-full" style={{ minHeight: '600px' }} />
        </Card>
      </div>
    </div>
  );
}
