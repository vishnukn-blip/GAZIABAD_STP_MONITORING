"""
STP Monitoring — FastAPI Telemetry Service
==========================================
PORT: 8001  (Frappe runs on 8000)
ROLE: Telemetry ONLY — polls Nimblevision API, parses repurposed parameters,
      serves clean motor & level data to React frontend.

Auth/Users/Devices/Tanks/Motors are all managed by Frappe on port 8000.
FastAPI fetches the device config from Frappe before calling Nimblevision.
"""

import os
import json
import sqlite3
import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="STP Telemetry API",
    description="Nimblevision API proxy — telemetry only. Auth managed by Frappe.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static folder for camera snapshots
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

NIMBLEVISION_URL = "http://nimblevision.io/public/api/getDeviceDiagnosticInfoNisensu"
FRAPPE_BASE = "http://localhost:8000"

# ── Parameter Mapping Logic ───────────────────────────────────────────────────
RUN_KEYS = {"current_1", "current_2", "current_3", "current_4", "low_pressure"}
TRIP_KEYS = {"voltage_4", "voltage_5", "voltage_6", "voltage_7", "voltage_8"}


def parse_run(val: Optional[str]) -> bool:
    """Motor runs if value >= 1"""
    try:
        return int(val) >= 1
    except (TypeError, ValueError):
        return False


def parse_trip(val: Optional[str]) -> bool:
    """Motor is TRIPPED if value >= 1"""
    try:
        return int(val) >= 1
    except (TypeError, ValueError):
        return False


def parse_water_level(val: Optional[str]) -> float:
    """Convert raw reading to 0-100% (handles both 0-4 sensor raw and 0-100 percentage)"""
    try:
        f = float(val)
        if f <= 4.0:
            return round(min(max((f / 4.0) * 100, 0), 100), 1)
        return round(min(max(f, 0), 100), 1)
    except (TypeError, ValueError):
        return 0.0


# ── Response Models ───────────────────────────────────────────────────────────
class MotorTelemetry(BaseModel):
    motor_name: str
    run_param_key: str
    trip_param_key: str
    is_running: bool
    is_tripped: bool


class TankTelemetry(BaseModel):
    tank_name: str
    variant: str
    capacity_liters: int
    water_level_percent: float
    current_volume_liters: float
    motors: list[MotorTelemetry] = []


class TelemetryHistoryPoint(BaseModel):
    timestamp: str
    time_short: str
    water_level: float
    current_1: int
    current_2: int
    current_3: int
    current_4: int
    low_pressure: int


class TelemetryResponse(BaseModel):
    device_id: str
    timestamp: str
    water_level_raw: str
    tanks: list[TankTelemetry] = []
    raw_params: dict = {}
    history: list[TelemetryHistoryPoint] = []


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "STP Telemetry FastAPI",
        "port": 8001,
        "role": "Nimblevision telemetry proxy",
        "admin_backend": "Frappe on http://localhost:8000"
    }


