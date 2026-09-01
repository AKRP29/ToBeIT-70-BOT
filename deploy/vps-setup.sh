#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this setup script as root (for example: sudo bash deploy/vps-setup.sh)." >&2
  exit 1
fi

APP_USER="tobeit70"
APP_DIR="/opt/tobeit-70-bot"
SERVICE="tobeit-70-bot.service"
SUDOERS_FILE="/etc/sudoers.d/tobeit70-tobeit-70-bot"

if ! id "$APP_USER" >/dev/null 2>&1; then
  /usr/sbin/useradd --create-home --shell /bin/bash "$APP_USER"
fi

/usr/bin/install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR"

# node-canvas can require these native libraries during installation/runtime.
/usr/bin/apt-get update
/usr/bin/apt-get install -y curl ca-certificates build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

if [ ! -x "/home/$APP_USER/.bun/bin/bun" ]; then
  /usr/bin/sudo -u "$APP_USER" -H /usr/bin/bash -c 'curl -fsSL https://bun.sh/install | bash'
fi

if [ ! -f "$APP_DIR/.env" ]; then
  /usr/bin/install -o "$APP_USER" -g "$APP_USER" -m 0600 /dev/null "$APP_DIR/.env"
  echo "Created $APP_DIR/.env. Populate it before starting the service."
fi

if [ ! -f "deploy/$SERVICE" ]; then
  echo "Run this script from the checked-out repository root so deploy/$SERVICE exists." >&2
  exit 1
fi

/usr/bin/install -o root -g root -m 0644 "deploy/$SERVICE" "/etc/systemd/system/$SERVICE"

SYSTEMCTL_PATH="$(command -v systemctl)"
if [ "$SYSTEMCTL_PATH" != "/usr/bin/systemctl" ]; then
  echo "Expected /usr/bin/systemctl on Ubuntu, found $SYSTEMCTL_PATH; update the workflow and sudoers rule." >&2
  exit 1
fi

cat > "$SUDOERS_FILE" <<'SUDOERS'
tobeit70 ALL=(root) NOPASSWD: /usr/bin/systemctl restart tobeit-70-bot.service, /usr/bin/systemctl status --no-pager tobeit-70-bot.service
SUDOERS
/bin/chmod 0440 "$SUDOERS_FILE"
/usr/sbin/visudo -cf "$SUDOERS_FILE"

/usr/bin/systemctl daemon-reload
/usr/bin/systemctl enable "$SERVICE"

echo "Setup complete. Add the deployment public key and populate $APP_DIR/.env, then perform the first deployment."
