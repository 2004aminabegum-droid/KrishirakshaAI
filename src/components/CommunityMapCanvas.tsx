'use client';

import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface CommunityMapPoint {
  id: string;
  farmCode: string;
  crop: string;
  disease: string;
  village: string;
  latitude: number;
  longitude: number;
  severity: 'high' | 'medium' | 'low';
  pestCount24h?: number;
}

interface CommunityMapCanvasProps {
  points: CommunityMapPoint[];
  selectedId: string;
  showClusterLines: boolean;
  onSelect: (point: CommunityMapPoint) => void;
}

const severityColor = { high: '#f43f5e', medium: '#f59e0b', low: '#22c55e' };

function MapViewport({ points }: { points: CommunityMapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].latitude, points[0].longitude], 11);
    if (points.length > 1) map.fitBounds(points.map(point => [point.latitude, point.longitude] as [number, number]), { padding: [42, 42] });
  }, [map, points]);
  return null;
}

function markerIcon(point: CommunityMapPoint, selected: boolean) {
  const color = severityColor[point.severity];
  return L.divIcon({
    className: 'community-map-marker',
    html: `<span style="display:block;width:${selected ? 24 : 18}px;height:${selected ? 24 : 18}px;border-radius:50%;background:${color};border:3px solid #020617;box-shadow:0 0 0 ${selected ? 7 : 4}px ${color}55,0 3px 8px #0008"></span>`,
    iconSize: [selected ? 24 : 18, selected ? 24 : 18],
    iconAnchor: [selected ? 12 : 9, selected ? 12 : 9]
  });
}

export default function CommunityMapCanvas({ points, selectedId, showClusterLines, onSelect }: CommunityMapCanvasProps) {
  const center: [number, number] = points.length ? [points[0].latitude, points[0].longitude] : [22.9, 88.25];
  const lineGroups = showClusterLines ? [points.map(point => [point.latitude, point.longitude] as [number, number])] : [];

  return <MapContainer center={center} zoom={9} scrollWheelZoom className="h-full min-h-[430px] w-full rounded-xl">
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapViewport points={points} />
    {lineGroups.map((group, index) => <Polyline key={index} positions={group} pathOptions={{ color: '#f59e0b', weight: 2, dashArray: '6 8', opacity: 0.75 }} />)}
    {points.map(point => <Marker key={point.id} position={[point.latitude, point.longitude]} icon={markerIcon(point, point.id === selectedId)} eventHandlers={{ click: () => onSelect(point) }}>
      <Popup><strong>{point.farmCode}</strong><br />{point.village}<br />{point.crop} · {point.disease}<br />Risk: {point.severity.toUpperCase()}</Popup>
    </Marker>)}
  </MapContainer>;
}