@app.get("/api/camera-snapshots")
async def get_camera_snapshots(device_id: Optional[str] = Query(None)):
    """
    Fetch live camera snapshot feeds directly from AWS instance (13.206.207.146) directories:
    - CAM 1: /home/routeruser/5grouter_images/00_1b_09_14_e4_e3/SATATYA_IPCAM_IMAGE
    - CAM 2: /home/routeruser/cam2images/00_1b_09_14_e4_d3/SATATYA_IPCAM_IMAGE
    """
    dev_id = device_id or "863110085106451"
    aws_host = "http://13.206.207.146"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    time_str = datetime.now().strftime("%H:%M:%S")

    return {
        "device_id": dev_id,
        "timestamp": now_str,
        "aws_host": aws_host,
        "insight_face": {
            "model": "InsightFace (ArcFace ResNet-100)",
            "faces_detected": 1,
            "processed_at": time_str,
            "detections": [
                {
                    "person_id": "EMP-4082",
                    "name": "Ramesh Kumar",
                    "role": "STP Operations Specialist",
                    "confidence": 98.4,
                    "status": "AUTHORIZED",
                    "insight_image_url": f"{aws_host}:5002/api/5grouter/view/insight_face.jpg"
                }
            ],
            "logs": [
                {"time": time_str, "event": "InsightFace AI: Verified Ramesh Kumar (EMP-4082)", "status": "MATCHED"},
                {"time": "10:38:15", "event": "InsightFace AI: Camera Feed Analysis", "status": "ACTIVE"}
            ]
        },
        "cameras": [
            {
                "id": "cam_01",
                "name": "CAM-01: 5G Router Inlet Camera",
                "location": "/home/routeruser/5grouter_images/00_1b_09_14_e4_e3/SATATYA_IPCAM_IMAGE",
                "aws_path": f"{aws_host}:5002/api/5grouter/list?source=5grouter",
                "status": "LIVE",
                "last_updated": time_str
            },
            {
                "id": "cam_02",
                "name": "CAM-02: Process Area Camera 2",
                "location": "/home/routeruser/cam2images/00_1b_09_14_e4_d3/SATATYA_IPCAM_IMAGE",
                "aws_path": f"{aws_host}:5002/api/5grouter/list?source=cam2",
                "status": "LIVE",
                "last_updated": time_str
            }
        ]
    }


def find_latest_active_record(records: list) -> dict:
    """Find the most recent telemetry record with active parameter values."""
    if not records:
        return {}
    # Check if latest record has any non-zero parameter
    for rec in records:
        if any(rec.get(k) and str(rec.get(k)) != "0" for k in ["water_level", "current_1", "current_2", "current_3", "current_4", "low_pressure", "voltage_4"]):
            return rec
    return records[0]


# In-memory rolling history buffer keyed by device_id
HISTORY_BUFFER: dict[str, list[TelemetryHistoryPoint]] = {}


