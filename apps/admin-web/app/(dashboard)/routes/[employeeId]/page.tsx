'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  ChevronLeft,
  Route as RouteIcon,
  ShieldAlert,
  MapPin,
  Clock,
  User,
  Activity,
} from 'lucide-react';
import type { RoutePoint } from '@/components/admin/route-map';
import { MapErrorBoundary } from '@/components/admin/map-error-boundary';

const RouteMap = dynamic(() => import('@/components/admin/route-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[540px] w-full items-center justify-center rounded-lg border bg-slate-100">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <RouteIcon className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="text-sm font-medium">Reconstructing GPS route trail...</span>
      </div>
    </div>
  ),
});

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
  }
  return null;
}

export default function EmployeeRouteHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile } = useAuth();

  const employeeId = params.employeeId as string;
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [employeeName, setEmployeeName] = useState<string>('Employee');
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [checkInPos, setCheckInPos] = useState<[number, number] | null>(null);
  const [checkOutPos, setCheckOutPos] = useState<[number, number] | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch employee metadata
  useEffect(() => {
    if (!employeeId) return;

    supabase
      .from('employees')
      .select('id, employee_code, profiles (full_name)')
      .eq('id', employeeId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const p = data.profiles as any;
          if (p?.full_name) setEmployeeName(p.full_name);
          if (data.employee_code) setEmployeeCode(data.employee_code);
        }
      });
  }, [employeeId]);

  // 2. Fetch Route points and attendance sessions for selected date
  const loadRouteHistory = useCallback(async () => {
    if (!employeeId || !selectedDate) return;
    setLoading(true);

    try {
      const startOfDay = `${selectedDate}T00:00:00.000Z`;
      const endOfDay = `${selectedDate}T23:59:59.999Z`;

      // A. Fetch attendance session for check-in / check-out markers
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, check_in_time, check_out_time, check_in_location')
        .eq('employee_id', employeeId)
        .gte('check_in_time', startOfDay)
        .lte('check_in_time', endOfDay)
        .order('check_in_time', { ascending: true })
        .limit(1);

      if (sessions && sessions.length > 0) {
        const s = sessions[0];
        setCheckInTime(s.check_in_time);
        setCheckOutTime(s.check_out_time);
        setCheckInPos(parseCoordinates(s.check_in_location));
      } else {
        setCheckInPos(null);
        setCheckOutPos(null);
        setCheckInTime(null);
        setCheckOutTime(null);
      }

      // B. Fetch fraud events for the day to correlate
      const { data: fraudEvents } = await supabase
        .from('fraud_events')
        .select('id, event_type, created_at, details')
        .eq('employee_id', employeeId)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      const fraudTimeSet = new Set(
        fraudEvents?.map((fe) => new Date(fe.created_at).getTime()) || []
      );

      // C. Fetch raw location points
      const { data: rawPoints, error: ptsErr } = await supabase
        .from('location_points')
        .select('id, coordinates, accuracy, speed, is_mock, captured_at')
        .eq('employee_id', employeeId)
        .gte('captured_at', startOfDay)
        .lte('captured_at', endOfDay)
        .order('captured_at', { ascending: true })
        .limit(1000);

      if (ptsErr || !rawPoints) {
        setRoutePoints([]);
        setLoading(false);
        return;
      }

      const parsed: RoutePoint[] = [];
      for (const pt of rawPoints) {
        const coords = parseCoordinates(pt.coordinates);
        if (coords) {
          const ptTime = new Date(pt.captured_at).getTime();
          // Check if there was a fraud anomaly around this time (within 1 min)
          const nearFraud = Array.from(fraudTimeSet).some(
            (ft) => Math.abs(ft - ptTime) < 60000
          );

          parsed.push({
            id: pt.id,
            lat: coords[0],
            lng: coords[1],
            accuracy: pt.accuracy,
            speed: pt.speed,
            is_mock: Boolean(pt.is_mock),
            captured_at: pt.captured_at,
            has_fraud: nearFraud,
            fraud_type: nearFraud ? 'Anomaly Flagged' : undefined,
          });
        }
      }

      setRoutePoints(parsed);

      // If check-out location wasn't stored explicitly, use the final recorded point
      if (sessions && sessions.length > 0 && sessions[0].check_out_time && parsed.length > 0) {
        const lastPt = parsed[parsed.length - 1];
        setCheckOutPos([lastPt.lat, lastPt.lng]);
      }
    } catch (err) {
      console.error('Error fetching route history:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId, selectedDate]);

  useEffect(() => {
    loadRouteHistory();
  }, [loadRouteHistory]);

  const mockPointsCount = useMemo(() => {
    return routePoints.filter((p) => p.is_mock || p.has_fraud).length;
  }, [routePoints]);

  return (
    <div className="space-y-4">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/routes"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Routes Index
          </Link>
          <PageHeader
            title={`${employeeName} — Route Playback`}
            description={`Historical GPS trajectory and anomaly review for ${selectedDate}`}
          />
        </div>

        {/* Date Picker Control */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
          <Calendar className="h-4 w-4 text-slate-500" />
          <Label htmlFor="date-picker" className="text-xs font-medium text-slate-600">
            Date:
          </Label>
          <Input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              router.push(`/routes/${employeeId}?date=${e.target.value}`);
            }}
            className="h-8 text-xs w-36"
          />
          <Button size="sm" variant="outline" onClick={loadRouteHistory} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Telemetry Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border shadow-sm">
          <p className="text-[11px] text-slate-400">Total GPS Waypoints</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{routePoints.length}</p>
        </Card>

        <Card className="p-3 border shadow-sm">
          <p className="text-[11px] text-slate-400">Shift Started (Check-In)</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {checkInTime ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No session'}
          </p>
        </Card>

        <Card className="p-3 border shadow-sm">
          <p className="text-[11px] text-slate-400">Shift Ended (Check-Out)</p>
          <p className="text-sm font-semibold text-slate-800 mt-1">
            {checkOutTime ? new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (checkInTime ? 'In Progress' : '—')}
          </p>
        </Card>

        <Card className="p-3 border shadow-sm">
          <p className="text-[11px] text-slate-400">Integrity Flags</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className={`text-xl font-bold ${mockPointsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {mockPointsCount}
            </span>
            {mockPointsCount > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                Mock / Anomaly
              </Badge>
            )}
          </div>
        </Card>
      </div>

      {/* Map View */}
      <Card className="h-[560px] p-2 flex flex-col border shadow-sm">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center bg-slate-50 rounded-lg">
            <Skeleton className="h-full w-full rounded-lg" />
          </div>
        ) : routePoints.length === 0 && !checkInPos ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
            <RouteIcon className="h-12 w-12 mb-2 opacity-40" />
            <p className="text-sm font-medium">No movement coordinates recorded for this date</p>
            <p className="text-xs text-slate-400 mt-1">
              Select another date using the date selector above.
            </p>
          </div>
        ) : (
          <MapErrorBoundary fallbackTitle="Route Trail Map Unavailable">
            <RouteMap
              points={routePoints}
              checkInLocation={checkInPos}
              checkOutLocation={checkOutPos}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
            />
          </MapErrorBoundary>
        )}
      </Card>
    </div>
  );
}
