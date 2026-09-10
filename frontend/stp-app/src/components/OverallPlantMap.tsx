import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, RefreshCw, Search, Maximize2,
  CheckCircle2, AlertTriangle, Radio, Cpu
} from 'lucide-react';

interface OverallPlantMapProps {
  userDevices?: any[];
  deviceStatusMap?: Record<string, { activeMotors: number; trippedMotors: number }>;
  onSelectDevice?: (deviceId: string) => void;
}

const defaultPlantsList = [
  {
    device_id: '350435032683868',
    device_name: 'VASUNDHARA SECTOR 7 , 8MLD PLANT',
    latitude: 28.657521,
    longitude: 77.376303,
    location_address: 'Vasundhara Sector 7, Ghaziabad, UP',
    mapped: true,
    capacity_liters: 8000000,
    depth_meters: 10.2
  },
  {
    device_id: '350435032680674',
    device_name: 'VASUNDHARA SECTOR 19',
    latitude: 28.667200,
    longitude: 77.371100,
    location_address: 'Vasundhara Sector 19, Ghaziabad, UP',
    mapped: true,
    capacity_liters: 8000000,
    depth_meters: 11.74
  },
  {
    device_id: '350435032689659',
    device_name: 'STP PLANT C',
    latitude: 28.672000,
    longitude: 77.442000,
    location_address: 'Raj Nagar Extension, Ghaziabad, UP',
    mapped: true,
    capacity_liters: 8000000,
    depth_meters: 10.0
  },
  {
    device_id: '350435032681912',
    device_name: 'VAISHALI SECTOR 6',
    latitude: 28.648000,
    longitude: 77.382000,
    location_address: 'Vaishali Sector 6, Ghaziabad, UP',
    mapped: true,
    capacity_liters: 8000000,
    depth_meters: 10.0
  }
];

// Custom Leaflet Green Pin Icon (Online / Motors Active)
const createGreenIcon = (label: string) => L.divIcon({
  className: 'custom-leaflet-pin-green',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0px 4px 10px rgba(16, 185, 129, 0.6));
      cursor: pointer;
    ">
      <div style="
        background: #10B981;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 10px;
        margin-bottom: 2px;
        white-space: nowrap;
        border: 1px solid #047857;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      ">
        ${label}
      </div>
      <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#10B981" stroke="#047857" stroke-width="1.5"/>
        <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
        <circle cx="12" cy="11" r="2.8" fill="#10B981"/>
      </svg>
    </div>
  `,
  iconSize: [80, 52],
  iconAnchor: [40, 52],
  popupAnchor: [0, -48]
});

// Custom Leaflet Red Pin Icon (Fault / Tripped)
const createRedIcon = (label: string) => L.divIcon({
  className: 'custom-leaflet-pin-red',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0px 4px 10px rgba(239, 68, 68, 0.75));
      cursor: pointer;
    ">
      <div style="
        background: #EF4444;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 10px;
        margin-bottom: 2px;
        white-space: nowrap;
        border: 1px solid #991B1B;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        animation: pulse 1.5s infinite;
      ">
        🚨 ${label}
      </div>
      <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#EF4444" stroke="#991B1B" stroke-width="1.5"/>
        <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
        <circle cx="12" cy="11" r="2.8" fill="#EF4444"/>
      </svg>
    </div>
  `,
  iconSize: [80, 52],
  iconAnchor: [40, 52],
  popupAnchor: [0, -48]
});

// Custom Leaflet Gray Icon (Offline / Standby)
const createGrayIcon = (label: string) => L.divIcon({
  className: 'custom-leaflet-pin-gray',
  html: `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0px 3px 6px rgba(100, 116, 139, 0.4));
      cursor: pointer;
    ">
      <div style="
        background: #64748B;
        color: #FFFFFF;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 10px;
        margin-bottom: 2px;
        white-space: nowrap;
        border: 1px solid #334155;
      ">
        ${label}
      </div>
      <svg width="24" height="30" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#64748B" stroke="#334155" stroke-width="1.5"/>
        <circle cx="12" cy="11" r="4" fill="#FFFFFF"/>
      </svg>
    </div>
  `,
  iconSize: [70, 44],
  iconAnchor: [35, 44],
  popupAnchor: [0, -40]
});