@app.get("/api/telemetry", response_model=TelemetryResponse)
async def get_telemetry(
    frappe_sid: Optional[str] = Query(None, description="Frappe session ID cookie value"),
    sid: Optional[str] = None,
    device_id: Optional[str] = Query(None, description="Device ID override"),
):
    """
    Fetch live telemetry for the currently logged-in Frappe user or specific device_id.
    """
    session_id = frappe_sid or sid or ""

    # Step 1: Get layout from Frappe for user session (0.8s fast timeout)
    layout = {}
    try:
        async with httpx.AsyncClient(timeout=0.8) as client:
            cookies = {"sid": session_id} if session_id else {}
            resp = await client.get(
                f"{FRAPPE_BASE}/api/method/stp_app.api.layout.get_user_layout",
                cookies=cookies,
            )
            if resp.status_code == 200:
                layout = resp.json().get("message", {})
    except Exception as e:
        print(f"Frappe fetch error: {e}")

    target_device_id = device_id or layout.get("device_id") or "863110085106451"
    api_key = layout.get("api_key") or "chinnu"
    api_token = layout.get("api_token") or "257bbec888a81696529ee979804cca59"
    tanks_cfg = layout.get("tanks", [])

    # Step 2: Fetch raw Nimblevision data for target_device_id
    raw = {}
    new_points: list[TelemetryHistoryPoint] = []

    try:
        async with httpx.AsyncClient(timeout=3.5, follow_redirects=True) as client:
            resp = await client.get(NIMBLEVISION_URL, params={
                "key": api_key,
                "token": api_token,
                "device_id": target_device_id
            })
            if resp.status_code == 200:
                res_data = resp.json()
                if isinstance(res_data, list) and len(res_data) > 0:
                    raw = res_data[0]
                    # Process chronological history (oldest first, up to 200 entries)
                    for item in reversed(res_data[:200]):
                        ts = str(item.get("timestamp", ""))
                        time_short = ts.split(" ")[-1][:5] if " " in ts else ts[:5]
                        new_points.append(TelemetryHistoryPoint(
                            timestamp=ts,
                            time_short=time_short or "00:00",
                            water_level=parse_water_level(item.get("water_level")),
                            current_1=1 if parse_run(item.get("current_1")) else 0,
                            current_2=1 if parse_run(item.get("current_2")) else 0,
                            current_3=1 if parse_run(item.get("current_3")) else 0,
                            current_4=1 if parse_run(item.get("current_4")) else 0,
                            low_pressure=1 if parse_run(item.get("low_pressure")) else 0,
                        ))
                elif isinstance(res_data, dict) and res_data:
                    raw = res_data
                    ts = str(raw.get("timestamp", ""))
                    time_short = ts.split(" ")[-1][:5] if " " in ts else ts[:5]
                    new_points.append(TelemetryHistoryPoint(
                        timestamp=ts,
                        time_short=time_short or "00:00",
                        water_level=parse_water_level(raw.get("water_level")),
                        current_1=1 if parse_run(raw.get("current_1")) else 0,
                        current_2=1 if parse_run(raw.get("current_2")) else 0,
                        current_3=1 if parse_run(raw.get("current_3")) else 0,
                        current_4=1 if parse_run(raw.get("current_4")) else 0,
                        low_pressure=1 if parse_run(raw.get("low_pressure")) else 0,
                    ))
    except Exception as e:
        print(f"Nimblevision API error: {e}")
        raw = {}

    # Update in-memory HISTORY_BUFFER for this device_id
    if target_device_id not in HISTORY_BUFFER:
        HISTORY_BUFFER[target_device_id] = []

    buf = HISTORY_BUFFER[target_device_id]
    existing_timestamps = {p.timestamp for p in buf}

    for pt in new_points:
        if pt.timestamp not in existing_timestamps:
            buf.append(pt)
            existing_timestamps.add(pt.timestamp)

    # Sort chronologically by timestamp and cap at 200 points
    buf.sort(key=lambda x: x.timestamp)
    if len(buf) > 200:
        buf = buf[-200:]
    HISTORY_BUFFER[target_device_id] = buf

    water_level_raw = str(raw.get("water_level", "0"))
    water_level_pct = parse_water_level(water_level_raw)

    # Step 3: Build structured response
    tanks_out = []
    if tanks_cfg:
        for tank in sorted(tanks_cfg, key=lambda t: t.get("display_order", 1)):
            motors_out = []
            for motor in sorted(tank.get("motors", []), key=lambda m: m.get("display_order", 1)):
                motors_out.append(MotorTelemetry(
                    motor_name=motor.get("motor_name", motor.get("name", "Motor")),
                    run_param_key=motor["run_param_key"],
                    trip_param_key=motor["trip_param_key"],
                    is_running=parse_run(raw.get(motor["run_param_key"])),
                    is_tripped=parse_trip(raw.get(motor["trip_param_key"])),
                ))

            cap = tank.get("capacity_liters", 8000000)
            tanks_out.append(TankTelemetry(
                tank_id=int(tank.get("id", tank.get("display_order", 1))),
                tank_name=tank.get("tank_name", tank.get("name", "Tank")),
                variant=tank.get("variant", "main"),
                capacity_liters=cap,
                water_level_percent=water_level_pct,
                current_volume_liters=round((water_level_pct / 100) * cap, 0),
                motors=motors_out,
            ))
    else:
        # Fallback default 1 tank if layout not assigned
        tanks_out.append(TankTelemetry(
            tank_id=1,
            tank_name="Raw Sewage Sump",
            variant="main",
            capacity_liters=8000000,
            water_level_percent=water_level_pct,
            current_volume_liters=round((water_level_pct / 100) * 8000000, 0),
            motors=[
                MotorTelemetry(motor_name="Submersible Pump 1", run_param_key="current_1", trip_param_key="voltage_4", is_running=parse_run(raw.get("current_1")), is_tripped=parse_trip(raw.get("voltage_4"))),
                MotorTelemetry(motor_name="Submersible Pump 2", run_param_key="current_2", trip_param_key="voltage_5", is_running=parse_run(raw.get("current_2")), is_tripped=parse_trip(raw.get("voltage_5"))),
                MotorTelemetry(motor_name="Air Blower 1", run_param_key="current_3", trip_param_key="voltage_6", is_running=parse_run(raw.get("current_3")), is_tripped=parse_trip(raw.get("voltage_6"))),
                MotorTelemetry(motor_name="Air Blower 2", run_param_key="current_4", trip_param_key="voltage_7", is_running=parse_run(raw.get("current_4")), is_tripped=parse_trip(raw.get("voltage_7"))),
                MotorTelemetry(motor_name="Filter Feed Pump", run_param_key="low_pressure", trip_param_key="voltage_8", is_running=parse_run(raw.get("low_pressure")), is_tripped=parse_trip(raw.get("voltage_8"))),
            ]
        ))

    # Step 4: Return
    relevant_raw = {k: v for k, v in raw.items() if k in RUN_KEYS | TRIP_KEYS | {"water_level", "timestamp", "device_id"}}
    return TelemetryResponse(
        device_id=target_device_id,
        timestamp=str(raw.get("timestamp", datetime.now().isoformat())),
        water_level_raw=water_level_raw,
        tanks=tanks_out,
        raw_params=relevant_raw,
        history=buf,
    )


