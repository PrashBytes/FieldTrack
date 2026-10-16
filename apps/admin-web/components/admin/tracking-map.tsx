'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle2, Clock, Maximize2, Minimize2, MapPin } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  employee_id: string;
  name: string;
  code?: string;
  position: [number, number]; // [lat, lng]
  accuracy?: number | null;
  speed?: number | null;
  is_mock?: boolean;
  status?: string;
  lastUpdated?: string | null;
}

interface TrackingMapProps {
  markers: MapMarkerItem[];
  selectedId?: string | null;
  onSelectMarker?: (id: string) => void;
  center?: [number, number];
  zoom?: number;
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

function RecenterController({
  center,
  zoom,
}: {
  center?: [number, number];
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.setView(center, zoom ?? map.getZoom(), { animate: true });
      } catch {
        // ignore
      }
    }
  }, [center, zoom, map]);

  return null;
}

export default function TrackingMap({
  markers,
  selectedId,
  onSelectMarker,
  center = [20.5937, 78.9629],
  zoom = 5,
  isFullScreen: externalFullScreen,
  onToggleFullScreen,
}: TrackingMapProps) {
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
    setMountId(`tracking-map-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

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

  const activeCenter: [number, number] = useMemo(() => {
    if (selectedId) {
      const selected = markers.find((m) => m.employee_id === selectedId || m.id === selectedId);
      if (selected && selected.position) {
        return selected.position;
      }
    }
    if (markers.length > 0 && markers[0].position) {
      return markers[0].position;
    }
    return center;
  }, [selectedId, markers, center]);

  const createIcon = (isMock?: boolean, isSelected?: boolean) => {
    const bgColor = isMock ? '#ef4444' : '#10b981';
    const border = isSelected ? '3px solid #4f46e5' : '2px solid #ffffff';
    const size = isSelected ? 28 : 22;
    const pulse = isMock ? 'animation: pulse 1.5s infinite;' : '';

    return L.divIcon({
      className: 'ft-map-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${bgColor};
          border: ${border};
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          ${pulse}
        ">
          <div style="width: 6px; height: 6px; background-color: #ffffff; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -(size / 2)],
    });
  };

  if (!isMounted || !mountId) {
    return (
      <div className="flex h-full min-h-[480px] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <MapPin className="h-6 w-6 animate-pulse text-blue-500" />
          <span className="text-xs font-medium">Initializing live map...</span>
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
      {/* Floating Map Controls */}
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
        center={activeCenter}
        zoom={zoom}
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

        <RecenterController
          center={activeCenter}
          zoom={selectedId ? 14 : undefined}
        />

        {markers.map((marker) => {
          const isSelected = selectedId === marker.employee_id || selectedId === marker.id;
          const icon = createIcon(marker.is_mock, isSelected);

          return (
            <Marker
              key={marker.id || marker.employee_id}
              position={marker.position}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectMarker) {
                    onSelectMarker(marker.employee_id || marker.id);
                  }
                },
              }}
            >
              <Popup>
                <div className="p-1 space-y-2 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{marker.name}</span>
                    {marker.is_mock ? (
                      <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 py-0.5">
                        <ShieldAlert className="h-3 w-3" /> Mock GPS
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 text-[10px] px-1.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Live
                      </Badge>
                    )}
                  </div>

                  {marker.code && (
                    <p className="text-xs text-slate-500 font-mono">ID: {marker.code}</p>
                  )}

                  <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-100 pt-1.5">
                    <p>Lat: {marker.position[0].toFixed(5)}, Lng: {marker.position[1].toFixed(5)}</p>
                    {marker.accuracy != null && (
                      <p>Accuracy: ±{Math.round(marker.accuracy)}m</p>
                    )}
                    {marker.speed != null && (
                      <p>Speed: {(marker.speed * 3.6).toFixed(1)} km/h</p>
                    )}
                    {marker.lastUpdated && (
                      <p className="text-slate-400 flex items-center gap-1 text-[11px] pt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(marker.lastUpdated).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
