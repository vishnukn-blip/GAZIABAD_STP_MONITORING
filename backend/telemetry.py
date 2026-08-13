import httpx
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from database import Device, Tank, Motor
from schemas import TelemetryResponse, TankTelemetry, MotorStatus


NIMBLEVISION_BASE_URL = "http://nimblevision.io/public/api/getDeviceDiagnosticInfoNisensu"

# Keys that represent motor RUN status (originally current / low_pressure fields)
RUN_STATUS_KEYS = {"current_1", "current_2", "current_3", "current_4", "low_pressure"}
# Keys that represent motor TRIP status (originally voltage_4..8 fields)
TRIP_STATUS_KEYS = {"voltage_4", "voltage_5", "voltage_6", "voltage_7", "voltage_8"}


def parse_run_status(value: Optional[str]) -> bool:
    """Motor is running if value is '1' or '2'"""
    try:
        return int(value) >= 1
    except (TypeError, ValueError):
        return False


def parse_trip_status(value: Optional[str]) -> bool:
    """Motor is TRIPPED if value is NOT '1' (i.e., '0' or other)"""
    try:
        return int(value) != 1
    except (TypeError, ValueError):
        return True  # unknown = treat as tripped


def parse_water_level(value: Optional[str], max_val: int = 4) -> float:
    """
    Convert raw water_level to percentage.
    Nimblevision stores 0-4 range where 4 = 100%, scale accordingly.
    """
    try:
        raw = float(value)
        percent = (raw / max_val) * 100
        return round(min(max(percent, 0), 100), 1)
    except (TypeError, ValueError):
        return 0.0


async def fetch_nimblevision(api_key: str, api_token: str, device_id: str) -> dict:
    """Fetch raw diagnostic data from Nimblevision API"""
    params = {
        "key": api_key,
        "token": api_token,
        "device_id": device_id
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(NIMBLEVISION_BASE_URL, params=params)
        response.raise_for_status()
        return response.json()


async def get_device_telemetry(db: Session, device_db_id: int) -> Optional[TelemetryResponse]:
    """
    Fetch telemetry for a device from Nimblevision, parse the
    repurposed parameters, and map them onto the configured tanks & motors.
    """
    device: Device = db.query(Device).filter(Device.id == device_db_id).first()
    if not device:
        return None

    # Fetch raw data
    try:
        raw = await fetch_nimblevision(device.api_key, device.api_token, device.device_id)
    except Exception:
        raw = {}

    water_level_raw = raw.get("water_level", "0")
    water_level_percent = parse_water_level(water_level_raw)

    # Build telemetry per tank
    tanks_telemetry = []
    tanks_sorted = sorted(device.tanks, key=lambda t: t.display_order)

    for tank in tanks_sorted:
        motors_sorted = sorted(tank.motors, key=lambda m: m.display_order)
        motors_status = []
        for motor in motors_sorted:
            run_val = raw.get(motor.run_param_key)
            trip_val = raw.get(motor.trip_param_key)
            motors_status.append(MotorStatus(
                motor_id=motor.id,
                motor_name=motor.name,
                run_param_key=motor.run_param_key,
                trip_param_key=motor.trip_param_key,
                is_running=parse_run_status(run_val),
                is_tripped=parse_trip_status(trip_val),
            ))

        current_volume = round((water_level_percent / 100) * tank.capacity_liters, 0)
        tanks_telemetry.append(TankTelemetry(
            tank_id=tank.id,
            tank_name=tank.name,
            variant=tank.variant,
            capacity_liters=tank.capacity_liters,
            water_level_percent=water_level_percent,
            current_volume_liters=current_volume,
            motors=motors_status,
        ))

    # Filter raw params to only relevant STP keys
    displayed_raw = {
        k: v for k, v in raw.items()
        if k in RUN_STATUS_KEYS or k in TRIP_STATUS_KEYS or k == "water_level"
    }

    return TelemetryResponse(
        device_id=device.device_id,
        timestamp=datetime.now().isoformat(),
        water_level_raw=water_level_raw,
        tanks=tanks_telemetry,
        raw_params=displayed_raw,
    )