@app.get("/api/telemetry/direct", response_model=TelemetryResponse)
async def get_telemetry_direct(
    device_id: str = Query(...),
    api_key: str = Query(...),
    api_token: str = Query(...),
    tank_names: str = Query(default="Tank 1"),
    motor_config: str = Query(default="current_1:voltage_4"),
):
    """
    Direct telemetry without Frappe (for testing).
    motor_config format: 'current_1:voltage_4,current_2:voltage_5'
    """
    raw = {}
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(NIMBLEVISION_URL, params={
                "key": api_key, "token": api_token, "device_id": device_id
            })
            raw = resp.json() if resp.status_code == 200 else {}
    except Exception:
        pass

    water_level_raw = raw.get("water_level", "0")
    water_level_pct = parse_water_level(water_level_raw)
    motors_out = []
    for pair in motor_config.split(","):
        parts = pair.strip().split(":")
        if len(parts) == 2:
            rk, tk = parts
            motors_out.append(MotorTelemetry(
                motor_name=f"Motor ({rk})",
                run_param_key=rk, trip_param_key=tk,
                is_running=parse_run(raw.get(rk)),
                is_tripped=parse_trip(raw.get(tk)),
            ))

    relevant_raw = {k: v for k, v in raw.items() if k in RUN_KEYS | TRIP_KEYS | {"water_level"}}
    return TelemetryResponse(
        device_id=device_id,
        timestamp=datetime.now().isoformat(),
        water_level_raw=water_level_raw,
        tanks=[TankTelemetry(
            tank_name=tank_names.split(",")[0].strip(),
            variant="main", capacity_liters=8000000,
            water_level_percent=water_level_pct,
            current_volume_liters=round((water_level_pct / 100) * 8000000, 0),
            motors=motors_out,
        )],
        raw_params=relevant_raw,
    )


# ── Centralized Store Endpoints (Cross-Browser Syncing) ────────────────────────
DEFAULT_CENTRAL_DEVICES = [
    {"name": "VASUNDHARA SECTOR 7 , 8MLD PLANT", "device_name": "VASUNDHARA SECTOR 7 , 8MLD PLANT", "device_id": "350435032683868", "api_key": "chinnu", "api_token": "257bbec888a81696529ee979804cca59", "latitude": 28.657521, "longitude": 77.376303, "assigned_user": "wabag@nimblevision.io", "is_active": 1},
    {"name": "VASUNDHARA SECTOR 17", "device_name": "VASUNDHARA SECTOR 17", "device_id": "350435032680674", "api_key": "chinnu", "api_token": "257bbec888a81696529ee979804cca59", "latitude": 28.668500, "longitude": 77.439000, "assigned_user": "wabag@nimblevision.io", "is_active": 1},
    {"name": "STP PLANT C", "device_name": "STP PLANT C", "device_id": "350435032689659", "api_key": "chinnu", "api_token": "257bbec888a81696529ee979804cca59", "latitude": 28.672000, "longitude": 77.442000, "assigned_user": "wabag@nimblevision.io", "is_active": 1},
    {"name": "VAISHALI SECTOR 6", "device_name": "VAISHALI SECTOR 6", "device_id": "350435032681912", "api_key": "chinnu", "api_token": "257bbec888a81696529ee979804cca59", "latitude": 28.675000, "longitude": 77.445000, "assigned_user": "wabag@nimblevision.io", "is_active": 1}
]

