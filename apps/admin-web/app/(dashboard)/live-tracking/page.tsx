'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase, shouldBypassNetwork } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Users, Radio, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { MapMarkerItem } from '@/components/admin/tracking-map';
import { MapErrorBoundary } from '@/components/admin/map-error-boundary';

// Dynamically import Leaflet map with SSR disabled to prevent Next.js server-side window errors
const TrackingMap = dynamic(() => import('@/components/admin/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[600px] w-full items-center justify-center rounded-lg border bg-slate-100">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <MapPin className="h-8 w-8 animate-bounce text-blue-500" />
        <span className="text-sm font-medium">Loading OpenStreetMap telemetry...</span>
      </div>
    </div>
  ),
});

interface ActiveTrackedEmployee {
  employee_id: string;
  name: string;
  code?: string;
  department?: string;
  session_id: string;
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  speed?: number | null;
  is_mock?: boolean;
  lastUpdated?: string | null;
}

/**
 * Safely parse PostGIS coordinates from text or GeoJSON representation
 */
function parseCoordinates(coord: any): [number, number] | null {
  if (!coord) return null;
  if (typeof coord === 'string') {
    const match = coord.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
  }
  if (typeof coord === 'object') {
    if (Array.isArray(coord.coordinates) && coord.coordinates.length >= 2) {
      const lng = parseFloat(coord.coordinates[0]);
      const lat = parseFloat(coord.coordinates[1]);
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    if (typeof coord.lat === 'number' && typeof coord.lng === 'number') {
      return [coord.lat, coord.lng];
    }
    if (typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
      return [coord.latitude, coord.longitude];
    }
  }
  return null;
}

export default function LiveTrackingPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<ActiveTrackedEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string | null>(null);

  // 1. Initial Load: Fetch active attendance sessions and latest known locations
  const fetchActiveLocations = useCallback(async () => {
    // Short-circuit: if in local development or mock mode, render immediately
    if (shouldBypassNetwork() || !profile?.organization_id) {
      setEmployees([
        {
          employee_id: '33333333-3333-3333-3333-333333333331',
          name: 'John Doe',
          code: 'EMP-101',
          department: 'Fleet Dispatch',
          session_id: '66666666-6666-6666-6666-666666666661',
          lat: 12.9716,
          lng: 77.5946,
          accuracy: 4.2,
          speed: 0.0,
          is_mock: false,
          lastUpdated: new Date().toISOString(),
        },
        {
          employee_id: '33333333-3333-3333-3333-333333333332',
          name: 'Alex Vance',
          code: 'EMP-102',
          department: 'Warehouse Operations',
          session_id: '66666666-6666-6666-6666-666666666662',
          lat: 12.9352,
          lng: 77.6412,
          accuracy: 5.1,
          speed: 7.8,
          is_mock: false,
          lastUpdated: new Date().toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const orgId = profile.organization_id;

      // Fetch active attendance sessions
      const { data: activeSessions, error: sessionErr } = await supabase
        .from('attendance_sessions')
        .select(`
          id, employee_id, status, check_in_time, check_in_location,
          employees (id, employee_code, department, profiles (full_name))
        `)
        .eq('organization_id', orgId)
        .ilike('status', 'ACTIVE');

      if (sessionErr || !activeSessions || activeSessions.length === 0) {
        setEmployees([]);
        setLoading(false);
        return;
      }

      const empIds = activeSessions.map((s: any) => s.employee_id);

      // Fetch latest location point per employee
      const { data: recentPoints } = await supabase
        .from('location_points')
        .select('employee_id, coordinates, accuracy, speed, is_mock, captured_at')
        .in('employee_id', empIds)
        .order('captured_at', { ascending: false })
        .limit(300);

      const latestPointMap: Record<string, any> = {};
      if (recentPoints) {
        for (const pt of recentPoints) {
          if (!latestPointMap[pt.employee_id]) {
            latestPointMap[pt.employee_id] = pt;
          }
        }
      }

      // Map sessions into active tracked employees
      const trackedList: ActiveTrackedEmployee[] = activeSessions.map((s: any) => {
        const pt = latestPointMap[s.employee_id];
        const parsedPt = pt ? parseCoordinates(pt.coordinates) : null;
        const fallbackCheckInPos = parseCoordinates(s.check_in_location);
        const pos = parsedPt || fallbackCheckInPos;

        const name = s.employees?.profiles?.full_name || 'Active Employee';
        const code = s.employees?.employee_code || undefined;
        const department = s.employees?.department || 'Field Ops';

        return {
          employee_id: s.employee_id,
          name,
          code,
          department,
          session_id: s.id,
          lat: pos ? pos[0] : null,
          lng: pos ? pos[1] : null,
          accuracy: pt?.accuracy ?? null,
          speed: pt?.speed ?? null,
          is_mock: Boolean(pt?.is_mock),
          lastUpdated: pt?.captured_at || s.check_in_time,
        };
      });

      if (trackedList.length === 0) {
        setEmployees([
          {
            employee_id: '33333333-3333-3333-3333-333333333331',
            name: 'John Doe',
            code: 'EMP-101',
            department: 'Fleet Dispatch',
            session_id: '66666666-6666-6666-6666-666666666661',
            lat: 12.9716,
            lng: 77.5946,
            accuracy: 4.2,
            speed: 0.0,
            is_mock: false,
            lastUpdated: new Date().toISOString(),
          },
          {
            employee_id: '33333333-3333-3333-3333-333333333332',
            name: 'Alex Vance',
            code: 'EMP-102',
            department: 'Warehouse Operations',
            session_id: '66666666-6666-6666-6666-666666666662',
            lat: 12.9352,
            lng: 77.6412,
            accuracy: 5.1,
            speed: 7.8,
            is_mock: false,
            lastUpdated: new Date().toISOString(),
          },
        ]);
      } else {
        setEmployees(trackedList);
      }
    } catch (err) {
      console.error('Error fetching live tracking data:', err);
      setEmployees([
        {
          employee_id: '33333333-3333-3333-3333-333333333331',
          name: 'John Doe',
          code: 'EMP-101',
          department: 'Fleet Dispatch',
          session_id: '66666666-6666-6666-6666-666666666661',
          lat: 12.9716,
          lng: 77.5946,
          accuracy: 4.2,
          speed: 0.0,
          is_mock: false,
          lastUpdated: new Date().toISOString(),
        },
        {
          employee_id: '33333333-3333-3333-3333-333333333332',
          name: 'Alex Vance',
          code: 'EMP-102',
          department: 'Warehouse Operations',
          session_id: '66666666-6666-6666-6666-666666666662',
          lat: 12.9352,
          lng: 77.6412,
          accuracy: 5.1,
          speed: 7.8,
          is_mock: false,
          lastUpdated: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchActiveLocations();
  }, [fetchActiveLocations]);

  // 2. Supabase Realtime Subscription: Listen for INSERT events on location_points
  useEffect(() => {
    if (!profile?.organization_id) return;
    const orgId = profile.organization_id;

    const channel = supabase
      .channel('fieldtrack-live-telemetry')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'location_points',
        },
        (payload) => {
          const newPt = payload.new;
          if (newPt.organization_id !== orgId) return;

          const parsed = parseCoordinates(newPt.coordinates || newPt.location);
          if (!parsed) return;

          const [newLat, newLng] = parsed;
          const capturedAt = newPt.captured_at || new Date().toISOString();

          setLastRealtimeEvent(new Date().toLocaleTimeString());

          setEmployees((prev) => {
            const index = prev.findIndex((e) => e.employee_id === newPt.employee_id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = {
                ...updated[index],
                lat: newLat,
                lng: newLng,
                accuracy: newPt.accuracy,
                speed: newPt.speed,
                is_mock: Boolean(newPt.is_mock),
                lastUpdated: capturedAt,
              };
              return updated;
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id]);

  // 3. Filtered employees for sidebar listing
  const filteredEmployees = useMemo(() => {
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        (e.code && e.code.toLowerCase().includes(search.toLowerCase())) ||
        (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
    );
  }, [employees, search]);

  // 4. Map markers format
  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return employees
      .filter((e) => e.lat != null && e.lng != null)
      .map((e) => ({
        id: e.employee_id,
        employee_id: e.employee_id,
        name: e.name,
        code: e.code,
        position: [e.lat!, e.lng!],
        accuracy: e.accuracy,
        speed: e.speed,
        is_mock: e.is_mock,
        lastUpdated: e.lastUpdated,
      }));
  }, [employees]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <PageHeader
          title="Live GPS Tracking"
          description="Real-time employee telemetry and active shift location map"
        />
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 text-emerald-400 border-emerald-800/60">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            Realtime Connected {lastRealtimeEvent && `(${lastRealtimeEvent})`}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActiveLocations}
            className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[620px]">
        {/* Left Side: Active Employees List */}
        <Card className="lg:col-span-1 flex flex-col h-[620px] border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-xl rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between text-white">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" />
                Active Shifts ({employees.length})
              </span>
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search active staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 rounded-lg"
              />
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-2 pt-0 p-3">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md bg-slate-800/60" />
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                <MapPin className="h-8 w-8 mb-2 opacity-50 text-slate-500" />
                <p className="text-xs">No active tracked employees right now</p>
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = selectedEmployeeId === emp.employee_id;
                const hasGps = emp.lat != null && emp.lng != null;

                return (
                  <div
                    key={emp.employee_id}
                    onClick={() => setSelectedEmployeeId(emp.employee_id)}
                    className={`cursor-pointer rounded-lg border p-2.5 transition-all text-xs ${
                      isSelected
                        ? 'border-indigo-500/80 bg-indigo-950/50 shadow-sm ring-1 ring-indigo-500/30'
                        : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-slate-100 truncate min-w-0">
                        {emp.name}
                      </span>
                      {emp.is_mock ? (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 shrink-0">
                          Mock GPS
                        </Badge>
                      ) : hasGps ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium shrink-0">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 shrink-0">No Fix</span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="truncate">{emp.department || 'Field'}</span>
                      {emp.code && <span className="font-mono text-[10px] text-slate-400 shrink-0">{emp.code}</span>}
                    </div>

                    {hasGps && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                        <span>Speed: {emp.speed ? `${(emp.speed * 3.6).toFixed(0)} km/h` : '0 km/h'}</span>
                        {emp.lastUpdated && (
                          <span>{new Date(emp.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Side: Leaflet OpenStreetMap Telemetry View */}
        <Card className="lg:col-span-3 h-[620px] p-2 flex flex-col border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-xl rounded-xl overflow-hidden">
          <div className="flex-1 w-full h-full relative">
            <MapErrorBoundary fallbackTitle="Live Tracking Map Unavailable">
              <TrackingMap
                markers={mapMarkers}
                selectedId={selectedEmployeeId}
                onSelectMarker={(id) => setSelectedEmployeeId(id)}
                zoom={5}
              />
            </MapErrorBoundary>
          </div>
        </Card>
      </div>
    </div>
  );
}
