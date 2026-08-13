"""
Native Frappe DocType Creator
Run via: bench --site stp.localhost execute stp_app.create_doctypes.setup
"""
import frappe

def setup():
    frappe.set_user("Administrator")
    print("\nCreating STP DocTypes natively inside Frappe...")

    # 1. STP Device
    if not frappe.db.exists("DocType", "STP Device"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "STP Device",
            "module": "Core",
            "custom": 0,
            "is_submittable": 0,
            "track_changes": 1,
            "fields": [
                {"fieldname": "device_name", "fieldtype": "Data", "label": "Device Name", "reqd": 1, "in_list_view": 1},
                {"fieldname": "device_id", "fieldtype": "Data", "label": "Device ID", "reqd": 1, "in_list_view": 1},
                {"fieldname": "api_key", "fieldtype": "Data", "label": "API Key", "reqd": 1},
                {"fieldname": "api_token", "fieldtype": "Password", "label": "API Token", "reqd": 1},
                {"fieldname": "assigned_user", "fieldtype": "Link", "label": "Assigned User", "options": "User", "reqd": 1, "in_list_view": 1},
                {"fieldname": "is_active", "fieldtype": "Check", "label": "Is Active", "default": "1"},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "All", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("  ✓ Created STP Device DocType & MariaDB table")

    # 2. STP Tank
    if not frappe.db.exists("DocType", "STP Tank"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "STP Tank",
            "module": "Core",
            "custom": 0,
            "is_submittable": 0,
            "track_changes": 1,
            "fields": [
                {"fieldname": "tank_name", "fieldtype": "Data", "label": "Tank Name", "reqd": 1, "in_list_view": 1},
                {"fieldname": "device", "fieldtype": "Link", "label": "Device", "options": "STP Device", "reqd": 1, "in_list_view": 1},
                {"fieldname": "variant", "fieldtype": "Select", "label": "Tank Variant", "options": "main\nunderground", "default": "main", "reqd": 1},
                {"fieldname": "capacity_liters", "fieldtype": "Int", "label": "Capacity (Liters)", "default": "10000", "reqd": 1},
                {"fieldname": "display_order", "fieldtype": "Int", "label": "Display Order", "default": "1", "reqd": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "All", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("  ✓ Created STP Tank DocType & MariaDB table")

    # 3. STP Motor
    if not frappe.db.exists("DocType", "STP Motor"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "STP Motor",
            "module": "Core",
            "custom": 0,
            "is_submittable": 0,
            "track_changes": 1,
            "fields": [
                {"fieldname": "motor_name", "fieldtype": "Data", "label": "Motor Name", "reqd": 1, "in_list_view": 1},
                {"fieldname": "tank", "fieldtype": "Link", "label": "Tank", "options": "STP Tank", "reqd": 1, "in_list_view": 1},
                {"fieldname": "run_param_key", "fieldtype": "Select", "label": "Run Status Parameter", "options": "current_1\ncurrent_2\ncurrent_3\ncurrent_4\nlow_pressure", "reqd": 1, "in_list_view": 1},
                {"fieldname": "trip_param_key", "fieldtype": "Select", "label": "Trip Status Parameter", "options": "voltage_4\nvoltage_5\nvoltage_6\nvoltage_7\nvoltage_8", "reqd": 1, "in_list_view": 1},
                {"fieldname": "display_order", "fieldtype": "Int", "label": "Display Order", "default": "1", "reqd": 1},
            ],
            "permissions": [
                {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
                {"role": "All", "read": 1}
            ]
        })
        doc.insert(ignore_permissions=True)
        print("  ✓ Created STP Motor DocType & MariaDB table")

    frappe.db.commit()
    print("  ✅ All STP DocTypes committed to MariaDB!\n")