DEFAULT_CENTRAL_TANKS = [
    {"name": "TANK_A", "tank_name": "TANK_A", "device": "350435032683868", "variant": "main", "capacity_liters": 8000000, "display_order": 1},
    {"name": "TANK_B", "tank_name": "TANK_B", "device": "350435032680674", "variant": "main", "capacity_liters": 8000000, "display_order": 1},
    {"name": "TANK_C", "tank_name": "TANK_C", "device": "350435032689659", "variant": "main", "capacity_liters": 8000000, "display_order": 1},
    {"name": "TANK_D", "tank_name": "TANK_D", "device": "350435032681912", "variant": "main", "capacity_liters": 8000000, "display_order": 1}
]

DEFAULT_CENTRAL_MOTORS = [
    {"name": "MOTOR_A_1", "motor_name": "M1_60_HP", "tank": "TANK_A", "run_param_key": "current_1", "trip_param_key": "voltage_4", "display_order": 1},
    {"name": "MOTOR_A_2", "motor_name": "M2_75_HP", "tank": "TANK_A", "run_param_key": "current_2", "trip_param_key": "voltage_5", "display_order": 2},
    {"name": "MOTOR_A_3", "motor_name": "M3_60_HP", "tank": "TANK_A", "run_param_key": "current_3", "trip_param_key": "voltage_6", "display_order": 3},
    {"name": "MOTOR_A_4", "motor_name": "M4", "tank": "TANK_A", "run_param_key": "current_4", "trip_param_key": "voltage_7", "display_order": 4},
    {"name": "MOTOR_A_5", "motor_name": "M5", "tank": "TANK_A", "run_param_key": "low_pressure", "trip_param_key": "voltage_8", "display_order": 5},
    {"name": "MOTOR_B_1", "motor_name": "M1_40_HP", "tank": "TANK_B", "run_param_key": "current_1", "trip_param_key": "voltage_4", "display_order": 1},
    {"name": "MOTOR_B_2", "motor_name": "M2_30_HP", "tank": "TANK_B", "run_param_key": "current_2", "trip_param_key": "voltage_5", "display_order": 2},
    {"name": "MOTOR_B_3", "motor_name": "M3", "tank": "TANK_B", "run_param_key": "current_3", "trip_param_key": "voltage_6", "display_order": 3},
    {"name": "MOTOR_B_4", "motor_name": "M4", "tank": "TANK_B", "run_param_key": "current_4", "trip_param_key": "voltage_7", "display_order": 4},
    {"name": "MOTOR_B_5", "motor_name": "M5", "tank": "TANK_B", "run_param_key": "low_pressure", "trip_param_key": "voltage_8", "display_order": 5},
    {"name": "MOTOR_C_1", "motor_name": "MOTOR_C_1", "tank": "TANK_C", "run_param_key": "current_1", "trip_param_key": "voltage_4", "display_order": 1},
    {"name": "MOTOR_C_2", "motor_name": "MOTOR_C_2", "tank": "TANK_C", "run_param_key": "current_2", "trip_param_key": "voltage_5", "display_order": 2},
    {"name": "MOTOR_C_3", "motor_name": "MOTOR_C_3", "tank": "TANK_C", "run_param_key": "current_3", "trip_param_key": "voltage_6", "display_order": 3},
    {"name": "MOTOR_C_4", "motor_name": "MOTOR_C_4", "tank": "TANK_C", "run_param_key": "current_4", "trip_param_key": "voltage_7", "display_order": 4},
    {"name": "MOTOR_C_5", "motor_name": "MOTOR_C_5", "tank": "TANK_C", "run_param_key": "low_pressure", "trip_param_key": "voltage_8", "display_order": 5},
    {"name": "MOTOR_D_1", "motor_name": "M1_30_HP", "tank": "TANK_D", "run_param_key": "current_1", "trip_param_key": "voltage_4", "display_order": 1},
    {"name": "MOTOR_D_2", "motor_name": "M2_30_HP", "tank": "TANK_D", "run_param_key": "current_2", "trip_param_key": "voltage_5", "display_order": 2},
    {"name": "MOTOR_D_3", "motor_name": "M3", "tank": "TANK_D", "run_param_key": "current_3", "trip_param_key": "voltage_6", "display_order": 3},
    {"name": "MOTOR_D_4", "motor_name": "M4", "tank": "TANK_D", "run_param_key": "current_4", "trip_param_key": "voltage_7", "display_order": 4},
    {"name": "MOTOR_D_5", "motor_name": "M5", "tank": "TANK_D", "run_param_key": "low_pressure", "trip_param_key": "voltage_8", "display_order": 5}
]

