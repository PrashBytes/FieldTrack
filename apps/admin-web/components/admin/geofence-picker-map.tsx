'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface GeofencePickerMapProps {
  center: [number, number];
  radiusMeters: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

const pinIcon = L.divIcon({
  className: 'geofence-center-pin',
  html: `
    <div style="
      width: 22px;
      height: 22px;
      background-color: #2563eb;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        map.setView(center, map.getZoom());
      } catch {
        // ignore
      }
    }
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [center, map]);
  return null;
}

export default function GeofencePickerMap({
  center,
  radiusMeters,
  onLocationSelect,
}: GeofencePickerMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mountId, setMountId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    setMountId(`geofence-picker-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

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

  if (!isMounted || !mountId) {
    return (
      <div className="relative h-64 w-full flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400 text-xs">
        Loading geofence picker...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative h-64 w-full overflow-hidden rounded-md border border-slate-200">
      <MapContainer
        key={mountId}
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapClickHandler onSelect={onLocationSelect} />
        <RecenterController center={center} />

        {/* Center Marker */}
        <Marker position={center} icon={pinIcon} />

        {/* Radius Circle Overlay */}
        <Circle
          center={center}
          radius={radiusMeters > 0 ? radiusMeters : 100}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.25,
            weight: 2,
            dashArray: '4, 4',
          }}
        />
      </MapContainer>
    </div>
  );
}
