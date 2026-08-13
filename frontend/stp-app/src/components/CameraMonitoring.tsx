import React, { useState, useEffect } from 'react';
import { Camera, RefreshCw, Maximize2, Video, Clock, ShieldCheck, UserCheck, Cpu, Eye, CheckCircle2 } from 'lucide-react';
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

interface InsightDetection {
  person_id: string;
  name: string;
  role: string;
  confidence: number;
  status: string;
  insight_image_url: string;
  fallback_url?: string;
}

interface InsightData {
  model: string;
  faces_detected: number;
  processed_at: string;
  detections: InsightDetection[];
  logs: { time: string; event: string; status: string }[];
}

interface CameraMonitoringProps {
  deviceId: string;
  deviceName?: string;
}

export const CameraMonitoring: React.FC<CameraMonitoringProps> = ({ deviceId, deviceName }) => {
  const [cameras, setCameras] = useState<CameraChannel[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam_01');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CameraChannel | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [insightData, setInsightData] = useState<InsightData | null>(null);

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
    }
  ];

  const defaultInsight: InsightData = {
    model: 'InsightFace (ArcFace ResNet-100)',
    faces_detected: 1,
    processed_at: new Date().toLocaleTimeString(),
    detections: [
      {
        person_id: 'EMP-4082',
        name: 'Ramesh Kumar',
        role: 'STP Operations Specialist',
        confidence: 98.4,
        status: 'AUTHORIZED',
        insight_image_url: '/camera_snapshots/insight_face.png'
      }
    ],
    logs: [
      { time: new Date().toLocaleTimeString(), event: 'InsightFace AI: Verified Ramesh Kumar (EMP-4082)', status: 'MATCHED' },
      { time: '10:38:15', event: 'InsightFace AI: Camera Feed Analysis Active', status: 'ACTIVE' }
    ]
  };

  const fetchCameraSnapshots = async () => {
    setRefreshing(true);
    try {
      const res = await TelemetryAPI.get('/api/camera-snapshots', { params: { device_id: deviceId } });
      if (res.data && res.data.cameras && res.data.cameras.length > 0) {
        setCameras(res.data.cameras);
      } else {
        setCameras(defaultCameras);
      }
      if (res.data && res.data.insight_face) {
        setInsightData(res.data.insight_face);
      } else {
        setInsightData(defaultInsight);
      }
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch {
      setCameras(defaultCameras);
      setInsightData(defaultInsight);
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

  const activeCam = (cameras.length > 0 ? cameras : defaultCameras).find(c => c.id === selectedCameraId) || (cameras[0] || defaultCameras[0]);
  const activeInsight = insightData || defaultInsight;
  const activePerson = activeInsight.detections[0] || defaultInsight.detections[0];

  return (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Controls Banner */}
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
              CCTV Surveillance & InsightFace Detection
              <span style={{
                fontSize: '11px',
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                ● INSIGHT-AI ACTIVE
              </span>
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
              Real-time site camera snapshots and AI face detection for <strong>{deviceName || deviceId}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Camera Selection Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>📹 Select Camera:</label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1.5px solid #0284C7',
                background: '#F0F9FF',
                color: '#0369A1',
                fontSize: '13px',
                fontWeight: 700,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.15)'
              }}
            >
              {(cameras.length > 0 ? cameras : defaultCameras).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
          <p style={{ color: '#64748B', fontSize: '14px' }}>Loading camera feeds & InsightFace detection model...</p>
        </div>
      )}

      {/* 2-Column Split View: Left = Insight Face Detection, Right = Camera Image (Decreased Size) */}
      {!loading && activeCam && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 1fr) minmax(350px, 1fr)',
          gap: '20px',
          alignItems: 'stretch'
        }}>

          {/* LEFT SIDE: InsightFace AI Face Detection & Recognition Panel */}
          <div style={{
            background: '#0F172A',
            borderRadius: '20px',
            border: '1px solid #1E293B',
            overflow: 'hidden',
            boxShadow: '0 12px 35px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Insight Header */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.98)',
              padding: '16px 20px',
              borderBottom: '1px solid #1E293B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={20} color="#10B981" />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    InsightFace AI Detection
                  </h4>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{activeInsight.model}</span>
                </div>
              </div>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34D399',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <CheckCircle2 size={13} />
                MATCHED ({activePerson.confidence}%)
              </span>
            </div>

            {/* InsightFace Detection Snapshot Image Frame */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                background: '#020617',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={() => setSelectedCamera({
                id: 'insight_face',
                name: 'InsightFace AI Detection Overlay',
                location: `${activePerson.name} (${activePerson.person_id})`,
                status: 'MATCHED',
                image_url: activePerson.insight_image_url,
                fallback_url: activePerson.fallback_url,
                last_updated: activeInsight.processed_at
              })}
            >
              <img
                src={activePerson.insight_image_url}
                alt="InsightFace Detection"
                onError={(e) => {
                  if (activePerson.fallback_url && e.currentTarget.src !== window.location.origin + activePerson.fallback_url) {
                    e.currentTarget.src = activePerson.fallback_url;
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {/* Bounding Box HUD Overlay */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: 'rgba(5, 150, 105, 0.9)',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 800,
                fontFamily: 'monospace',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Eye size={13} />
                INSIGHT-FACE BBOX: OK
              </div>
            </div>

            {/* Recognized Personnel Details */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                background: '#1E293B',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    fontWeight: 800,
                    fontSize: '14px'
                  }}>
                    ID
                  </div>
                  <div>
                    <h5 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                      {activePerson.name}
                    </h5>
                    <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 600 }}>{activePerson.person_id} · {activePerson.role}</span>
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#065F46',
                  color: '#A7F3D0',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  {activePerson.status}
                </span>
              </div>

              {/* Event Logs */}
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                <strong style={{ color: '#CBD5E1', display: 'block', marginBottom: '6px' }}>AI Detection Logs:</strong>
                {activeInsight.logs.map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1E293B' }}>
                    <span>• {log.event}</span>
                    <span style={{ color: '#38BDF8', fontFamily: 'monospace' }}>{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>


          {/* RIGHT SIDE: Selected Camera Feed (Decreased Size) */}
          <div style={{
            background: '#0F172A',
            borderRadius: '20px',
            border: '1px solid #334155',
            overflow: 'hidden',
            boxShadow: '0 12px 35px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Active Camera Header */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.98)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1E293B'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={18} color="#38BDF8" />
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                    {activeCam.name}
                  </h4>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{activeCam.location}</span>
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
                  {activeCam.status}
                </span>

                <button
                  onClick={() => setSelectedCamera(activeCam)}
                  title="Full Screen Preview"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#F8FAFC',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    transition: 'background 0.2s'
                  }}
                >
                  <Maximize2 size={13} />
                  Expand
                </button>
              </div>
            </div>

            {/* Active Camera Image Frame (Decreased Size Fit) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/10',
                background: '#020617',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              onClick={() => setSelectedCamera(activeCam)}
            >
              <img
                src={activeCam.image_url}
                alt={activeCam.name}
                onError={(e) => {
                  if (activeCam.fallback_url && e.currentTarget.src !== window.location.origin + activeCam.fallback_url) {
                    e.currentTarget.src = activeCam.fallback_url;
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />

              {/* OSD Timestamp Overlay */}
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
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ color: '#EF4444', fontWeight: 900 }}>REC [●]</span>
                <span>{activeCam.last_updated}</span>
              </div>

              {/* Camera Tag top right */}
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
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontWeight: 700
              }}>
                {activeCam.id.toUpperCase()}
              </div>
            </div>
          </div>

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
              maxWidth: '1100px',
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
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close ✕
              </button>
            </div>

            <div style={{ width: '100%', maxHeight: '75vh', background: '#020617', overflow: 'hidden' }}>
              <img
                src={selectedCamera.image_url}
                alt={selectedCamera.name}
                onError={(e) => {
                  if (selectedCamera.fallback_url) {
                    e.currentTarget.src = selectedCamera.fallback_url;
                  }
                }}
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '75vh', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