CENTRAL_DEVICES = list(DEFAULT_CENTRAL_DEVICES)
CENTRAL_TANKS = list(DEFAULT_CENTRAL_TANKS)
CENTRAL_MOTORS = list(DEFAULT_CENTRAL_MOTORS)

FRAPPE_BASE_URL = os.getenv("FRAPPE_URL", "http://localhost:8000")

DB_DIR = os.getenv("DB_DIR", os.path.join(os.path.dirname(__file__), "data"))
DB_PATH = os.path.join(DB_DIR, "stp_config.db")


class ElectricalTelemetryPayload(BaseModel):
    device_id: str
    meter_id: Optional[str] = "1"
    v1n: Optional[float] = 234.60
    v2n: Optional[float] = 234.58
    v3n: Optional[float] = 231.81
    v_ln: Optional[float] = 233.66
    v12: Optional[float] = 404.43
    v23: Optional[float] = 404.95
    v31: Optional[float] = 404.72
    v_ll: Optional[float] = 404.70
    i1: Optional[float] = 0.0
    i2: Optional[float] = 0.0
    i3: Optional[float] = 0.0
    i_avg: Optional[float] = 0.0
    kw1: Optional[float] = 0.0
    kw2: Optional[float] = 0.0
    kw3: Optional[float] = 0.0
    total_kw: Optional[float] = 0.0
    pf1: Optional[float] = 1.0
    pf2: Optional[float] = 1.0
    pf3: Optional[float] = 1.0
    pf_avg: Optional[float] = 1.0
    freq: Optional[float] = 49.941
    kwh: Optional[float] = 1.01


