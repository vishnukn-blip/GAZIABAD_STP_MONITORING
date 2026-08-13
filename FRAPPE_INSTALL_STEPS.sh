# STP Monitoring — Frappe Full Installation Guide
# Run these commands INSIDE your WSL Ubuntu terminal (open: wsl or Ubuntu app)
# ─────────────────────────────────────────────────────────────────────────────

# ════════════════════════════════════════════════════════
# PHASE 1: Start Services & Configure MariaDB
# ════════════════════════════════════════════════════════

# Open WSL terminal and run:
sudo service mariadb start
sudo service redis-server start

# Check they are running:
sudo service mariadb status
sudo service redis-server status

# Configure MariaDB charset for Frappe (required):
sudo nano /etc/mysql/mariadb.conf.d/frappe.cnf
# Paste this content, save (Ctrl+X, Y, Enter):
#   [mysqld]
#   character-set-client-handshake = FALSE
#   character-set-server = utf8mb4
#   collation-server = utf8mb4_unicode_ci
#   [mysql]
#   default-character-set = utf8mb4

# Restart MariaDB after config:
sudo service mariadb restart

# Set MariaDB root password (use "admin" as password at prompt):
sudo mysql_secure_installation

# ════════════════════════════════════════════════════════
# PHASE 2: Install Bench & Initialize Frappe
# ════════════════════════════════════════════════════════

# Add bench to PATH (already installed):
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Verify bench is found:
bench --version

# Install wkhtmltopdf (required by Frappe for PDF):
sudo apt-get install -y xvfb wkhtmltopdf libxrender1

# Initialize bench with Frappe version 15 (stable LTS):
# ⚠️  This downloads ~500MB and takes 10-20 minutes
cd ~
bench init frappe-bench --frappe-branch version-15 --python python3

# Go into bench folder:
cd ~/frappe-bench

# ════════════════════════════════════════════════════════
# PHASE 3: Create Site
# ════════════════════════════════════════════════════════

# Create new Frappe site (use your MariaDB root password when asked):
bench new-site stp.localhost \
  --mariadb-root-password admin \
  --admin-password admin123 \
  --db-name stp_monitoring

# Set as default site:
bench use stp.localhost

# ════════════════════════════════════════════════════════
# PHASE 4: Create & Install Custom STP App
# ════════════════════════════════════════════════════════

# Create new custom Frappe app:
bench new-app stp_app
# When prompted:
#   App Title:       STP Monitoring App
#   App Description: STP Monitoring DocTypes for SCADA
#   App Publisher:   Nimble Vision
#   App Email:       admin@nimblevision.io
#   App License:     MIT

# Install the app on the site:
bench --site stp.localhost install-app stp_app

# ════════════════════════════════════════════════════════
# PHASE 5: Copy DocTypes & API files from Windows
# ════════════════════════════════════════════════════════

# Copy the create_doctypes.sh script from Windows into WSL and run it:
cp /mnt/c/Users/ASUS/Desktop/STP-GAZ/create_doctypes.sh ~/frappe-bench/
bash ~/frappe-bench/create_doctypes.sh

# ════════════════════════════════════════════════════════
# PHASE 6: Enable CORS & developer mode
# ════════════════════════════════════════════════════════

# Enable developer mode (needed for API and hot reload):
bench --site stp.localhost set-config developer_mode 1

# Allow CORS from React frontend:
bench --site stp.localhost set-config allow_cors "http://localhost:5174"

# ════════════════════════════════════════════════════════
# PHASE 7: Start Frappe
# ════════════════════════════════════════════════════════

# Start the Frappe development server:
bench start

# Frappe will be available at: http://localhost:8000
# Login: Administrator / admin123

# ════════════════════════════════════════════════════════
# QUICK REFERENCE: After First Setup
# ════════════════════════════════════════════════════════
# Every time you start a new WSL session:
#   1. sudo service mariadb start
#   2. sudo service redis-server start
#   3. cd ~/frappe-bench && bench start

# Frappe Desk URL:  http://localhost:8000
# API Base URL:     http://localhost:8000/api/method/
# Admin login:      Administrator / admin123
