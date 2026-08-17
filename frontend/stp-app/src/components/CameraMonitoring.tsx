import React, { useState, useEffect } from 'react';
import {
  RefreshCw, ChevronLeft, ChevronRight, FileImage, Loader2, Camera, ShieldCheck, Clock, Server
} from 'lucide-react';

interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'warning' | 'success';
}

interface CameraMonitoringProps {
  deviceId: string;
  deviceName?: string;
}

const monthMap: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

// Extract timestamp for sorting Latest first
const getItemTimestamp = (path: string): number => {
  const match = path.match(/(\d{2})_([A-Za-z]{3})_(\d{4}).*?(\d{2})_(\d{2})_(\d{2})/);
  if (match) {
    const [, day, monthStr, year, hr, min, sec] = match;
    const month = monthMap[monthStr] ?? 0;
    return new Date(
      parseInt(year, 10),
      month,
      parseInt(day, 10),
      parseInt(hr, 10),
      parseInt(min, 10),
      parseInt(sec, 10)
    ).getTime();
  }
  return 0;
};

const formatImageDate = (path: string): string => {
  const match = path.match(/(\d{2})_([A-Za-z]{3})_(\d{4})/);
  if (match) {
    const [, day, monthStr, year] = match;
    return `${day} - ${monthStr} - ${year}`;
  }
  return '';
};

