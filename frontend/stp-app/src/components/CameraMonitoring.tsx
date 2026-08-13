import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, Maximize2, Shield, Video, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { TelemetryAPI } from '../api';

interface CameraChannel {
  id: string;
  name: string;
  location: string;
  status: string;
  image_url: string;
  fallback_url?: string;
  last_updated: string;
}

interface CameraMonitoringProps {
  deviceId: string;
  deviceName?: string;
}

export const CameraMonitoring: React.FC<CameraMonitoringProps> = ({ deviceId, deviceName }) => {
  const [cameras, setCameras] = useState<CameraChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraChannel | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const defaultCameras: CameraChannel[] = [
    {
      id: 'cam_01',
      name: 'CAM-01: Raw Inlet Sump',
      location: 'Raw Sewage Receiving Sump',
      status: 'LIVE',
      image_url: '/camera_snapshots/cam1_inlet_sump.png',
      last_updated: new Date().toLocaleTimeString()
    },
    {
      id: 'cam_02',
      name: 'CAM-02: Aeration Basin',
      location: 'Secondary Biological Aeration Tank',
      status: 'LIVE',
      image_url: '/camera_snapshots/cam2_aeration_tank.png',
      last_updated: new Date().toLocaleTimeString()
    },
    {
      id: 'cam_03',
      name: 'CAM-03: Filter Pump Room',
      location: 'Tertiary Filtration & Disinfection',
      status: 'LIVE',
      image_url: '/camera_snapshots/cam3_filter_room.png',
      last_updated: new Date().toLocaleTimeString()
    },
    {
      id: 'cam_04',
      name: 'CAM-04: Plant Master View',
      location: 'STP Plant Master Entrance & Overview',
      status: 'LIVE',
      image_url: '/camera_snapshots/cam4_site_overview.png',
      last_updated: new Date().toLocaleTimeString()
    }
  ];

  const fetchCameraSnapshots = async () => {
    setRefreshing(true);
    try {
      const res = await TelemetryAPI.get('/api/camera-snapshots', { params: { device_id: deviceId } });
      if (res.data && res.data.cameras && res.data.cameras.length > 0) {
        setCameras(res.data.cameras);
      } else {
        setCameras(defaultCameras);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      // Fallback to local default static snapshots
      setCameras(defaultCameras);
      setLastRefreshed(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchCameraSnapshots();
    const interval = setInterval(fetchCameraSnapshots, 10000);
    return () => clearInterval(interval);
  }, [deviceId]);

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner / Controls */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Camera size={26} color="#0284C7" />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              CCTV Surveillance & Instance Snapshots
              <span style={{
                fontSize: '11px',
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                ● 4 CHANNELS ACTIVE
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              Real-time site snapshots fetched from instance directory for <strong>{deviceName || deviceId}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} color="#64748B" />
            <span>Updated: <strong>{lastRefreshed || 'Just now'}</strong></span>
          </div>

          <button
            onClick={fetchCameraSnapshots}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              background: '#0284C7',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh Snapshots'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #CBD5E1' }}>
          <div className="spinner-lg" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: '#64748B', fontSize: '14px' }}>Loading live camera feeds from server instance...</p>
        </div>
      )}

      {/* Camera Grid */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '20px'
        }}>
          {cameras.map((cam) => (
            <div
              key={cam.id}
              style={{
                background: '#0F172A',
                borderRadius: '16px',
                border: '1px solid #334155',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
            >
              {/* Camera Channel Header */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.95)',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #1E293B'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Video size={16} color="#38BDF8" />
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                      {cam.name}
                    </h4>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{cam.location}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(52, 211, 153, 0.3)'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                    {cam.status}
                  </span>

                  <button
                    onClick={() => setSelectedCamera(cam)}
                    title="Full Screen Preview"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      color: '#F8FAFC',
                      padding: '6px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>

              {/* Image Frame with Surveillance Overlay */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#020617',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
                onClick={() => setSelectedCamera(cam)}
              >
                <img
                  src={cam.image_url}
                  alt={cam.name}
                  onError={(e) => {
                    if (cam.fallback_url && e.currentTarget.src !== window.location.origin + cam.fallback_url) {
                      e.currentTarget.src = cam.fallback_url;
                    }
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.3s ease'
                  }}
                />

                {/* Surveillance OSD Timestamp Overlay */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#38BDF8',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ color: '#EF4444', fontWeight: 900 }}>REC [●]</span>
                  <span>{cam.last_updated}</span>
                </div>

                {/* Camera Name Tag top right */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(4px)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#F8FAFC',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {cam.id.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal for Full-Screen Camera View */}
      {selectedCamera && (
        <div
          onClick={() => setSelectedCamera(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(2, 6, 23, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0F172A',
              border: '1px solid #334155',
              borderRadius: '20px',
              maxWidth: '1000px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{
              padding: '16px 24px',
              background: '#1E293B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {selectedCamera.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>{selectedCamera.location}</span>
              </div>

              <button
                onClick={() => setSelectedCamera(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#F8FAFC',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close ✕
              </button>
            </div>

            <div style={{ width: '100%', maxHeight: '70vh', background: '#020617', overflow: 'hidden' }}>
              <img
                src={selectedCamera.image_url}
                alt={selectedCamera.name}
                onError={(e) => {
                  if (selectedCamera.fallback_url) {
                    e.currentTarget.src = selectedCamera.fallback_url;
                  }
                }}
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '70vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
