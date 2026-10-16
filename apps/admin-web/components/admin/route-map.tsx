'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, MapPin, Flag, Clock, Maximize2, Minimize2 } from 'lucide-react';

export interface RoutePoint {
  id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  is_mock?: boolean;
  captured_at: string;
  has_fraud?: boolean;
  fraud_type?: string;
}

interface RouteMapProps {
  points: RoutePoint[];
  checkInLocation?: [number, number] | null;
  checkOutLocation?: [number, number] | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

function MapResizer({ isFullScreen }: { isFullScreen?: boolean }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isFullScreen, map]);

  return null;
}

function BoundsController({
  points,
  checkIn,
  checkOut,
}: {
  points: RoutePoint[];
  checkIn?: [number, number] | null;
  checkOut?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    const latLngs: [number, number][] = points.map((p) => [p.lat, p.lng]);
    if (checkIn) latLngs.push(checkIn);
    if (checkOut) latLngs.push(checkOut);

    if (latLngs.length > 0) {
      try {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      } catch {
        // ignore
      }
    }
  }, [points, checkIn, checkOut, map]);

  return null;
}

const startIcon = L.divIcon({
  className: 'route-start-pin',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background-color: #16a34a;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    ">A</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const endIcon = L.divIcon({
  className: 'route-end-pin',
  html: `
    <div style="
      width: 28px;
      height: 28px;
      background-color: #0f172a;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 11px;
      font-weight: bold;
    ">B</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const mockFraudIcon = L.divIcon({
  className: 'route-fraud-pin',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background-color: #dc2626;
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(220, 38, 38, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1.5s infinite;
    ">
      <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

export default function RouteMap({
  points,
  checkInLocation,
  checkOutLocation,
  checkInTime,
  checkOutTime,
  isFullScreen: externalFullScreen,
  onToggleFullScreen,
}: RouteMapProps) {
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [mountId, setMountId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const isFullScreen =
    externalFullScreen !== undefined ? externalFullScreen : internalFullScreen;

  const handleToggleFullScreen = () => {
    if (onToggleFullScreen) {
      onToggleFullScreen();
    } else {
      setInternalFullScreen((prev) => !prev);
    }
  };

  // Strictly ensure client-only mounting and clean up any dangling leaflet IDs
  useEffect(() => {
    setIsMounted(true);
    setMountId(`route-map-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

    return () => {
      setIsMounted(false);
      const el = containerRef.current;
      if (el) {
        const leafletElements = el.querySelectorAll('.leaflet-container');
        leafletElements.forEach((leafEl) => {
          if ((leafEl as any)._leaflet_id) {
            delete (leafEl as any)._leaflet_id;
          }
        });
        if ((el as any)._leaflet_id) {
          delete (el as any)._leaflet_id;
        }
      }
    };
  }, []);

  const polylinePositions: [number, number][] = useMemo(() => {
    return points.map((p) => [p.lat, p.lng]);
  }, [points]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (checkInLocation) return checkInLocation;
    if (points.length > 0) return [points[0].lat, points[0].lng];
    return [20.5937, 78.9629];
  }, [checkInLocation, points]);

  // Points flagged with mock location or fraud
  const flaggedPoints = useMemo(() => {
    return points.filter((p) => p.is_mock || p.has_fraud);
  }, [points]);

  if (!isMounted || !mountId) {
    return (
      <div className="flex h-full min-h-[480px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="h-6 w-6 animate-pulse text-blue-500" />
          <span className="text-xs font-medium">Reconstructing route map...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        isFullScreen
          ? 'fixed inset-0 z-[9999] w-screen h-screen bg-background overflow-hidden'
          : 'relative h-full w-full overflow-hidden rounded-xl border border-slate-200'
      }
    >
      {/* Floating Fullscreen Control */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleFullScreen}
          className="h-8 gap-1.5 bg-white/95 backdrop-blur-sm border-slate-200 shadow-md text-xs font-medium hover:bg-slate-50 text-slate-700"
          title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullScreen ? (
            <>
              <Minimize2 className="h-3.5 w-3.5 text-slate-600" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-3.5 w-3.5 text-slate-600" />
              Fullscreen
            </>
          )}
        </Button>
      </div>

      <MapContainer
        key={mountId}
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapResizer isFullScreen={isFullScreen} />

        <BoundsController
          points={points}
          checkIn={checkInLocation}
          checkOut={checkOutLocation}
        />

        {/* Chronological Route Polyline */}
        {polylinePositions.length > 1 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#2563eb',
              weight: 4,
              opacity: 0.8,
              lineJoin: 'round',
            }}
          />
        )}

        {/* Regular Waypoint breadcrumb dots (every few points) */}
        {points.map((pt, index) => {
          if (index % 5 !== 0 || pt.is_mock || pt.has_fraud) return null;
          return (
            <CircleMarker
              key={pt.id}
              center={[pt.lat, pt.lng]}
              radius={4}
              pathOptions={{
                color: '#3b82f6',
                fillColor: '#ffffff',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs space-y-1 p-1">
                  <p className="font-semibold text-slate-800">Waypoint #{index + 1}</p>
                  <p className="text-slate-500">{new Date(pt.captured_at).toLocaleTimeString()}</p>
                  {pt.speed != null && <p>Speed: {(pt.speed * 3.6).toFixed(1)} km/h</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Distinct Check-In Location Marker */}
        {checkInLocation && (
          <Marker position={checkInLocation} icon={startIcon}>
            <Popup>
              <div className="p-1 space-y-1 min-w-[160px]">
                <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                  <Flag className="h-3.5 w-3.5" /> Shift Check-In
                </div>
                {checkInTime && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(checkInTime).toLocaleTimeString()}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-mono">
                  {checkInLocation[0].toFixed(5)}, {checkInLocation[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Distinct Check-Out Location Marker */}
        {checkOutLocation && (
          <Marker position={checkOutLocation} icon={endIcon}>
            <Popup>
              <div className="p-1 space-y-1 min-w-[160px]">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                  <MapPin className="h-3.5 w-3.5" /> Shift Check-Out
                </div>
                {checkOutTime && (
                  <p className="text-xs text-slate-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(checkOutTime).toLocaleTimeString()}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-mono">
                  {checkOutLocation[0].toFixed(5)}, {checkOutLocation[1].toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Flagged Red Mock GPS / Fraud Anomaly Markers */}
        {flaggedPoints.map((pt) => (
          <Marker key={`fraud-${pt.id}`} position={[pt.lat, pt.lng]} icon={mockFraudIcon}>
            <Popup>
              <div className="p-1 space-y-1.5 min-w-[180px]">
                <div className="flex items-center justify-between">
                  <Badge variant="destructive" className="flex items-center gap-1 text-[10px]">
                    <ShieldAlert className="h-3 w-3" />
                    {pt.fraud_type || 'Mock GPS Detected'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Time: {new Date(pt.captured_at).toLocaleTimeString()}
                </p>
                {pt.speed != null && (
                  <p className="text-xs font-semibold text-red-600">
                    Speed: {(pt.speed * 3.6).toFixed(1)} km/h
                  </p>
                )}
                <p className="text-[11px] text-slate-400 font-mono">
                  {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
