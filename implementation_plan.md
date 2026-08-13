# Implementation Plan: Camera Monitoring Tab Integration

Enable real-time CCTV and snapshot monitoring for STP plant sites directly within the dashboard.

## Proposed Architecture

### 1. Frontend Navigation & Layout (`DashboardPage.tsx`)
- Add a top tab switcher below the header KPI metrics:
  - **Live SCADA & Telemetry**: Renders current tank visualizations, GIS map, and analytical graphs.
  - **Camera Monitoring**: Renders live/latest camera snapshot feeds for the selected device.
- Integrate active tab state (`activeTab: 'telemetry' | 'camera'`).

### 2. Camera View Component (`CameraMonitoring.tsx`)
- Display camera channels mapped to the selected device:
  - **Camera 1**: Sump / Inlet Sump
  - **Camera 2**: Aeration & Biological Tank
  - **Camera 3**: Filter Feed & Discharge Line
  - **Camera 4**: Site Overview / Security
- Features:
  - Real-time snapshot refreshing & manual refresh button.
  - Timestamp & camera health status badges (`LIVE` / `RECORDING`).
  - Full-screen modal / lightbox view for detailed inspection.
  - Grid layout with high-definition snapshot view.

### 3. Backend API (`backend/main.py`)
- Add `/api/camera/snapshots` endpoint in FastAPI.
- Serve images stored in instance directory path (e.g., `backend/static/camera_snapshots/` or custom instance path).
- Support filtering snapshots by `device_id`.

## User Verification Plan
- Switch between **Live SCADA** and **Camera Monitoring** tabs.
- Verify camera snapshots load for the active device.
- Click a snapshot to view full-screen lightbox preview.
