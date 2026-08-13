# Implementation Plan: STP Monitoring Dashboard & SCADA Visualizer

An end-to-end STP (Sewage Treatment Plant) Monitoring System featuring role-based authentication (Admin & User), dynamic Admin configuration for user devices, tanks, and motors, and a real-time SCADA interactive dashboard with animated SVG graphics for Tanks, Pumps, and Pipes.

---

## 1. System Architecture & Tech Stack

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       REACT FRONTEND                        │
 │  - Admin Portal (User Management, Device & Tank Setup)      │
 │  - User Dashboard (Dynamic SCADA SVG Visualization)         │
 │  - Custom SVG Components: Pipe.tsx, Pump.tsx, Tank.tsx      │
 └──────────────────────────────┬──────────────────────────────┘
                                │ REST API / JSON
 ┌──────────────────────────────▼──────────────────────────────┐
 │                      FASTAPI BACKEND                        │
 │  - JWT Auth Engine & Role Access Control (Admin / User)     │
 │  - Dynamic Layout & Device Mapping Database                 │
 │  - Nimblevision API Polling & Telemetry Data Engine         │
 └──────────────────────────────┬──────────────────────────────┘
                                │ HTTP GET API
 ┌──────────────────────────────▼──────────────────────────────┐
 │                     NIMBLEVISION API                        │
 │  http://nimblevision.io/public/api/getDeviceDiagnosticInfo  │
 └─────────────────────────────────────────────────────────────┘
```

- **Frontend**: React (TypeScript + Vite + Tailwind CSS + Lucide Icons)
- **Primary Backend / Metadata Management**: **Frappe Framework (Python/MariaDB)**
  - Stores & manages DocTypes for **Users, Device Assignments, Tank Schematics & Motor Mappings**.
  - Provides built-in Admin Desk UI & RBAC for quick user & device configuration.
- **Real-Time Telemetry Engine**: **FastAPI (Python)**
  - High-performance, async polling and parameter parsing of the Nimblevision API.
  - Serves fast real-time telemetry endpoints / WebSockets to the React SCADA frontend.
- **External Integration**: Nimblevision Diagnostic API (`http://nimblevision.io/...`)

---

## 2. Nimblevision Telemetry Data Mapping

The external API returns diagnostic parameters where standard voltage/current fields are repurposed for STP motor trip & run status:

| Parameter Key | Repurposed Meaning | Mapping & Behavior |
| :--- | :--- | :--- |
| `voltage_4` | **Motor 1 Trip Status** | `"1"` = Normal, `"0"` or `>1` = Tripped / Warning |
| `voltage_5` | **Motor 2 Trip Status** | `"1"` = Normal, `"0"` or `>1` = Tripped / Warning |
| `voltage_6` | **Motor 3 Trip Status** | `"1"` = Normal, `"0"` or `>1` = Tripped / Warning |
| `voltage_7` | **Motor 4 Trip Status** | `"1"` = Normal, `"0"` or `>1` = Tripped / Warning |
| `voltage_8` | **Motor 5 Trip Status** | `"1"` = Normal, `"0"` or `>1` = Tripped / Warning |
| `current_1` | **Motor 1 Run Status** | `"1"` = ON (Running), `"0"` = OFF |
| `current_2` | **Motor 2 Run Status** | `"1"` = ON (Running), `"0"` = OFF |
| `current_3` | **Motor 3 Run Status** | `"1"` = ON (Running), `"0"` = OFF |
| `current_4` | **Motor 4 Run Status** | `"1"` = ON (Running), `"0"` = OFF |
| `low_pressure` | **Motor 5 Run Status** | `"1"` or `"2"` = ON (Running), `"0"` = OFF |
| `water_level` | **Tank Water Level** | Numerical level / percentage mapping |

---

## 3. Database Schema & Data Models

### 1. `users`
- `id` (Primary Key)
- `username` (Unique)
- `password_hash`
- `role` (`"admin"` | `"user"`)
- `full_name`

### 2. `devices`
- `id` (Primary Key)
- `user_id` (Foreign Key -> `users.id`)
- `device_id` (e.g. `"2453825"`)
- `api_key` (e.g. `"chinnu"`)
- `api_token` (e.g. `"257bbec888a81696529ee979804cca59"`)
- `device_name`

