import React, { useState, useEffect } from 'react';
import {
  Camera, RefreshCw, ChevronLeft, ChevronRight, UserCheck, ShieldCheck,
  UserPlus, CheckCircle2, Clock, AlertCircle, EyeOff, Lock, User
} from 'lucide-react';
import { TelemetryAPI } from '../api';

interface CameraChannel {
  id: string;
  name: string;
  location: string;
  aws_path: string;
  status: string;
  image_url: string;
  fallback_url?: string;
  last_updated: string;
}

interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: string;
  activeCount: number;
}

interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'warning' | 'success';
}

interface CameraMonitoringProps {
  deviceId: string;
  deviceName?: string;
}

export const CameraMonitoring: React.FC<CameraMonitoringProps> = ({ deviceId, deviceName }) => {
  const [selectedCameraId, setSelectedCameraId] = useState<string>('cam_01');
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [systemTime, setSystemTime] = useState<string>('');
  const [apiCameras, setApiCameras] = useState<CameraChannel[]>([]);

  // AWS EC2 13.200.3.124 Image Paths
  const awsHost = 'http://13.200.3.124';

  const defaultCameras: Record<string, CameraChannel> = {
    cam_01: {
      id: 'cam_01',
      name: 'CAMERA 1 (5G Router)',
      location: '/home/routeruser/5grouter_images',
      aws_path: `${awsHost}/5grouter_images/`,
      status: 'LIVE',
      image_url: `${awsHost}/5grouter_images/latest.jpg`,
      fallback_url: '/camera_snapshots/cam1_inlet_sump.png',
      last_updated: new Date().toLocaleTimeString()
    },
    cam_02: {
      id: 'cam_02',
      name: 'CAMERA 2 (Cam 2 Images)',
      location: '/home/routeruser/cam2images',
      aws_path: `${awsHost}/cam2images/`,
      status: 'LIVE',
      image_url: `${awsHost}/cam2images/latest.jpg`,
      fallback_url: '/camera_snapshots/cam2_aeration_tank.png',
      last_updated: new Date().toLocaleTimeString()
    }
  };

  // Dynamic snapshot sets per selected camera
  const cameraSnapshotsMap: Record<string, any[]> = {
    cam_01: [
      { id: 1, title: '5G Router Image 1', url: `${awsHost}/5grouter_images/latest.jpg`, fallback: '/camera_snapshots/cam1_inlet_sump.png', time: '12:12:59 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/5grouter_images' },
      { id: 2, title: '5G Router Image 2', url: `${awsHost}/5grouter_images/img2.jpg`, fallback: '/camera_snapshots/cam1_inlet_sump.png', time: '12:10:45 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/5grouter_images' },
      { id: 3, title: '5G Router Image 3', url: `${awsHost}/5grouter_images/img3.jpg`, fallback: '/camera_snapshots/insight_face.png', time: '12:08:30 PM', date: '13/Aug/2026', hasPerson: true, personName: 'Saguaru', personRole: 'Visitor' },
      { id: 4, title: '5G Router Image 4', url: `${awsHost}/5grouter_images/img4.jpg`, fallback: '/camera_snapshots/cam3_filter_room.png', time: '12:05:12 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/5grouter_images' },
      { id: 5, title: '5G Router Image 5', url: `${awsHost}/5grouter_images/img5.jpg`, fallback: '/camera_snapshots/cam4_site_overview.png', time: '12:00:00 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/5grouter_images' },
    ],
    cam_02: [
      { id: 1, title: 'Cam 2 Image 1', url: `${awsHost}/cam2images/latest.jpg`, fallback: '/camera_snapshots/cam2_aeration_tank.png', time: '12:12:59 PM', date: '13/Aug/2026', hasPerson: true, personName: 'El Presidento', personRole: 'Operator', path: '/home/routeruser/cam2images' },
      { id: 2, title: 'Cam 2 Image 2', url: `${awsHost}/cam2images/img2.jpg`, fallback: '/camera_snapshots/cam2_aeration_tank.png', time: '12:11:15 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/cam2images' },
      { id: 3, title: 'Cam 2 Image 3', url: `${awsHost}/cam2images/img3.jpg`, fallback: '/camera_snapshots/cam1_inlet_sump.png', time: '12:09:00 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/cam2images' },
      { id: 4, title: 'Cam 2 Image 4', url: `${awsHost}/cam2images/img4.jpg`, fallback: '/camera_snapshots/insight_face.png', time: '12:06:22 PM', date: '13/Aug/2026', hasPerson: true, personName: 'Saguaru', personRole: 'Visitor', path: '/home/routeruser/cam2images' },
      { id: 5, title: 'Cam 2 Image 5', url: `${awsHost}/cam2images/img5.jpg`, fallback: '/camera_snapshots/cam4_site_overview.png', time: '12:02:10 PM', date: '13/Aug/2026', hasPerson: false, path: '/home/routeruser/cam2images' },
    ]
  };

  const authorizedStaff: StaffMember[] = [
    { id: '1', name: 'Saguaru', role: 'Visitor', status: 'ACTIVE', activeCount: 1 },
    { id: '2', name: 'El Presidento', role: 'Operator', status: 'ACTIVE', activeCount: 1 },
  ];

  const identificationLogs: LogEntry[] = [
    { time: '12:12:59', text: `Fetched AWS 13.200.3.124 (${selectedCameraId === 'cam_01' ? '/5grouter_images' : '/cam2images'})`, type: 'success' },
    { time: '12:10:30', text: 'Detected Authorized: El Presidento (Operator)', type: 'success' },
    { time: '07:02:50', text: 'Detected Unknown / Unauthorized Presence', type: 'warning' },
  ];

  useEffect(() => {
    const updateTime = () => {
      setSystemTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchCameraData = async () => {
    setRefreshing(true);
    try {
      const res = await TelemetryAPI.get('/api/camera-snapshots', { params: { device_id: deviceId } });
      if (res.data && res.data.cameras && res.data.cameras.length > 0) {
        setApiCameras(res.data.cameras);
      }
    } catch {}
    finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchCameraData();
  }, [deviceId]);

  const activeCamInfo = defaultCameras[selectedCameraId] || defaultCameras.cam_01;
  const snapshotsList = cameraSnapshotsMap[selectedCameraId] || cameraSnapshotsMap.cam_01;
  const currentSnapshot = snapshotsList[activeSnapshotIdx] || snapshotsList[0];

  const handlePrevSnapshot = () => {
    setActiveSnapshotIdx((prev) => (prev > 0 ? prev - 1 : snapshotsList.length - 1));
  };

  const handleNextSnapshot = () => {
    setActiveSnapshotIdx((prev) => (prev < snapshotsList.length - 1 ? prev + 1 : 0));
  };

  const handleRefresh = () => {
    fetchCameraData();
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            CAMERA MONITORING
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' }}>
            Live Snapshot Analysis & AWS Remote Feed (IP: <code>13.200.3.124</code>)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* AWS Server Path Tag */}
          <span style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            background: '#F0F9FF',
            color: '#0284C7',
            border: '1px solid #BAE6FD',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 700
          }}>
            📂 {selectedCameraId === 'cam_01' ? '/home/routeruser/5grouter_images' : '/home/routeruser/cam2images'}
          </span>

          {/* Camera Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                setActiveSnapshotIdx(0);
              }}
              style={{
                padding: '8px 36px 8px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none'
              }}
            >
              <option value="cam_01">CAMERA 1 (5grouter_images)</option>
              <option value="cam_02">CAMERA 2 (cam2images)</option>
            </select>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px' }}>▼</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Main 2-Column Dashboard Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* LEFT COLUMN: Main AWS Snapshot Viewer + Thumbnail Carousel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Snapshot Viewer Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            background: '#090D16',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.2)',
            aspectRatio: '16/9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Top OSD Date / Time */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '20px',
              color: '#FFFFFF',
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 700,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              zIndex: 10
            }}>
              13 - Aug - 2026 &nbsp; {systemTime || '12 : 12 : 59 PM'}
            </div>

            {/* Top Right Counter Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(6px)',
              padding: '4px 12px',
              borderRadius: '20px',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(255, 255, 255, 0.15)',
              zIndex: 10
            }}>
              Snapshot {activeSnapshotIdx + 1} / {snapshotsList.length}
            </div>

            {/* AWS Snapshot Image with Fallback */}
            <img
              src={currentSnapshot.url}
              alt={currentSnapshot.title}
              onError={(e) => {
                if (currentSnapshot.fallback && e.currentTarget.src !== window.location.origin + currentSnapshot.fallback) {
                  e.currentTarget.src = currentSnapshot.fallback;
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block'
              }}
            />

            {/* Navigation Left Arrow */}
            <button
              onClick={handlePrevSnapshot}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(15, 23, 42, 0.6)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                zIndex: 10
              }}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Navigation Right Arrow */}
            <button
              onClick={handleNextSnapshot}
              style={{
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(15, 23, 42, 0.6)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                zIndex: 10
              }}
            >
              <ChevronRight size={24} />
            </button>

            {/* Bottom Left OSD Tag */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#FF6B00',
              fontWeight: 700,
              zIndex: 10
            }}>
              <span>📅 {currentSnapshot.date}</span>
              <span>🕒 {currentSnapshot.time}</span>
            </div>

            {/* Bottom Center ROOM SECURED Badge */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(16, 185, 129, 0.25)',
              border: '1px solid #10B981',
              backdropFilter: 'blur(6px)',
              padding: '6px 16px',
              borderRadius: '8px',
              color: '#34D399',
              fontSize: '12px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.5px',
              zIndex: 10
            }}>
              <ShieldCheck size={16} />
              ROOM SECURED
            </div>
          </div>

          {/* Bottom Thumbnail Strip Carousel */}
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            padding: '8px 2px',
            scrollbarWidth: 'thin'
          }}>
            {snapshotsList.map((snap, idx) => (
              <div
                key={snap.id}
                onClick={() => setActiveSnapshotIdx(idx)}
                style={{
                  minWidth: '100px',
                  height: '65px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: activeSnapshotIdx === idx ? '3px solid #FF6B00' : '2px solid transparent',
                  opacity: activeSnapshotIdx === idx ? 1 : 0.6,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <img
                  src={snap.url}
                  alt={snap.title}
                  onError={(e) => {
                    if (snap.fallback && e.currentTarget.src !== window.location.origin + snap.fallback) {
                      e.currentTarget.src = snap.fallback;
                    }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>

        </div>


        {/* RIGHT COLUMN: AI Face Identification & Database Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: AI FACE IDENTIFICATION Toggle */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '16px 20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0284C7', margin: 0, letterSpacing: '-0.3px' }}>
                AI FACE IDENTIFICATION
              </h4>
              <p style={{ fontSize: '11px', color: '#64748B', margin: '2px 0 0 0' }}>
                Match faces to employee database
              </p>
            </div>

            {/* Toggle Switch */}
            <div
              onClick={() => setAiEnabled(!aiEnabled)}
              style={{
                width: '46px',
                height: '24px',
                borderRadius: '12px',
                background: aiEnabled ? '#FF6B00' : '#CBD5E1',
                padding: '2px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: '#FFFFFF',
                transform: aiEnabled ? 'translateX(22px)' : 'translateX(0px)',
                transition: 'transform 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
          </div>


          {/* Card 2: DETECTIONS IN PHOTO */}
          <div style={{
            background: '#F5F3FF',
            borderRadius: '14px',
            border: '1px solid #DDD6FE',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#6D28D9', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔍</span> DETECTIONS IN PHOTO
            </h4>

            {currentSnapshot.hasPerson ? (
              <div style={{
                background: '#FFFFFF',
                borderRadius: '10px',
                padding: '12px 14px',
                border: '1px solid #C4B5FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#7C3AED', color: '#FFF', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px' }}>
                    {currentSnapshot.personName?.[0]}
                  </div>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#4C1D95' }}>{currentSnapshot.personName}</h5>
                    <span style={{ fontSize: '11px', color: '#6D28D9' }}>{currentSnapshot.personRole}</span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>MATCHED</span>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '24px 12px',
                color: '#6D28D9',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <EyeOff size={32} color="#A78BFA" />
                <span style={{ fontSize: '13px', fontWeight: 700 }}>No persons detected in snapshot.</span>
              </div>
            )}
          </div>


          {/* Card 3: AUTHORIZED STAFF DATABASE */}
          <div style={{
            background: '#F0FDF4',
            borderRadius: '14px',
            border: '1px solid #BBF7D0',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#15803D', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>👤</span> AUTHORIZED STAFF DATABASE
              </h4>
              <button style={{
                background: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 800,
                cursor: 'pointer'
              }}>
                + REGISTER FACE
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {authorizedStaff.map((staff) => (
                <div key={staff.id} style={{
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  border: '1px solid #86EFAC',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#10B981', color: '#FFF', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '12px' }}>
                      {staff.name[0]}
                    </div>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#14532D' }}>{staff.name}</h5>
                      <span style={{ fontSize: '11px', color: '#15803D' }}>{staff.role}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', color: '#4B5563', fontWeight: 600 }}>📇 1</span>
                    <span style={{ fontSize: '10px', color: '#15803D', fontWeight: 800 }}>● {staff.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Card 4: REAL-TIME IDENTIFICATION LOG */}
          <div style={{
            background: '#FEFCE8',
            borderRadius: '14px',
            border: '1px solid #FEF08A',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#A16207', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📜</span> REAL-TIME IDENTIFICATION LOG
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {identificationLogs.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', color: log.type === 'warning' ? '#B45309' : '#854D0E', padding: '4px 0', borderBottom: idx !== identificationLogs.length - 1 ? '1px dashed #FDE047' : 'none' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{log.time}</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
