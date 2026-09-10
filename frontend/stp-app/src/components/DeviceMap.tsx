import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Radio, Globe, Waves, Zap } from 'lucide-react';

interface DeviceMapProps {
  deviceId: string;
  deviceName: string;
  waterLevel: number;
  activeMotorsCount: number;
  trippedMotorsCount?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  userDevices?: any[];
  deviceStatusMap?: Record<string, { activeMotors: number; trippedMotors: number }>;
  onSelectDevice?: (deviceId: string) => void;
}

const defaultPlants = [
  { device_id: '350435032683868', device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT', latitude: 28.657521, longitude: 77.376303, active_motors: 0, tripped_motors: 0 },
  { device_id: '350435032680674', device_name: 'VASUNDHARA SECTOR 19', latitude: 28.668500, longitude: 77.439000, active_motors: 2, tripped_motors: 0 },
  { device_id: '350435032689659', device_name: 'STP PLANT C', latitude: 28.672000, longitude: 77.442000, active_motors: 0, tripped_motors: 0 },
  { device_id: '350435032681912', device_name: 'VAISHALI SECTOR 6', latitude: 28.648000, longitude: 77.382000, active_motors: 1, tripped_motors: 0 }
];

// 🟢 Green SVG Pin Marker Icon (Motors Running)
const greenPinIcon = L.divIcon({
  className: 'leaflet-green-pin-marker',
  html: `
    <div style="
      position: relative;
      width: 26px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0px 3px 8px rgba(16, 185, 129, 0.55));
    ">
      <svg width="26" height="34" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#10B981" stroke="#047857" stroke-width="1.4"/>
        <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
        <circle cx="12" cy="11" r="2.2" fill="#10B981"/>
      </svg>
    </div>
  `,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30]
});

// 🔴 Red SVG Pin Marker Icon (Trip / Fault Occurred)
const redPinIcon = L.divIcon({
  className: 'leaflet-red-pin-marker',
  html: `
    <div style="
      position: relative;
      width: 26px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0px 3px 8px rgba(239, 68, 68, 0.6));
    ">
      <svg width="26" height="34" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#EF4444" stroke="#991B1B" stroke-width="1.4"/>
        <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
        <circle cx="12" cy="11" r="2.2" fill="#EF4444"/>
      </svg>
    </div>
  `,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -30]
});

// 🔵 Blue SVG Pin Marker Icon (Idle / Motors Off)
const bluePinIcon = L.divIcon({
  className: 'leaflet-blue-pin-marker',
  html: `
    <div style="
      position: relative;
      width: 22px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0px 2px 5px rgba(2, 132, 199, 0.4));
      cursor: pointer;
    ">
      <svg width="22" height="28" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#0284C7" stroke="#0369A1" stroke-width="1.2"/>
        <circle cx="12" cy="11" r="3.5" fill="#FFFFFF"/>
      </svg>
    </div>
  `,
  iconSize: [22, 28],
  iconAnchor: [11, 28],
  popupAnchor: [0, -24]
});

