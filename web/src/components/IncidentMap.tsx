'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useIncidents } from '@/hooks/api/useGridSense';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Custom colored icons
const createIcon = (color: string) => {
  if (typeof window === 'undefined') return undefined as any;
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const getIcons = () => {
  if (typeof window === 'undefined') return { high: null, medium: null, low: null, default: null };
  return {
    high: createIcon('red'),
    medium: createIcon('orange'),
    low: createIcon('green'),
    default: createIcon('blue')
  };
};

interface IncidentMapProps {
  onIncidentSelect: (incident: any) => void;
}

export default function IncidentMap({ onIncidentSelect }: IncidentMapProps) {
  const { data: incidents, isLoading, isError } = useIncidents();
  const position: [number, number] = [12.9716, 77.5946]; // Bengaluru
  const icons = getIcons();

  if (isLoading) {
    return <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-zinc-500"><Loader2 className="animate-spin h-8 w-8 mr-2" /> Loading Map Data...</div>;
  }

  if (isError) {
    return <div className="h-full w-full flex items-center justify-center bg-zinc-950 text-red-500">Error loading map incidents</div>;
  }

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer center={position} zoom={11} scrollWheelZoom={true} className="h-full w-full" style={{ background: '#09090b' }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {incidents?.map((incident: any) => {
          if (!incident.latitude || !incident.longitude) return null;
          
          let icon = icons.default;
          if (incident.priority === 'High') icon = icons.high;
          else if (incident.priority === 'Medium') icon = icons.medium;
          else if (incident.priority === 'Low') icon = icons.low;

          return (
            <Marker 
              key={incident.id} 
              position={[incident.latitude, incident.longitude]} 
              icon={icon}
              eventHandlers={{
                click: () => onIncidentSelect(incident)
              }}
            >
              <Popup>
                <div className="text-sm font-semibold text-black">{incident.event_cause}</div>
                <div className="text-xs text-zinc-600">{incident.corridor}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
