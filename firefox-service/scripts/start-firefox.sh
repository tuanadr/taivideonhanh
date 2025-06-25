#!/bin/bash

# Start Firefox with proper configuration
export DISPLAY=:99

# Wait for X server to be ready
while ! xdpyinfo -display :99 >/dev/null 2>&1; do
    echo "Waiting for X server..."
    sleep 1
done

echo "Starting Firefox..."

# Start Firefox with automation-friendly settings
firefox \
    --display=:99 \
    --no-sandbox \
    --disable-dev-shm-usage \
    --disable-gpu \
    --disable-extensions \
    --disable-plugins \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=TranslateUI \
    --disable-ipc-flooding-protection \
    --profile /app/firefox-profile/default \
    --new-instance \
    --remote-debugging-port=9222 \
    --window-size=1920,1080 \
    --start-maximized \
    "$@"