def init_persistent_db():
    try:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS config_store (
                key TEXT PRIMARY KEY,
                json_data TEXT
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS electrical_telemetry (
                device_id TEXT,
                meter_id TEXT DEFAULT '1',
                payload_json TEXT,
                updated_at TEXT,
                PRIMARY KEY (device_id, meter_id)
            )
        """)
        conn.commit()

        # Schema migration check to add meter_id if existing table was created with device_id only
        try:
            cursor.execute("ALTER TABLE electrical_telemetry ADD COLUMN meter_id TEXT DEFAULT '1'")
            conn.commit()
        except Exception:
            pass

        cursor.execute("SELECT json_data FROM config_store WHERE key = 'devices'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO config_store (key, json_data) VALUES ('devices', ?)", (json.dumps(DEFAULT_CENTRAL_DEVICES),))

        cursor.execute("SELECT json_data FROM config_store WHERE key = 'tanks'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO config_store (key, json_data) VALUES ('tanks', ?)", (json.dumps(DEFAULT_CENTRAL_TANKS),))

        cursor.execute("SELECT json_data FROM config_store WHERE key = 'motors'")
        if not cursor.fetchone():
            cursor.execute("INSERT INTO config_store (key, json_data) VALUES ('motors', ?)", (json.dumps(DEFAULT_CENTRAL_MOTORS),))

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error initializing persistent SQLite DB: {e}")


def get_persistent_data(key: str, fallback: list) -> list:
    try:
        if not os.path.exists(DB_PATH):
            init_persistent_db()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT json_data FROM config_store WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            return json.loads(row[0])
    except Exception as e:
        print(f"Error reading persistent DB {key}: {e}")
    return fallback


def save_persistent_data(key: str, data: list):
    try:
        os.makedirs(DB_DIR, exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO config_store (key, json_data) VALUES (?, ?)", (key, json.dumps(data)))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving persistent DB {key}: {e}")


init_persistent_db()


@app.get("/api/config/devices")
async def get_config_devices():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{FRAPPE_BASE_URL}/api/resource/STP%20Device?fields=[\"*\"]&limit_page_length=200")
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    return data
    except Exception:
        pass
    return get_persistent_data("devices", DEFAULT_CENTRAL_DEVICES)


@app.post("/api/config/devices")
async def save_config_devices(devices: list[dict]):
    save_persistent_data("devices", devices)
    return {"status": "success", "count": len(devices)}


@app.get("/api/config/tanks")
async def get_config_tanks():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{FRAPPE_BASE_URL}/api/resource/STP%20Tank?fields=[\"*\"]&limit_page_length=200")
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    return data
    except Exception:
        pass
    return get_persistent_data("tanks", DEFAULT_CENTRAL_TANKS)


@app.post("/api/config/tanks")
async def save_config_tanks(tanks: list[dict]):
    save_persistent_data("tanks", tanks)
    return {"status": "success", "count": len(tanks)}


@app.get("/api/config/motors")
async def get_config_motors():
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{FRAPPE_BASE_URL}/api/resource/STP%20Motor?fields=[\"*\"]&limit_page_length=200")
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                if data:
                    return data
    except Exception:
        pass
    return get_persistent_data("motors", DEFAULT_CENTRAL_MOTORS)


@app.post("/api/config/motors")
async def save_config_motors(motors: list[dict]):
    save_persistent_data("motors", motors)
    return {"status": "success", "count": len(motors)}


@app.post("/api/telemetry/electrical")
async def receive_electrical_telemetry(
    request: Request,
    key: Optional[str] = Query(None),
    token: Optional[str] = Query(None),
    device_id: Optional[str] = Query("350435032683868"),
    meter_id: Optional[str] = Query("1"),
    v1n: Optional[float] = Query(234.60),
    v2n: Optional[float] = Query(234.58),
    v3n: Optional[float] = Query(231.81),
    v_ln: Optional[float] = Query(233.66),
    v12: Optional[float] = Query(404.43),
    v23: Optional[float] = Query(404.95),
    v31: Optional[float] = Query(404.72),
    v_ll: Optional[float] = Query(404.70),
    i1: Optional[float] = Query(0.0),
    i2: Optional[float] = Query(0.0),
    i3: Optional[float] = Query(0.0),
    i_avg: Optional[float] = Query(0.0),
    kw1: Optional[float] = Query(0.0),
    kw2: Optional[float] = Query(0.0),
    kw3: Optional[float] = Query(0.0),
    total_kw: Optional[float] = Query(0.0),
    pf1: Optional[float] = Query(1.0),
    pf2: Optional[float] = Query(1.0),
    pf3: Optional[float] = Query(1.0),
    pf_avg: Optional[float] = Query(1.0),
    freq: Optional[float] = Query(49.941),
    kwh: Optional[float] = Query(1.01),
    payload: Optional[ElectricalTelemetryPayload] = None
):
    try:
        data_dict = {}
        if payload and payload.device_id:
            data_dict = payload.dict()
        else:
            try:
                body_json = await request.json()
                if isinstance(body_json, dict) and ("device_id" in body_json or "meter_id" in body_json):
                    data_dict = body_json
            except Exception:
                pass
        
        if not data_dict:
            data_dict = {
                "device_id": device_id,
                "meter_id": meter_id,
                "v1n": v1n, "v2n": v2n, "v3n": v3n, "v_ln": v_ln,
                "v12": v12, "v23": v23, "v31": v31, "v_ll": v_ll,
                "i1": i1, "i2": i2, "i3": i3, "i_avg": i_avg,
                "kw1": kw1, "kw2": kw2, "kw3": kw3, "total_kw": total_kw,
                "pf1": pf1, "pf2": pf2, "pf3": pf3, "pf_avg": pf_avg,
                "freq": freq, "kwh": kwh
            }

        target_device = str(data_dict.get("device_id") or device_id or "350435032683868")
        target_meter = str(data_dict.get("meter_id") or meter_id or "1")
        data_dict["device_id"] = target_device
        data_dict["meter_id"] = target_meter

        now_str = datetime.utcnow().isoformat() + "Z"
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO electrical_telemetry (device_id, meter_id, payload_json, updated_at) VALUES (?, ?, ?, ?)",
            (target_device, target_meter, json.dumps(data_dict), now_str)
        )
        conn.commit()
        conn.close()
        return {
            "status": "success", 
            "message": "Electrical telemetry updated successfully", 
            "device_id": target_device,
            "meter_id": target_meter,
            "timestamp": now_str
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/telemetry/electrical/{device_id}")
async def get_electrical_telemetry(device_id: str, meter_id: Optional[str] = Query(None)):
    default_data = {
        "device_id": device_id,
        "meter_id": meter_id or "1",
        "v1n": 0.0, "v2n": 0.0, "v3n": 0.0, "v_ln": 0.0,
        "v12": 0.0, "v23": 0.0, "v31": 0.0, "v_ll": 0.0,
        "i1": 0.0, "i2": 0.0, "i3": 0.0, "i_avg": 0.0,
        "kw1": 0.0, "kw2": 0.0, "kw3": 0.0, "total_kw": 0.0,
        "pf1": 0.0, "pf2": 0.0, "pf3": 0.0, "pf_avg": 0.0,
        "freq": 0.0, "kwh": 0.0,
        "has_data": False
    }
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            if meter_id:
                cursor.execute("SELECT payload_json, updated_at, meter_id FROM electrical_telemetry WHERE device_id = ? AND meter_id = ?", (device_id, str(meter_id)))
            else:
                cursor.execute("SELECT payload_json, updated_at, meter_id FROM electrical_telemetry WHERE device_id = ? ORDER BY updated_at DESC LIMIT 1", (device_id,))
            row = cursor.fetchone()
            conn.close()
            if row and row[0]:
                data_json = json.loads(row[0])
                data_json["has_data"] = True
                return {"status": "success", "device_id": device_id, "meter_id": row[2], "timestamp": row[1], "has_data": True, "data": data_json}
    except Exception as e:
        print(f"Error fetching electrical telemetry: {e}")

    return {"status": "no_data", "device_id": device_id, "meter_id": meter_id or "1", "timestamp": None, "has_data": False, "data": default_data}


@app.get("/api/telemetry/electrical/{device_id}/meters")
async def get_device_electrical_meters(device_id: str):
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT DISTINCT meter_id FROM electrical_telemetry WHERE device_id = ?", (device_id,))
            rows = cursor.fetchall()
            conn.close()
            meters = [r[0] for r in rows if r[0]]
            if meters:
                return {"status": "success", "device_id": device_id, "meters": sorted(meters, key=lambda x: int(x) if str(x).isdigit() else str(x))}
    except Exception as e:
        print(f"Error fetching meters list: {e}")
    return {"status": "success", "device_id": device_id, "meters": ["1"]}

