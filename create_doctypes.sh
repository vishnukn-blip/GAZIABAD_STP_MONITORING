#!/bin/bash
# STP DocTypes Creation Script
# Run inside ~/frappe-bench after frappe_setup.sh completes
# Usage: bash /mnt/c/Users/ASUS/Desktop/STP-GAZ/create_doctypes.sh

cd ~/frappe-bench

SITE="stp.localhost"
APP_PATH="apps/stp_app"

echo ""
echo "=============================================="
echo "  Creating STP Monitoring DocTypes"
echo "=============================================="

# ── Helper to create a DocType JSON ──────────────────────────────────────
create_doctype() {
    local name="$1"
    local json="$2"
    local app_dir="$APP_PATH/stp_app/doctype/$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]')"
    
    mkdir -p "$app_dir"
    echo "$json" > "$app_dir/$(echo "$name" | tr ' ' '_' | tr '[:upper:]' '[:lower:]').json"
    echo "  ✓ Created DocType: $name"
}

# ── 1. STP Device DocType ─────────────────────────────────────────────────
echo "[1/3] Creating STP Device DocType..."
mkdir -p "$APP_PATH/stp_app/doctype/stp_device"
cat > "$APP_PATH/stp_app/doctype/stp_device/stp_device.json" << 'EOF'
{
  "name": "STP Device",
  "module": "Stp App",
  "doctype": "DocType",
  "is_submittable": 0,
  "track_changes": 1,
  "fields": [
    {
      "fieldname": "device_name",
      "fieldtype": "Data",
      "label": "Device Name",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "device_id",
      "fieldtype": "Data",
      "label": "Device ID",
      "reqd": 1,
      "in_list_view": 1,
      "description": "Nimblevision device_id (e.g. 2453825)"
    },
    {
      "fieldname": "api_key",
      "fieldtype": "Data",
      "label": "API Key",
      "reqd": 1,
      "description": "Nimblevision API key (e.g. chinnu)"
    },
    {
      "fieldname": "api_token",
      "fieldtype": "Password",
      "label": "API Token",
      "reqd": 1,
      "description": "Nimblevision API token"
    },
    {
      "fieldname": "assigned_user",
      "fieldtype": "Link",
      "label": "Assigned User",
      "options": "User",
      "reqd": 1,
      "in_list_view": 1,
      "description": "The Frappe user who owns this device"
    },
    {
      "fieldname": "is_active",
      "fieldtype": "Check",
      "label": "Is Active",
      "default": "1"
    }
  ],
  "permissions": [
    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"role": "All", "read": 1}
  ],
  "title_field": "device_name"
}
EOF

cat > "$APP_PATH/stp_app/doctype/stp_device/stp_device.py" << 'EOF'
import frappe
from frappe.model.document import Document

class STPDevice(Document):
    def validate(self):
        if not self.device_id:
            frappe.throw("Device ID is required")
        if not self.api_key or not self.api_token:
            frappe.throw("API Key and Token are required")
EOF

# ── 2. STP Tank DocType ───────────────────────────────────────────────────
echo "[2/3] Creating STP Tank DocType..."
mkdir -p "$APP_PATH/stp_app/doctype/stp_tank"
cat > "$APP_PATH/stp_app/doctype/stp_tank/stp_tank.json" << 'EOF'
{
  "name": "STP Tank",
  "module": "Stp App",
  "doctype": "DocType",
  "is_submittable": 0,
  "track_changes": 1,
  "fields": [
    {
      "fieldname": "tank_name",
      "fieldtype": "Data",
      "label": "Tank Name",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "device",
      "fieldtype": "Link",
      "label": "Device",
      "options": "STP Device",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "variant",
      "fieldtype": "Select",
      "label": "Tank Variant",
      "options": "main\nunderground",
      "default": "main",
      "reqd": 1,
      "description": "main = overhead/ground tank, underground = sump pit"
    },
    {
      "fieldname": "capacity_liters",
      "fieldtype": "Int",
      "label": "Capacity (Liters)",
      "default": "10000",
      "reqd": 1
    },
    {
      "fieldname": "display_order",
      "fieldtype": "Int",
      "label": "Display Order",
      "default": "1",
      "reqd": 1,
      "description": "Order in which this tank appears in the SCADA visualization"
    }
  ],
  "permissions": [
    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"role": "All", "read": 1}
  ],
  "title_field": "tank_name"
}
EOF

cat > "$APP_PATH/stp_app/doctype/stp_tank/stp_tank.py" << 'EOF'
import frappe
from frappe.model.document import Document

class STPTank(Document):
    def validate(self):
        if self.capacity_liters <= 0:
            frappe.throw("Tank capacity must be greater than 0")
        if self.display_order <= 0:
            frappe.throw("Display order must be 1 or higher")
EOF