export const OverallPlantMap: React.FC<OverallPlantMapProps> = ({
  userDevices = defaultPlantsList,
  deviceStatusMap = {},
  onSelectDevice
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [tileLayerType, setTileLayerType] = useState<'street' | 'satellite'>('street');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Combine default plants with user devices
  const plantsToRender = (userDevices && userDevices.length > 0 ? userDevices : defaultPlantsList).map(d => {
    const matchedDefault = defaultPlantsList.find(dp => dp.device_id === d.device_id);
    return {
      device_id: d.device_id,
      device_name: d.device_name || d.name || 'STP Plant Device',
      latitude: d.latitude || matchedDefault?.latitude || 28.657521,
      longitude: d.longitude || matchedDefault?.longitude || 77.376303,
      location_address: d.location_address || matchedDefault?.location_address || 'Ghaziabad, UP',
      mapped: true,
      activeMotors: deviceStatusMap[d.device_id]?.activeMotors ?? (d.active_motors || 0),
      trippedMotors: deviceStatusMap[d.device_id]?.trippedMotors ?? (d.tripped_motors || 0)
    };
  });

  const filteredPlants = plantsToRender.filter(p =>
    p.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.device_id.includes(searchQuery) ||
    p.location_address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate Metrics KPI counts
  const totalDevicesCount = plantsToRender.length;
  const onlineCount = plantsToRender.filter(p => p.activeMotors > 0).length;
  const faultCount = plantsToRender.filter(p => p.trippedMotors > 0).length;
  const offlineCount = Math.max(0, totalDevicesCount - onlineCount - faultCount);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const initialMap = L.map(containerRef.current, {
        center: [28.6600, 77.3900],
        zoom: 12,
        zoomControl: false,
        scrollWheelZoom: false
      });

      L.control.zoom({ position: 'topleft' }).addTo(initialMap);

      const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const initialTileLayer = L.tileLayer(streetUrl, {
        maxZoom: 19,
        attribution: '&copy; Leaflet | OpenStreetMap contributors'
      }).addTo(initialMap);

      tileLayerRef.current = initialTileLayer;
      mapRef.current = initialMap;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapRef.current) return;
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    const streetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const newLayer = L.tileLayer(tileLayerType === 'street' ? streetUrl : satelliteUrl, {
      maxZoom: 19,
      attribution: tileLayerType === 'street' ? '&copy; Leaflet | OpenStreetMap' : '&copy; Esri World Imagery'
    }).addTo(mapRef.current);

    tileLayerRef.current = newLayer;
  }, [tileLayerType]);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds([]);

    filteredPlants.forEach(plant => {
      const isTripped = plant.trippedMotors > 0;
      const isOnline = plant.activeMotors > 0;

      const shortName = plant.device_name.split(',')[0].replace('VASUNDHARA', 'VAS').replace('SECTOR', 'SEC');
      const pinIcon = isTripped ? createRedIcon(shortName) : isOnline ? createGreenIcon(shortName) : createGrayIcon(shortName);

      const marker = L.marker([plant.latitude, plant.longitude], { icon: pinIcon }).addTo(mapRef.current!);

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; min-width: 240px; padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="
              font-size: 10px;
              font-weight: 800;
              padding: 3px 8px;
              border-radius: 10px;
              background: ${isTripped ? '#FEF2F2' : isOnline ? '#ECFDF5' : '#F1F5F9'};
              color: ${isTripped ? '#DC2626' : isOnline ? '#059669' : '#475569'};
              border: 1px solid ${isTripped ? '#FCA5A5' : isOnline ? '#A7F3D0' : '#CBD5E1'};
            ">
              ${isTripped ? '🚨 FAULT ALARM' : isOnline ? '🟢 ACTIVE PLANT (ONLINE)' : '⚪ STANDBY / IDLE'}
            </span>
            <span style="font-size: 10px; color: #64748B; font-weight: 700;">ID: ${plant.device_id.slice(-6)}</span>
          </div>

          <h4 style="font-size: 14px; font-weight: 800; color: #0F172A; margin: 0 0 4px 0;">
            ${plant.device_name}
          </h4>
          <p style="font-size: 11px; color: #64748B; margin: 0 0 10px 0; font-weight: 600;">
            📍 ${plant.location_address}
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; background: #F8FAFC; padding: 8px; border-radius: 8px; border: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 10px; color: #64748B; font-weight: 700;">PUMPS RUNNING</div>
              <div style="font-size: 13px; font-weight: 800; color: ${isOnline ? '#059669' : '#0F172A'};">
                ${plant.activeMotors} Active ${isTripped ? `(${plant.trippedMotors} Tripped)` : ''}
              </div>
            </div>
            <div>
              <div style="font-size: 10px; color: #64748B; font-weight: 700;">COORDINATES</div>
              <div style="font-size: 11px; font-weight: 700; color: #0284C7;">
                ${plant.latitude.toFixed(4)}° N, ${plant.longitude.toFixed(4)}° E
              </div>
            </div>
          </div>

          <button
            id="btn-select-plant-${plant.device_id}"
            style="
              width: 100%;
              background: #0284C7;
              color: #FFFFFF;
              border: none;
              padding: 8px 12px;
              border-radius: 8px;
              font-size: 12px;
              font-weight: 800;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            "
          >
            <span>🚀 Open Plant Dashboard</span>
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-plant-${plant.device_id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectDevice) {
              onSelectDevice(plant.device_id);
            }
          };
        }
      });

      markersRef.current.push(marker);
      bounds.extend([plant.latitude, plant.longitude]);
    });

    if (filteredPlants.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [filteredPlants]);

  const handleRefresh = () => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 📊 Top KPI Cards Summary (Matching Reference UI) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Total Location Devices */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1.5px solid #3B82F6',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            background: '#EFF6FF',
            color: '#2563EB',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Cpu size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#1E3A8A', lineHeight: 1 }}>
              {totalDevicesCount}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#3B82F6', marginTop: '4px' }}>
              Total Location Devices
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Mapped: <strong style={{ color: '#0F172A' }}>{totalDevicesCount}</strong> | Unmapped: <strong style={{ color: '#64748B' }}>0</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Online */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1.5px solid #10B981',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            background: '#ECFDF5',
            color: '#059669',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#065F46', lineHeight: 1 }}>
              {onlineCount}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
              Online & Active
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Mapped: <strong style={{ color: '#059669' }}>{onlineCount}</strong> | Unmapped: <strong style={{ color: '#64748B' }}>0</strong>
            </div>
          </div>
        </div>

        {/* Card 3: Offline / Standby */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1.5px solid #94A3B8',
          boxShadow: '0 4px 16px rgba(148, 163, 184, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            background: '#F1F5F9',
            color: '#64748B',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Radio size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#334155', lineHeight: 1 }}>
              {offlineCount}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B', marginTop: '4px' }}>
              Offline / Standby
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Mapped: <strong style={{ color: '#334155' }}>{offlineCount}</strong> | Unmapped: <strong style={{ color: '#64748B' }}>0</strong>
            </div>
          </div>
        </div>

        {/* Card 4: Faults */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '18px 20px',
          border: '1.5px solid #EF4444',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            background: '#FEF2F2',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#991B1B', lineHeight: 1 }}>
              {faultCount}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#EF4444', marginTop: '4px' }}>
              Faults & Trips
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Mapped: <strong style={{ color: '#DC2626' }}>{faultCount}</strong> | Unmapped: <strong style={{ color: '#64748B' }}>0</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 🗺️ Main Map Card (Matching Reference Layout) */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden'
      }}>
        {/* Map Card Header Toolbar */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: '#F8FAFC'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#E0F2FE', color: '#0284C7', padding: '8px', borderRadius: '10px' }}>
              <MapPin size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Device Locations Map
              </h3>
              <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 600 }}>
                Real-time geographical tracking across all Ghaziabad STP plants
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} color="#64748B" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search device name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                  background: '#FFFFFF'
                }}
              />
            </div>

            {/* Map View Layer Toggle */}
            <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '10px', padding: '3px' }}>
              <button
                onClick={() => setTileLayerType('street')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: tileLayerType === 'street' ? '#FFFFFF' : 'transparent',
                  color: tileLayerType === 'street' ? '#0284C7' : '#64748B',
                  boxShadow: tileLayerType === 'street' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🗺️ Street
              </button>
              <button
                onClick={() => setTileLayerType('satellite')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  background: tileLayerType === 'satellite' ? '#FFFFFF' : 'transparent',
                  color: tileLayerType === 'satellite' ? '#0284C7' : '#64748B',
                  boxShadow: tileLayerType === 'satellite' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                🛰️ Satellite
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleRefresh}
              title="Refresh Map"
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={handleFullscreen}
              title="Fullscreen"
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Maximize2 size={16} />
            </button>

            {/* Status Legend Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #CBD5E1' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} /> Online
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#64748B' }} /> Standby
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} /> Faults
              </span>
            </div>
          </div>
        </div>

        {/* Leaflet Map Canvas Container */}
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '420px',
            background: '#F1F5F9',
            position: 'relative'
          }}
        />
      </div>

    </div>
  );
};
