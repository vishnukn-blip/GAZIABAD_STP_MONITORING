from pydantic import BaseModel
from typing import Optional, List


# ── Auth ─────────────────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: str


class LoginRequest(BaseModel):
    username: str
    password: str


# ── User ─────────────────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# ── Device ───────────────────────────────────────────────────────────────────
class DeviceCreate(BaseModel):
    user_id: int
    device_id: str
    api_key: str
    api_token: str
    device_name: str


class DeviceUpdate(BaseModel):
    device_id: Optional[str] = None
    api_key: Optional[str] = None
    api_token: Optional[str] = None
    device_name: Optional[str] = None


class DeviceResponse(BaseModel):
    id: int
    user_id: int
    device_id: str
    api_key: str
    api_token: str
    device_name: str

    class Config:
        from_attributes = True


# ── Motor ─────────────────────────────────────────────────────────────────────
class MotorCreate(BaseModel):
    tank_id: int
    name: str
    run_param_key: str
    trip_param_key: str
    display_order: int = 1


class MotorUpdate(BaseModel):
    name: Optional[str] = None
    run_param_key: Optional[str] = None
    trip_param_key: Optional[str] = None
    display_order: Optional[int] = None


class MotorResponse(BaseModel):
    id: int
    tank_id: int
    name: str
    run_param_key: str
    trip_param_key: str
    display_order: int

    class Config:
        from_attributes = True


# ── Tank ─────────────────────────────────────────────────────────────────────
class TankCreate(BaseModel):
    device_id: int
    name: str
    variant: str = "main"
    capacity_liters: int = 10000
    display_order: int = 1


class TankUpdate(BaseModel):
    name: Optional[str] = None
    variant: Optional[str] = None
    capacity_liters: Optional[int] = None
    display_order: Optional[int] = None


class TankResponse(BaseModel):
    id: int
    device_id: int
    name: str
    variant: str
    capacity_liters: int
    display_order: int
    motors: List[MotorResponse] = []

    class Config:
        from_attributes = True


# ── Layout (full device config) ──────────────────────────────────────────────
class DeviceLayout(BaseModel):
    device_id: str
    api_key: str
    api_token: str
    device_name: str
    tanks: List[TankResponse] = []


# ── Telemetry ─────────────────────────────────────────────────────────────────
class MotorStatus(BaseModel):
    motor_id: int
    motor_name: str
    run_param_key: str
    trip_param_key: str
    is_running: bool
    is_tripped: bool


class TankTelemetry(BaseModel):
    tank_id: int
    tank_name: str
    variant: str
    capacity_liters: int
    water_level_percent: float
    current_volume_liters: float
    motors: List[MotorStatus] = []


class TelemetryResponse(BaseModel):
    device_id: str
    timestamp: str
    water_level_raw: Optional[str] = None
    tanks: List[TankTelemetry] = []
    raw_params: Optional[dict] = None