# ── 3. STP Motor DocType ──────────────────────────────────────────────────
echo "[3/3] Creating STP Motor DocType..."
mkdir -p "$APP_PATH/stp_app/doctype/stp_motor"
cat > "$APP_PATH/stp_app/doctype/stp_motor/stp_motor.json" << 'EOF'
{
  "name": "STP Motor",
  "module": "Stp App",
  "doctype": "DocType",
  "is_submittable": 0,
  "track_changes": 1,
  "fields": [
    {
      "fieldname": "motor_name",
      "fieldtype": "Data",
      "label": "Motor Name",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "tank",
      "fieldtype": "Link",
      "label": "Tank",
      "options": "STP Tank",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "run_param_key",
      "fieldtype": "Select",
      "label": "Run Status Parameter",
      "options": "current_1\ncurrent_2\ncurrent_3\ncurrent_4\nlow_pressure",
      "reqd": 1,
      "in_list_view": 1,
      "description": "Nimblevision parameter that indicates motor running state"
    },
    {
      "fieldname": "trip_param_key",
      "fieldtype": "Select",
      "label": "Trip Status Parameter",
      "options": "voltage_4\nvoltage_5\nvoltage_6\nvoltage_7\nvoltage_8",
      "reqd": 1,
      "in_list_view": 1,
      "description": "Nimblevision parameter that indicates motor trip state"
    },
    {
      "fieldname": "display_order",
      "fieldtype": "Int",
      "label": "Display Order",
      "default": "1",
      "reqd": 1
    }
  ],
  "permissions": [
    {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
    {"role": "All", "read": 1}
  ],
  "title_field": "motor_name"
}
EOF

cat > "$APP_PATH/stp_app/doctype/stp_motor/stp_motor.py" << 'EOF'
import frappe
from frappe.model.document import Document

class STPMotor(Document):
    def validate(self):
        # Ensure run/trip keys are different
        if self.run_param_key == self.trip_param_key:
            frappe.throw("Run parameter and Trip parameter cannot be the same key")
EOF

# ── Create Frappe API endpoints (whitelisted methods) ─────────────────────
echo "Creating Frappe API methods..."
mkdir -p "$APP_PATH/stp_app/api"

cat > "$APP_PATH/stp_app/api/__init__.py" << 'EOF'
EOF

cat > "$APP_PATH/stp_app/api/layout.py" << 'EOF'
"""
Frappe whitelisted API endpoints for STP Monitoring layout retrieval.
React frontend calls these to get the tank/motor config for the logged-in user.
"""
import frappe

@frappe.whitelist(allow_guest=False)
def get_user_layout():
    """
    Returns the STP Device + Tanks + Motors layout for the currently
    logged-in Frappe user. Called by React on dashboard load.
    """
    user = frappe.session.user
    
    # Find device assigned to this user
    devices = frappe.get_all(
        "STP Device",
        filters={"assigned_user": user, "is_active": 1},
        fields=["name", "device_name", "device_id", "api_key", "api_token"]
    )
    
    if not devices:
        frappe.throw(f"No active device assigned to user {user}", frappe.DoesNotExistError)
    
    device = devices[0]
    
    # Get tanks for this device, sorted by display_order
    tanks = frappe.get_all(
        "STP Tank",
        filters={"device": device["name"]},
        fields=["name", "tank_name", "variant", "capacity_liters", "display_order"],
        order_by="display_order asc"
    )
    
    # Get motors for each tank
    for tank in tanks:
        motors = frappe.get_all(
            "STP Motor",
            filters={"tank": tank["name"]},
            fields=["name", "motor_name", "run_param_key", "trip_param_key", "display_order"],
            order_by="display_order asc"
        )
        tank["motors"] = motors
    
    return {
        "device_id": device["device_id"],
        "api_key": device["api_key"],
        "api_token": device["api_token"],
        "device_name": device["device_name"],
        "tanks": tanks
    }


@frappe.whitelist(allow_guest=False)
def get_device_for_user(username=None):
    """Admin helper: get device assigned to a specific user"""
    frappe.only_for("System Manager")
    user = username or frappe.session.user
    
    devices = frappe.get_all(
        "STP Device",
        filters={"assigned_user": user},
        fields=["name", "device_name", "device_id", "api_key", "api_token", "is_active"]
    )
    return devices
EOF

cp /mnt/c/Users/ASUS/Desktop/STP-GAZ/setup_doctypes_native.py apps/stp_app/stp_app/create_doctypes.py
bench --site stp.localhost execute stp_app.create_doctypes.setup

echo ""
echo "=============================================="
echo "  ✅ ALL DOCTYPES CREATED SUCCESSFULLY!"
echo "=============================================="
echo ""

pkill -f redis-server 2>/dev/null || true
sleep 1
echo ""
echo "  DocTypes created:"
echo "    • STP Device  (device_id, api_key, api_token, assigned_user)"
echo "    • STP Tank    (device, variant, capacity, display_order)"
echo "    • STP Motor   (tank, run_param_key, trip_param_key)"
echo ""
echo "  API endpoint available:"
echo "    GET /api/method/stp_app.api.layout.get_user_layout"
echo ""
echo "  Now run: bench start"
echo "  Then access Frappe Desk at: http://localhost:8000"
echo ""