export const DeviceMap: React.FC<DeviceMapProps> = ({
  deviceId,
  deviceName = "STP Telemetry Device",
  waterLevel,
  activeMotorsCount,
  trippedMotorsCount = 0,
  latitude,
  longitude,
  locationName,
  userDevices = [],
  deviceStatusMap = {},
  onSelectDevice,
}) => {
  const finalLat = latitude ?? 28.6685;
  const finalLng = longitude ?? 77.4390;
  const finalAddress = locationName || `${deviceName} (${finalLat}° N, ${finalLng}° E)`;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const initialFitDoneRef = useRef<boolean>(false);
  const onSelectDeviceRef = useRef(onSelectDevice);

  onSelectDeviceRef.current = onSelectDevice;

  // Helper to resolve icon by status
  const getMarkerIcon = (devActive: number, devTripped: number) => {
    if (devTripped > 0) return redPinIcon;
    if (devActive > 0) return greenPinIcon;
    return bluePinIcon;
  };

  // 1. Initialize Map & Markers ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [finalLat, finalLng],
      zoom: 13,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    const plantsList = userDevices.length > 0 ? userDevices : defaultPlants;
    const allPlantsToRender = plantsList.map(p => {
      const fallback = defaultPlants.find(dp => dp.device_id === p.device_id);
      return {
        device_id: p.device_id,
        device_name: p.device_name || p.name || fallback?.device_name || 'STP Plant',
        latitude: p.latitude || fallback?.latitude || finalLat,
        longitude: p.longitude || fallback?.longitude || finalLng,
        active_motors: p.active_motors ?? fallback?.active_motors ?? 0,
        tripped_motors: p.tripped_motors ?? fallback?.tripped_motors ?? 0
      };
    });

    const bounds: L.LatLngTuple[] = [];

    allPlantsToRender.forEach(plant => {
      const pLat = plant.latitude;
      const pLng = plant.longitude;
      bounds.push([pLat, pLng]);

      const isSelected = plant.device_id === deviceId;
      const iconToUse = getMarkerIcon(plant.active_motors, plant.tripped_motors);
      const marker = L.marker([pLat, pLng], { icon: iconToUse }).addTo(map);
      markersMapRef.current.set(plant.device_id, marker);

      const popupDiv = document.createElement('div');
      popupDiv.style.fontFamily = 'sans-serif';
      popupDiv.style.padding = '4px';

      popupDiv.innerHTML = `
        <div style="font-size: 12px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">
          ${plant.device_name}
        </div>
        <div style="font-size: 10px; font-weight: 600; color: #0284C7; margin-bottom: 4px;">
          📍 ${pLat.toFixed(4)}° N | ${pLng.toFixed(4)}° E
        </div>
        <div style="font-size: 9px; color: #64748B; margin-bottom: 6px; font-family: monospace;">
          ID: ${plant.device_id}
        </div>
        <button id="btn-map-select-${plant.device_id}" style="
          width: 100%;
          padding: 5px 10px;
          border-radius: 6px;
          border: none;
          background: #0284C7;
          color: #FFFFFF;
          font-weight: 700;
          font-size: 10px;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(0,0,0,0.12);
        ">
          📊 Select Plant Details
        </button>
      `;

      marker.bindPopup(popupDiv, { autoPan: false });

      if (isSelected) {
        marker.openPopup();
      }

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-map-select-${plant.device_id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            if (onSelectDeviceRef.current) {
              onSelectDeviceRef.current(plant.device_id);
            }
          };
        }
      });

      marker.on('click', () => {
        if (onSelectDeviceRef.current) {
          onSelectDeviceRef.current(plant.device_id);
        }
      });
    });

    if (!initialFitDoneRef.current && bounds.length > 0) {
      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30], maxZoom: 14, animate: false });
      } else {
        map.setView([finalLat, finalLng], 14, { animate: false });
      }
      initialFitDoneRef.current = true;
    }

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, []);

  // 2. Dynamically Update Pin Colors across ALL Plants by Live Motor Status (Green = Running, Red = Tripped, Blue = Idle)
  useEffect(() => {
    markersMapRef.current.forEach((marker, pDevId) => {
      const isSelected = pDevId === deviceId;
      const statusFromMap = deviceStatusMap?.[pDevId];
      const fallbackPlant = defaultPlants.find(dp => dp.device_id === pDevId);

      const actCount = statusFromMap?.activeMotors ?? (isSelected ? activeMotorsCount : (fallbackPlant?.active_motors ?? 0));
      const tripCount = statusFromMap?.trippedMotors ?? (isSelected ? trippedMotorsCount : (fallbackPlant?.tripped_motors ?? 0));

      let iconToUse = bluePinIcon;
      let statusLabel = isSelected ? '✓ ACTIVE PLANT (IDLE)' : '📊 Select Plant Details';
      let statusBg = '#0284C7';

      if (tripCount > 0) {
        iconToUse = redPinIcon;
        statusLabel = isSelected ? `⚠️ ${tripCount} MOTOR TRIPPED` : `⚠️ TRIPPED (${tripCount})`;
        statusBg = '#EF4444';
      } else if (actCount > 0) {
        iconToUse = greenPinIcon;
        statusLabel = isSelected ? `⚡ ${actCount} MOTOR(S) RUNNING` : `⚡ RUNNING (${actCount})`;
        statusBg = '#059669';
      } else {
        iconToUse = bluePinIcon;
        statusLabel = isSelected ? '✓ ACTIVE PLANT (IDLE)' : '✓ IDLE / OFF';
        statusBg = '#0284C7';
      }

      marker.setIcon(iconToUse);

      const btn = document.getElementById(`btn-map-select-${pDevId}`);
      if (btn) {
        btn.style.background = statusBg;
        btn.innerHTML = statusLabel;
      }

      if (isSelected && mapInstanceRef.current) {
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
      }
    });
  }, [deviceId, activeMotorsCount, trippedMotorsCount, deviceStatusMap]);

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #CBD5E1',
      borderRadius: '16px',
      padding: '20px',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '480px',
      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#F0F9FF',
            padding: '8px',
            borderRadius: '10px',
            border: '1px solid #BAE6FD'
          }}>
            <MapPin size={20} color="#0284C7" />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Location
            </h3>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
              {deviceName} • Live GPS Coordinates
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 700,
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#059669',
              boxShadow: '0 0 8px #059669',
              display: 'inline-block'
            }} />
            GPS ONLINE
          </span>
        </div>
      </div>

      {/* Pure Leaflet Map Container */}
      <div style={{
        position: 'relative',
        flex: 1,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #CBD5E1',
        minHeight: '300px',
        background: '#F8FAFC',
        zIndex: 1
      }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '300px'
          }}
        />
      </div>

      {/* Telemetry & Site Location Info Cards */}
      <div style={{
        marginTop: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px'
      }}>
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Radio size={12} color="#0284C7" /> Device ID / Serial
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
            {deviceId}
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Navigation size={12} color="#059669" /> Coordinates
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>
            {finalLat}° N, {finalLng}° E
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Waves size={12} color="#0284C7" /> Water Level & Depth
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
            {waterLevel}% ({((waterLevel / 100) * (deviceId === '350435032683868' ? 10.2 : deviceId === '350435032680674' ? 11.74 : 10.0)).toFixed(2)}m / {deviceId === '350435032683868' ? 10.2 : deviceId === '350435032680674' ? 11.74 : 10.0}m)
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
            <Zap size={12} color="#059669" /> Active Pumps
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: activeMotorsCount > 0 ? '#059669' : '#64748B', fontFamily: 'monospace' }}>
            {activeMotorsCount} / 5 Running
          </div>
        </div>

        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '10px 12px',
          gridColumn: '1 / -1'
        }}>
          <div style={{ fontSize: '10px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Globe size={12} color="#7C3AED" /> Plant Site Address
          </div>
          <div style={{ fontSize: '11px', color: '#334155', fontWeight: 500 }}>
            {finalAddress}
          </div>
        </div>
      </div>
    </div>
  );
};
