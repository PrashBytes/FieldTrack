'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Hexagon, Plus, Trash2, Loader2, MapPin } from 'lucide-react';
import { MapErrorBoundary } from '@/components/admin/map-error-boundary';

const GeofencePickerMap = dynamic(
  () => import('@/components/admin/geofence-picker-map'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-md" />,
  }
);

interface GeofenceItem {
  id: string;
  name: string;
  type: string;
  center: any;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

function parsePoint(center: any): [number, number] {
  if (typeof center === 'string') {
    const match = center.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])]; // [lat, lng]
    }
  }
  if (typeof center === 'object' && Array.isArray(center?.coordinates)) {
    return [center.coordinates[1], center.coordinates[0]]; // [lat, lng]
  }
  return [12.9716, 77.5946]; // Default fallback
}

export default function GeofencesPage() {
  const { profile } = useAuth();
  const [geofences, setGeofences] = useState<GeofenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('office');
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [radiusMeters, setRadiusMeters] = useState('150');

  const fetchGeofences = useCallback(async () => {
    if (!profile?.organization_id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading geofences:', error);
        const { MOCK_GEOFENCES } = await import('@/lib/supabase/mock-data');
        setGeofences(MOCK_GEOFENCES as any);
      } else {
        const list = (data as unknown as GeofenceItem[]) || [];
        if (list.length === 0) {
          const { MOCK_GEOFENCES } = await import('@/lib/supabase/mock-data');
          setGeofences(MOCK_GEOFENCES as any);
        } else {
          setGeofences(list);
        }
      }
    } catch (err) {
      console.error(err);
      try {
        const { MOCK_GEOFENCES } = await import('@/lib/supabase/mock-data');
        setGeofences(MOCK_GEOFENCES as any);
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const handleCreateGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organization_id) return;

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    const parsedRadius = parseFloat(radiusMeters);

    if (isNaN(parsedLat) || isNaN(parsedLng) || isNaN(parsedRadius) || !name.trim()) {
      toast.error('Please enter a valid geofence name, radius, and coordinates.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('geofences').insert({
        organization_id: profile.organization_id,
        name: name.trim(),
        type,
        center: `POINT(${parsedLng} ${parsedLat})`,
        radius_meters: parsedRadius,
        is_active: true,
      });

      if (error) {
        toast.error(`Failed to create geofence: ${error.message}`);
      } else {
        toast.success(`Geofence "${name}" created successfully.`);
        setDialogOpen(false);
        setName('');
        setRadiusMeters('150');
        fetchGeofences();
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating geofence');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGeofence = async (id: string, geofenceName: string) => {
    if (!confirm(`Are you sure you want to delete geofence "${geofenceName}"?`)) return;

    try {
      const { error } = await supabase.from('geofences').delete().eq('id', id);
      if (error) {
        toast.error(`Delete failed: ${error.message}`);
      } else {
        toast.success('Geofence removed.');
        setGeofences((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting geofence');
    }
  };

  const currentMapCenter: [number, number] = [
    parseFloat(lat) || 12.9716,
    parseFloat(lng) || 77.5946,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <PageHeader
          title="Geofence Management"
          description="Define virtual geographical boundaries for automated shift attendance verification"
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-500/20 font-medium">
              <Plus className="h-4 w-4" /> Create Geofence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl border-slate-800 bg-slate-900 text-slate-100 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Hexagon className="h-5 w-5 text-indigo-400" /> Create Worksite Geofence
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateGeofence} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="geo-name" className="text-xs font-medium text-slate-300">
                    Geofence Name *
                  </Label>
                  <Input
                    id="geo-name"
                    placeholder="e.g. Headquarters / Site A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="geo-type" className="text-xs font-medium text-slate-300">
                    Location Type
                  </Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="geo-type" className="border-slate-800 bg-slate-950/70 text-slate-200 focus:border-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="office">Corporate Office</SelectItem>
                      <SelectItem value="field_site">Client / Field Site</SelectItem>
                      <SelectItem value="restricted_zone">Restricted Zone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Interactive Map Picker */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1 text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Click Map to Set Center Point
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    Radius: {radiusMeters}m
                  </span>
                </div>
                <MapErrorBoundary fallbackTitle="Geofence Map Unavailable">
                  <GeofencePickerMap
                    center={currentMapCenter}
                    radiusMeters={parseFloat(radiusMeters) || 100}
                    onLocationSelect={(clickedLat, clickedLng) => {
                      setLat(clickedLat.toFixed(6));
                      setLng(clickedLng.toFixed(6));
                    }}
                  />
                </MapErrorBoundary>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="geo-lat" className="text-xs text-slate-300">
                    Latitude
                  </Label>
                  <Input
                    id="geo-lat"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="font-mono text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="geo-lng" className="text-xs text-slate-300">
                    Longitude
                  </Label>
                  <Input
                    id="geo-lng"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="font-mono text-xs bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="geo-radius" className="text-xs text-slate-300">
                    Radius (Meters)
                  </Label>
                  <Input
                    id="geo-radius"
                    type="number"
                    min="20"
                    max="5000"
                    value={radiusMeters}
                    onChange={(e) => setRadiusMeters(e.target.value)}
                    className="bg-slate-950/70 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Geofence
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Geofences Data Table */}
      <Card className="border border-slate-800/80 bg-slate-900/80 text-slate-100 shadow-xl rounded-xl">
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md bg-slate-800/60" />
              ))}
            </div>
          ) : geofences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
              <Hexagon className="h-10 w-10 mb-2 opacity-40 text-indigo-400" />
              <p className="text-base font-bold text-white">No Geofences Configured</p>
              <p className="text-xs text-slate-400 mt-1">
                Create virtual worksite boundaries to validate employee check-in proximity.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/80 overflow-x-auto shadow-2xs bg-slate-950/40">
              <Table>
                <TableHeader className="bg-slate-950/80 border-b border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">Geofence Name</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">Zone Type</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">Center Coordinates</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">Radius</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3">Status</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60 bg-transparent">
                  {geofences.map((geo) => {
                    const coords = parsePoint(geo.center);
                    return (
                      <TableRow key={geo.id} className="hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-semibold text-white">
                          {geo.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs border-slate-700 text-slate-300 bg-slate-800/50">
                            {geo.type?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-400">
                          {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-300">
                          {geo.radius_meters} meters
                        </TableCell>
                        <TableCell>
                          <Badge className={geo.is_active ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60' : 'bg-slate-800 text-slate-400 border border-slate-700'}>
                            {geo.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGeofence(geo.id, geo.name)}
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
