#!/bin/bash
# STP Monitoring - Frappe Installation Script
# Run inside WSL Ubuntu terminal as: bash frappe_setup.sh
# This installs bench, creates stp-frappe site, and sets up all DocTypes

set -e  # Exit on any error

echo ""
echo "=============================================="
echo "  STP MONITORING - FRAPPE SETUP SCRIPT"
echo "  Ubuntu $(lsb_release -rs) | $(date)"
echo "=============================================="
echo ""

# ── STEP 1: System deps ────────────────────────────────────────────────────
echo "[1/8] Updating system and installing dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
    python3-dev python3-pip python3-venv \
    libmysqlclient-dev libssl-dev libffi-dev \
    wkhtmltopdf xvfb libxrender1 libxext6 \
    fonts-liberation libjpeg-turbo8-dev \
    curl git build-essential

# ── STEP 2: Install bench CLI ──────────────────────────────────────────────
echo "[2/8] Installing frappe-bench CLI..."
pip3 install frappe-bench --quiet --break-system-packages

# Ensure bench is in PATH
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# ── STEP 3: Start MariaDB & Redis ─────────────────────────────────────────
echo "[3/8] Starting MariaDB and Redis..."
sudo service mariadb start
sudo service redis-server start

# Wait for MariaDB to be ready
sleep 3
echo "MariaDB status:"
sudo service mariadb status | head -2

# ── STEP 4: Configure MariaDB for Frappe ──────────────────────────────────
echo "[4/8] Configuring MariaDB for Frappe..."
# Create MariaDB config for Frappe compatibility
sudo bash -c 'cat > /etc/mysql/mariadb.conf.d/frappe.cnf << EOF
[mysqld]
character-set-client-handshake = FALSE
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

[mysql]
default-character-set = utf8mb4
EOF'

sudo service mariadb restart
sleep 3

# Set root password if needed
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'admin'; FLUSH PRIVILEGES;" 2>/dev/null || \
sudo mysql -e "SET PASSWORD FOR 'root'@'localhost' = PASSWORD('admin'); FLUSH PRIVILEGES;" 2>/dev/null || \
echo "Root password may already be set."

# ── STEP 5: Init bench (frappe-bench) ─────────────────────────────────────
echo "[5/8] Initializing frappe bench at ~/frappe-bench ..."
cd ~

if [ -d "frappe-bench" ]; then
    echo "frappe-bench directory already exists, skipping init."
else
    bench init frappe-bench \
        --frappe-branch version-15 \
        --python python3 \
        --verbose
fi

cd ~/frappe-bench

# ── STEP 6: Create new site ────────────────────────────────────────────────
echo "[6/8] Creating Frappe site: stp.localhost ..."
bench new-site stp.localhost \
    --mariadb-root-password admin \
    --admin-password admin123 \
    --db-name stp_monitoring \
    --no-mariadb-socket 2>/dev/null || echo "Site may already exist."

# Set as default site
bench use stp.localhost

# ── STEP 7: Create custom STP app ─────────────────────────────────────────
echo "[7/8] Creating custom Frappe app: stp_app ..."
if [ ! -d "apps/stp_app" ]; then
    bench new-app stp_app \
        --no-setup-venv 2>/dev/null || true

    # Install the app on our site
    bench --site stp.localhost install-app stp_app
    echo "stp_app created and installed."
else
    echo "stp_app already exists."
fi

# ── STEP 8: Start bench in background ─────────────────────────────────────
echo "[8/8] Starting bench development server..."
echo ""
echo "=============================================="
echo "  FRAPPE SETUP COMPLETE!"
echo "=============================================="
echo ""
echo "  Frappe URL:    http://localhost:8000"
echo "  Admin Login:   Administrator / admin123"
echo "  Site:          stp.localhost"
echo "  App:           stp_app"
echo ""
echo "  Next: Run 'bash create_doctypes.sh' to build DocTypes"
echo ""
echo "Starting bench server (Ctrl+C to stop)..."
bench start
