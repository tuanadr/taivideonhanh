#!/bin/bash

# Setup VNC server
export DISPLAY=:99

echo "Setting up VNC server..."

# Create VNC password file
mkdir -p ~/.vnc
echo "firefox123" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Start X virtual framebuffer
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# Wait for X server
sleep 3

# Start x11vnc
x11vnc -display :99 -nopw -listen localhost -xkb -ncache 10 -ncache_cr -forever &
X11VNC_PID=$!

# Start noVNC
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &
NOVNC_PID=$!

echo "VNC setup complete"
echo "XVFB PID: $XVFB_PID"
echo "X11VNC PID: $X11VNC_PID"
echo "noVNC PID: $NOVNC_PID"

# Keep script running
wait
