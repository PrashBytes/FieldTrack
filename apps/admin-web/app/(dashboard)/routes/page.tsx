'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Route as RouteIcon, Calendar, ArrowRight, ShieldAlert, MapPin, Users } from 'lucide-react';
import type { RoutePoint } from '@/components/admin/route-map';
import { MapErrorBoundary } from '@/components/admin/map-error-boundary';

const RouteMap = dynamic(() => import('@/components/admin/route-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

interface EmployeeItem {
  id: string;
  employee_code?: string | null;
  department?: string | null;
  profiles?: {
    full_name?: string | null;
  } | null;
}

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

export default function RoutesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [checkInPos, setCheckInPos] = useState<[number, number] | null>(null);
  const [checkOutPos, setCheckOutPos] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);

  // Load employees belonging to organization
  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('employees')
      .select('id, employee_code, department, profiles (full_name)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as unknown as EmployeeItem[]) || [];
        setEmployees(list);
        if (list.length > 0 && !selectedEmployeeId) {
          setSelectedEmployeeId(list[0].id);
        }
      });
  }, [profile?.organization_id, selectedEmployeeId]);

  // Load route history for selected employee & date
  const fetchRoute = useCallback(async () => {
    if (!selectedEmployeeId || !selectedDate || !profile?.organization_id) return;
    setLoading(true);

    const startOfDay = `${selectedDate}T00:00:00.000Z`;
    const endOfDay = `${selectedDate}T23:59:59.999Z`;

    try {
      // 1. Fetch attendance session
      const { data: sessions } = await supabase
        .from('attendance_sessions')
        .select('id, check_in_time, check_out_time, check_in_location')
        .eq('employee_id', selectedEmployeeId)
        .gte('check_in_time', startOfDay)
        .lte('check_in_time', endOfDay)
        .order('check_in_time', { ascending: true })
        .limit(1);

      if (sessions && sessions.length > 0) {
        setCheckInPos(parseCoordinates(sessions[0].check_in_location));
      } else {
        setCheckInPos(null);
        setCheckOutPos(null);
      }

      // 2. Fetch location points
      const { data: rawPoints } = await supabase
        .from('location_points')
        .select('id, coordinates, accuracy, speed, is_mock, captured_at')
        .eq('employee_id', selectedEmployeeId)
        .gte('captured_at', startOfDay)
        .lte('captured_at', endOfDay)
        .order('captured_at', { ascending: true })
        .limit(1000);

      const parsed: RoutePoint[] = [];
      for (const pt of rawPoints || []) {
        const coords = parseCoordinates(pt.coordinates);
        if (coords) {
          parsed.push({
            id: pt.id,
            lat: coords[0],
            lng: coords[1],
            accuracy: pt.accuracy,
            speed: pt.speed,
            is_mock: Boolean(pt.is_mock),
            captured_at: pt.captured_at,
          });
        }
      }

      setPoints(parsed);

      if (parsed.length > 0 && sessions && sessions[0]?.check_out_time) {
        const last = parsed[parsed.length - 1];
        setCheckOutPos([last.lat, last.lng]);
      }
    } catch (err) {
      console.error('Error fetching route:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedEmployeeId, selectedDate, profile?.organization_id]);

  useEffect(() => {
    fetchRoute();
  }, [fetchRoute]);

  const selectedEmp = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Historical Route Replay"
          description="Inspect breadcrumb telemetry paths, check-in pins, and spoofing flags"
        />

        {selectedEmployeeId && (
          <Link href={`/routes/${selectedEmployeeId}?date=${selectedDate}`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              Dedicated Fullscreen View <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </div>

      {/* Control Filters Bar */}
      <Card className="p-4 border shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="employee-select" className="text-xs font-medium text-slate-500">
              Select Field Employee
            </Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger id="employee-select" className="w-full">
                <SelectValue placeholder="Choose an employee..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.profiles?.full_name || 'Staff Member'} {emp.employee_code ? `(${emp.employee_code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date-input" className="text-xs font-medium text-slate-500">
              Inspection Date
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40 text-xs"
              />
              <Button size="sm" onClick={fetchRoute} disabled={loading}>
                Load Trail
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Map Card */}
      <Card className="h-[580px] p-2 flex flex-col border shadow-sm">
        {loading ? (
          <Skeleton className="h-full w-full rounded-lg" />
        ) : points.length === 0 && !checkInPos ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
            <RouteIcon className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm font-medium">No movement coordinates found for this employee on {selectedDate}</p>
            <p className="text-xs text-slate-400 mt-1">
              Select another employee or date to visualize their historical route.
            </p>
          </div>
        ) : (
          <MapErrorBoundary fallbackTitle="Historical Route Map Unavailable">
            <RouteMap
              points={points}
              checkInLocation={checkInPos}
              checkOutLocation={checkOutPos}
            />
          </MapErrorBoundary>
        )}
      </Card>
    </div>
  );
}
