export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Device {
  id: number;
  user_id: number;
  device_id: string;
  api_key: string;
  api_token: string;
  device_name: string;
}

export interface Motor {
  id: number;
  tank_id: number;
  name: string;
  run_param_key: string;
  trip_param_key: string;
  display_order: number;
}

export interface Tank {
  id: number;
  device_id: number;
  name: string;
  variant: 'main' | 'underground';
  capacity_liters: number;
  display_order: number;
  motors: Motor[];
}

export interface DeviceLayout {
  device_id: string;
  api_key: string;
  api_token: string;
  device_name: string;
  tanks: Tank[];
}

export interface MotorStatus {
  motor_id: number;
  motor_name: string;
  run_param_key: string;
  trip_param_key: string;
  is_running: boolean;
  is_tripped: boolean;
}

export interface TankTelemetry {
  tank_id: number;
  tank_name: string;
  variant: string;
  capacity_liters: number;
  water_level_percent: number;
  current_volume_liters: number;
  motors: MotorStatus[];
}

export interface TelemetryHistoryPoint {
  timestamp: string;
  time_short: string;
  water_level: number;
  current_1: number;
  current_2: number;
  current_3: number;
  current_4: number;
  low_pressure: number;
}

export interface TelemetryResponse {
  device_id: string;
  timestamp: string;
  water_level_raw: string;
  tanks: TankTelemetry[];
  raw_params: Record<string, string>;
  history?: TelemetryHistoryPoint[];
}

export interface AuthState {
  token: string | null;
  role: string | null;
  username: string | null;
  full_name: string | null;
}
