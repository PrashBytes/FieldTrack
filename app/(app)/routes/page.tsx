'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Route as RouteIcon, Play, Pause, MapPin } from 'lucide-react';
import { useLeafletMap } from '@/hooks/use-leaflet-map';

type Employee = { id: string; full_name: string; employee_code: string };
type Point = {
  id: string;
  captured_at: string;
  location: string;
  accuracy: number | null;
  is_mock: boolean;
  trust_status: string;
};

export default function RoutesPage() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const { containerRef, mapRef, L, ready } = useLeafletMap({ center: [20, 0], zoom: 2 });
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const replayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('employees')
      .select('id, full_name, employee_code')
      .eq('organization_id', profile.organization_id)
      .eq('employment_status', 'active')
      .order('full_name')
      .then(({ data }) => setEmployees(data || []));
  }, [profile?.organization_id]);

  const fetchRoute = async () => {
    if (!selectedEmployee || !selectedDate || !profile?.organization_id) return;
    setLoading(true);
    setReplayIndex(null);
    if (replayTimer.current) { clearInterval(replayTimer.current); replayTimer.current = null; }

    const dayStart = new Date(selectedDate + 'T00:00:00');
    const dayEnd = new Date(selectedDate + 'T23:59:59');

    const { data } = await supabase
      .from('location_points')
      .select('id, captured_at, location, accuracy, is_mock, trust_status')
      .eq('organization_id', profile.organization_id)
      .eq('employee_id', selectedEmployee)
      .gte('captured_at', dayStart.toISOString())
      .lte('captured_at', dayEnd.toISOString())
      .order('captured_at', { ascending: true })
      .limit(500);

    setPoints(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!ready || !L || !mapRef.current) return;

    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (points.length === 0) return;

    const latlngs: [number, number][] = points.map((p) => {
      const coords = p.location.replace('POINT(', '').replace(')', '').split(' ');
      return [parseFloat(coords[1]), parseFloat(coords[0])];
    });

    polylineRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(mapRef.current);

    if (latlngs.length > 0) {
      const startIcon = L.divIcon({ html: '<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%"></div>', className: '', iconSize: [12, 12], iconAnchor: [6, 6] });
      const endIcon = L.divIcon({ html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid white;border-radius:50%"></div>', className: '', iconSize: [12, 12], iconAnchor: [6, 6] });

      const startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(mapRef.current).bindPopup('Start');
      const endMarker = L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(mapRef.current).bindPopup('End');
      markersRef.current.push(startMarker, endMarker);

      mapRef.current.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [points, ready, L, mapRef]);

  const startReplay = () => {
    if (points.length === 0 || !mapRef.current) return;
    setReplayIndex(0);
    if (replayTimer.current) clearInterval(replayTimer.current);
    replayTimer.current = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev === null || prev >= points.length - 1) {
          if (replayTimer.current) clearInterval(replayTimer.current);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopReplay = () => {
    if (replayTimer.current) { clearInterval(replayTimer.current); replayTimer.current = null; }
    setReplayIndex(null);
  };

  useEffect(() => {
    if (replayIndex === null || !mapRef.current || points.length === 0) return;
    const coords = points[replayIndex].location.replace('POINT(', '').replace(')', '').split(' ');
    mapRef.current.panTo([parseFloat(coords[1]), parseFloat(coords[0])]);
  }, [replayIndex, points, mapRef]);

  useEffect(() => {
    return () => { if (replayTimer.current) clearInterval(replayTimer.current); };
  }, []);

  const totalDistance = () => {
    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      const c1 = points[i - 1].location.replace('POINT(', '').replace(')', '').split(' ');
      const c2 = points[i].location.replace('POINT(', '').replace(')', '').split(' ');
      const lat1 = parseFloat(c1[1]), lng1 = parseFloat(c1[0]);
      const lat2 = parseFloat(c2[1]), lng2 = parseFloat(c2[0]);
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      dist += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    return Math.round(dist);
  };

  return (
    <div>
      <PageHeader title="Route History" description="View and replay employee GPS routes" />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2 flex-1">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Date</Label>
              <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <Button onClick={fetchRoute} disabled={!selectedEmployee || loading}>
              {loading ? <Skeleton className="h-4 w-20" /> : 'Load Route'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {points.length > 0 && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Points: <strong className="text-slate-900">{points.length}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-500">Est. distance: <strong className="text-slate-900">{(totalDistance() / 1000).toFixed(2)} km</strong></span>
            </div>
            <div className="flex items-center gap-2">
              {replayIndex !== null ? (
                <Button size="sm" variant="outline" onClick={stopReplay}><Pause className="mr-1 h-3 w-3" />Stop Replay</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={startReplay}><Play className="mr-1 h-3 w-3" />Replay Route</Button>
              )}
              {replayIndex !== null && <span className="text-xs text-slate-500">{replayIndex + 1}/{points.length}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="h-[500px] overflow-hidden p-0">
        {points.length === 0 && !loading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <RouteIcon className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">Select an employee and date to view route</p>
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" style={{ minHeight: '500px' }} />
        )}
      </Card>
    </div>
  );
}
