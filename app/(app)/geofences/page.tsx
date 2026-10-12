'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Hexagon, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { useLeafletMap } from '@/hooks/use-leaflet-map';

type Geofence = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  center: string;
  radius_meters: number;
  is_active: boolean;
};

export default function GeofencesPage() {
  const { profile } = useAuth();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'office', lat: '', lng: '', radius: '100' });
  const { containerRef, mapRef, L, ready } = useLeafletMap({ center: [20, 0], zoom: 2 });
  const circlesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    supabase
      .from('geofences')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setGeofences(data || []);
        setLoading(false);
      });
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!ready || !L || !mapRef.current) return;
    circlesRef.current.forEach((c) => c.remove());
    circlesRef.current = [];

    geofences.forEach((g) => {
      const coords = g.center.replace('POINT(', '').replace(')', '').split(' ');
      const lat = parseFloat(coords[1]);
      const lng = parseFloat(coords[0]);
      const circle = L.circle([lat, lng], {
        radius: g.radius_meters,
        color: g.type === 'office' ? '#3b82f6' : g.type === 'field_site' ? '#10b981' : '#ef4444',
        fillOpacity: 0.2,
      }).addTo(mapRef.current).bindPopup(`<b>${g.name}</b><br/>${g.type}<br/>Radius: ${g.radius_meters}m`);
      circlesRef.current.push(circle);
    });

    if (geofences.length > 0 && circlesRef.current.length > 0) {
      const group = L.featureGroup(circlesRef.current);
      mapRef.current.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
  }, [geofences, ready, L, mapRef]);

  const handleCreate = async () => {
    if (!profile?.organization_id) return;
    setSaving(true);

    const { error } = await supabase.from('geofences').insert({
      organization_id: profile.organization_id,
      name: form.name,
      description: form.description || null,
      type: form.type,
      center: `POINT(${form.lng} ${form.lat})`,
      radius_meters: parseInt(form.radius),
      is_active: true,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Geofence created');
      setDialogOpen(false);
      setForm({ name: '', description: '', type: 'office', lat: '', lng: '', radius: '100' });
      const { data } = await supabase
        .from('geofences')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false });
      setGeofences(data || []);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('geofences').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Geofence deleted');
    setGeofences(geofences.filter((g) => g.id !== id));
  };

  return (
    <div>
      <PageHeader title="Geofences" description="Manage geographic boundaries for attendance validation">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Geofence</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Geofence</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main Office" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="field_site">Field Site</SelectItem>
                    <SelectItem value="restricted_zone">Restricted Zone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude *</Label>
                  <Input type="number" step="any" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="12.9716" />
                </div>
                <div className="space-y-2">
                  <Label>Longitude *</Label>
                  <Input type="number" step="any" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="77.5946" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Radius (meters)</Label>
                <Input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !form.name || !form.lat || !form.lng}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1 h-[500px] overflow-y-auto">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : geofences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Hexagon className="mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No geofences yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {geofences.map((g) => (
                  <div key={g.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-slate-400">{g.type} · {g.radius_meters}m radius</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={g.is_active ? 'success' : 'neutral'}>{g.is_active ? 'active' : 'inactive'}</StatusBadge>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {g.description && <p className="mt-1 text-xs text-slate-500">{g.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 h-[500px] overflow-hidden p-0">
          <div ref={containerRef} className="h-full w-full" style={{ minHeight: '500px' }} />
        </Card>
      </div>
    </div>
  );
}