### 3. `tanks`
- `id` (Primary Key)
- `device_id` (Foreign Key -> `devices.id`)
- `name` (e.g. "Raw Sewage Sump", "Aeration Tank")
- `variant` (`"main"` | `"underground"`)
- `capacity_liters` (e.g. `10000`)
- `display_order` (1, 2, 3...)

### 4. `motors`
- `id` (Primary Key)
- `tank_id` (Foreign Key -> `tanks.id`)
- `name` (e.g. "Intake Pump P-101", "Aeration Blower B-102")
- `run_param_key` (e.g. `"current_1"`, `"current_2"`, etc.)
- `trip_param_key` (e.g. `"voltage_4"`, `"voltage_5"`, etc.)
- `display_order` (1, 2, 3...)

---

## 4. Feature Modules

### A. Authentication Module
- Login screen supporting Admin (`admin / admin123`) and User accounts.
- JWT-based authorization header stored securely in client state.
- Auto-redirection based on user role (Admin -> Management Console, User -> SCADA Dashboard).

### B. Admin Portal (Configuration & User Assignment)
- **User Management**: Create/Edit users, set credentials and roles.
- **Device Assignment**: Link `device_id`, API key, and token to specific user accounts.
- **Topology Configuration**:
  - Add/Remove Tanks for a selected device (select variant: domed overhead tank vs underground sump).
  - Add/Remove Motors associated with each Tank.
  - Map each Motor to its corresponding API run parameter (`current_1`..`4`, `low_pressure`) and trip parameter (`voltage_4`..`8`).

### C. SCADA User Dashboard & SVG Visualizer
- **Dynamic Topology Engine**: Renders user-configured Tanks and associated Motors in sequence.
- **SVG Visual Components**:
  - **`Tank.tsx`**: Domed or underground tanks with water level gradients, volume readout, sight glass ruler, and animated inlet streams.
  - **`Pump.tsx`**: Centrifugal pump housing, rotating fan blades when running, LED status indicators, trip alerts, and equipment tags.
  - **`Pipe.tsx`**: Metallic multi-layered pipes with animated liquid flow cores and direction arrows when active.
- **Telemetry Update Loop**: Periodic polling (every 3-5 seconds) to FastAPI, which fetches live data from the Nimblevision endpoint and computes status states for each tank and motor.

---

## 5. Implementation Step-by-Step Plan

1. **Backend Initialization (FastAPI)**:
   - Setup project structure, SQLite database, and SQLAlchemy models.
   - Implement JWT authentication routes (`/api/auth/login`, `/api/auth/me`).
   - Implement Admin CRUD routes for Users, Devices, Tanks, and Motors.
   - Implement Telemetry proxy route (`/api/telemetry/{device_id}`) that queries Nimblevision API and translates parameters into parsed motor states & tank levels.

2. **Frontend Setup & SVG Component Integration (React + Vite)**:
   - Scaffold React application with Vite, TypeScript, and Tailwind CSS.
   - Integrate exact SVG components: `Pipe.tsx`, `Pump.tsx`, `Tank.tsx` with full animation CSS (`animate-pipe-flow`, `animate-motor-fan`, `animate-flow-arrow`).

3. **Admin Panel UI**:
   - Build User Management Table & Modal.
   - Build Device Assignment Form.
   - Build Visual Tank & Motor Configuration Builder with parameter drop-down pickers.

4. **User SCADA Dashboard**:
   - Build layout canvas connecting configured tanks and motors via SVG pipes.
   - Bind live API telemetry to pump statuses (`status="ON"` or `"OFF"`, trip flags) and tank liquid levels.
   - Add real-time metrics summary cards (Active Motors count, Tripped Motors alerts, Tank level percentages).

5. **Validation & Testing**:
   - Test login with Admin and User credentials.
   - Verify dynamic topology generation when Admin adds/modifies tanks and motors.
   - Test live fetching against Nimblevision API `device_id=2453825`.

---

## 6. Verification Checklist

- [ ] Admin can create users and assign `device_id` `2453825`.
- [ ] Admin can configure Tanks and assign Motors with correct parameter mappings (`voltage_4..8`, `current_1..4`, `low_pressure`).
- [ ] User login displays assigned device dashboard with SVG Tanks, Motors, and Pipes.
- [ ] Pump fan blades rotate when `current_1..4`/`low_pressure` indicates ON state.
- [ ] Pipes show animated fluid flow between connected tanks and pumps.
- [ ] Water levels in tanks accurately display status based on `water_level` API readout.
