import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Radio, Globe, Waves, Zap } from 'lucide-react';

interface DeviceMapProps {
  deviceId: string;
  deviceName: string;
  waterLevel: number;
  activeMotorsCount: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export const DeviceMap: React.FC<DeviceMapProps> = ({
  deviceId,
  deviceName = "STP Telemetry Device",
  waterLevel,
  activeMotorsCount,
  latitude = 28.6685,
  longitude = 77.4390,
  locationName = "Ghaziabad STP Plant Site (28.667°–28.670° N, 77.433°–77.445° E)",
}) => {
  // Device specific hardcoded GPS coordinates mapping
  const deviceCoordinates: Record<string, { lat: number; lng: number; address: string }> = {
    '350435032683868': {
      lat: 28.657521,
      lng: 77.376303,
      address: 'Ghaziabad STP Plant Site A (28.657521° N, 77.376303° E)'
    }
  };

  const finalLat = latitude ?? deviceCoordinates[deviceId]?.lat ?? 28.6685;
  const finalLng = longitude ?? deviceCoordinates[deviceId]?.lng ?? 77.4390;
  const finalAddress = locationName || `Ghaziabad STP Plant Site (${finalLat}° N, ${finalLng}° E)`;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Red SVG Location Pin Marker Icon
    const customPinIcon = L.divIcon({
      className: 'leaflet-red-pin-marker',
      html: `
        <div style="
          position: relative;
          width: 32px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0px 3px 6px rgba(15, 23, 42, 0.35));
        ">
          <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#EF4444" stroke="#B91C1C" stroke-width="1.2"/>
            <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -38]
    });

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [finalLat, finalLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: true
    });

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Set map view center
    map.setView([finalLat, finalLng], 16);

    // Add Marker at exact GPS coordinates (28.657521° N, 77.376303° E)
    const marker = L.marker([finalLat, finalLng], { icon: customPinIcon }).addTo(map);
    marker.bindPopup(`
      <div style="font-family: sans-serif; padding: 2px;">
        <strong style="color: #0F172A; font-size: 13px;">${deviceName}</strong><br/>
        <span style="color: #0284C7; font-size: 11px; font-weight: 600;">Lat: ${finalLat}° N | Long: ${finalLng}° E</span><br/>
        <span style="color: #64748B; font-size: 10px;">${finalAddress}</span>
      </div>
    `).openPopup();

    mapInstanceRef.current = map;

    // Force Leaflet map resize calculation after container render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [finalLat, finalLng, deviceName, finalAddress]);

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
            <Waves size={12} color="#0284C7" /> Water Level
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284C7', fontFamily: 'monospace' }}>
            {waterLevel}%
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