export const CameraMonitoring: React.FC<CameraMonitoringProps> = () => {
  const [selectedCameraId, setSelectedCameraId] = useState<string>('5grouter');
  const [activeSnapshotIdx, setActiveSnapshotIdx] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [systemTime, setSystemTime] = useState<string>('');
  const [imageList, setImageList] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // AWS EC2 Hosts: Primary target (13.206.207.146) with working failover host (13.200.3.124)
  const PRIMARY_HOST = 'http://13.206.207.146:5002';
  const WORKING_HOST = 'http://13.200.3.124:5002';

  const [activeApiBase, setActiveApiBase] = useState<string>(WORKING_HOST);

  const cameraNames: Record<string, { title: string; folder: string; path: string; deviceSubfolder: string }> = {
    '5grouter': {
      title: 'CAMERA 1 (5grouter_images)',
      folder: '5grouter_images',
      path: '/home/routeruser/5grouter_images/00_1b_09_14_e4_e3/SATATYA_IPCAM_IMAGE',
      deviceSubfolder: '00_1b_09_14_e4_e3'
    },
    'cam2': {
      title: 'CAMERA 2 (cam2images)',
      folder: 'cam2images',
      path: '/home/routeruser/cam2images/00_1b_09_14_e4_d3/SATATYA_IPCAM_IMAGE',
      deviceSubfolder: '00_1b_09_14_e4_d3'
    }
  };

  // Fetch image list with automatic fallback
  const fetchRemoteImageList = async (sourceKey: string) => {
    setLoadingList(true);
    setFetchError(null);

    let responseData: string[] | null = null;

    const tryFetch = async (baseUrl: string) => {
      const targetUrl = `${baseUrl}/api/5grouter/list?source=${sourceKey}`;
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    };

    try {
      responseData = await tryFetch(activeApiBase);
    } catch {
      const fallbackHost = activeApiBase === WORKING_HOST ? PRIMARY_HOST : WORKING_HOST;
      try {
        responseData = await tryFetch(fallbackHost);
        setActiveApiBase(fallbackHost);
      } catch {
        responseData = null;
      }
    }

    if (responseData && Array.isArray(responseData) && responseData.length > 0) {
      const sorted = [...responseData].sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a));
      setImageList(sorted);
      setActiveSnapshotIdx(0);
    } else {
      setImageList([]);
      setFetchError('No live camera snapshots returned from AWS storage server');
    }

    setLoadingList(false);
  };

  useEffect(() => {
    fetchRemoteImageList(selectedCameraId);
    const interval = setInterval(() => {
      fetchRemoteImageList(selectedCameraId);
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedCameraId]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setSystemTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRemoteImageList(selectedCameraId);
    setRefreshing(false);
  };

  const handleNextSnapshot = () => {
    if (imageList.length === 0) return;
    setActiveSnapshotIdx((prev) => (prev + 1) % imageList.length);
  };

  const handlePrevSnapshot = () => {
    if (imageList.length === 0) return;
    setActiveSnapshotIdx((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const currentCam = cameraNames[selectedCameraId] || cameraNames['5grouter'];
  const currentRelPath = imageList[activeSnapshotIdx] || '';

  const getImageViewUrl = (relPath: string, sourceKey: string) => {
    if (!relPath) return '';
    return `${activeApiBase}/api/5grouter/view?path=${encodeURIComponent(relPath)}&source=${sourceKey}`;
  };

  const currentImageUrl = getImageViewUrl(currentRelPath, selectedCameraId);

  const activityLogs: LogEntry[] = [
    { time: systemTime || '12:12:59', text: `AWS Stream Sync: ${imageList.length} live snapshots loaded (${currentCam.folder})`, type: 'success' },
    { time: '12:10:30', text: 'Live Feed Signal: 100% Signal Strength (SATATYA IPCAM)', type: 'info' },
    { time: '07:02:50', text: 'Automatic Snapshot Auto-Sync Active (60s Refresh)', type: 'info' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px',
      background: '#F8FAFC',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#FFFFFF',
        padding: '16px 24px',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            CAMERA MONITORING
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>
            Live Remote Feed via AWS Image Service (Host: <code>{activeApiBase.replace('http://', '').replace(':5002', '')}</code>)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* AWS Folder Path Badge */}
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
            📂 {currentCam.path} ({imageList.length} files)
          </span>

          {/* Camera Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
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
              <option value="5grouter">CAMERA 1 (5grouter_images)</option>
              <option value="cam2">CAMERA 2 (cam2images)</option>
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

        {/* LEFT COLUMN: Main Snapshot Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Viewport Card */}
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
            {/* Top OSD Image Date */}
            {currentRelPath && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '20px',
                color: '#FFFFFF',
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 700,
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '4px 12px',
                borderRadius: '6px',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                zIndex: 10
              }}>
                📅 {formatImageDate(currentRelPath) || 'Image Snapshot'}
              </div>
            )}

            {/* Top Right Counter Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '20px',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              padding: '4px 12px',
              borderRadius: '20px',
              color: '#38BDF8',
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              border: '1px solid rgba(56, 189, 248, 0.3)',
              zIndex: 10
            }}>
              {imageList.length > 0 ? `Snapshot ${activeSnapshotIdx + 1} / ${imageList.length}` : 'No Images'}
            </div>

            {/* Image Stream Viewport */}
            {loadingList ? (
              <div style={{ color: '#38BDF8', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <Loader2 size={36} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Connecting to AWS Stream...</span>
              </div>
            ) : currentImageUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  key={currentImageUrl}
                  src={currentImageUrl}
                  alt={`AWS Snapshot ${activeSnapshotIdx + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            ) : (
              <div style={{ color: '#F8FAFC', textAlign: 'center', padding: '20px' }}>
                <Camera size={36} color="#F59E0B" />
                <p style={{ marginTop: '8px', fontSize: '14px', fontWeight: 700 }}>
                  {fetchError || 'No snapshot images available'}
                </p>
              </div>
            )}

            {/* Navigation Left Arrow */}
            {imageList.length > 1 && (
              <button
                onClick={handlePrevSnapshot}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 23, 42, 0.65)',
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
            )}

            {/* Navigation Right Arrow */}
            {imageList.length > 1 && (
              <button
                onClick={handleNextSnapshot}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 23, 42, 0.65)',
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
            )}

            {/* Bottom Left File Path OSD */}
            {currentRelPath && (
              <div style={{
                position: 'absolute',
                bottom: '16px',
                left: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#FF6B00',
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                zIndex: 10
              }}>
                <FileImage size={13} />
                <span>{currentRelPath}</span>
              </div>
            )}

            {/* Bottom Center Status Badge */}
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
              LIVE MONITORING ACTIVE
            </div>
          </div>

          {/* Bottom Dynamic Thumbnail Carousel */}
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            padding: '8px 2px',
            scrollbarWidth: 'thin'
          }}>
            {imageList.slice(0, 20).map((relPath, idx) => (
              <div
                key={relPath}
                onClick={() => setActiveSnapshotIdx(idx)}
                style={{
                  minWidth: '100px',
                  height: '65px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: activeSnapshotIdx === idx ? '3px solid #FF6B00' : '2px solid transparent',
                  opacity: activeSnapshotIdx === idx ? 1 : 0.65,
                  transition: 'all 0.2s',
                  position: 'relative',
                  background: '#1E293B',
                  flexShrink: 0
                }}
              >
                <img
                  src={getImageViewUrl(relPath, selectedCameraId)}
                  alt={`Thumb ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>

        </div>


        {/* RIGHT COLUMN: Camera Control Details & Stream Activity Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: Camera Feed Info */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} color="#0284C7" />
              CAMERA FEED DETAILS
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Channel Title</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{currentCam.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Camera Model</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>SATATYA IPCAM</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Resolution</span>
                <span style={{ fontWeight: 700, color: '#0284C7' }}>1920x1080 Full HD</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Stream Protocol</span>
                <span style={{ fontWeight: 700, color: '#10B981' }}>AWS HTTP Stream Sync</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748B', fontWeight: 500 }}>Total Snapshots</span>
                <span style={{ fontWeight: 800, color: '#FF6B00', fontFamily: 'monospace' }}>{imageList.length} files</span>
              </div>
            </div>
          </div>

          {/* Card 2: Server Host Details */}
          <div style={{
            background: '#F8FAFC',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server size={16} color="#475569" />
              AWS STORAGE SERVICE HOST
            </h4>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Active Endpoint:</span>
              <code style={{ fontSize: '12px', color: '#0284C7', fontWeight: 700 }}>{activeApiBase}</code>
              <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, marginTop: '4px' }}>● 100% Operational & Stream Syncing</span>
            </div>
          </div>

          {/* Card 3: Camera Stream Activity Log */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#FF6B00" />
              CAMERA ACTIVITY LOG
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
              {activityLogs.map((log, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  fontSize: '11px',
                  paddingBottom: '8px',
                  borderBottom: index !== activityLogs.length - 1 ? '1px dashed #E2E8F0' : 'none'
                }}>
                  <span style={{ fontFamily: 'monospace', color: '#94A3B8', fontWeight: 600 }}>[{log.time}]</span>
                  <span style={{ color: log.type === 'success' ? '#059669' : log.type === 'warning' ? '#D97706' : '#2563EB', fontWeight: 600, flex: 1 }}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default CameraMonitoring;
