#!/bin/bash

# Fix VNC Service Script
echo "🔧 Fixing VNC service..."

# Check if websockify exists
if command -v websockify &> /dev/null; then
    echo "✅ websockify found: $(which websockify)"
else
    echo "❌ websockify not found, installing..."
    apt-get update && apt-get install -y python3-websockify
fi

# Check noVNC directory
if [ -d "/usr/share/novnc" ]; then
    echo "✅ noVNC directory found"
    ls -la /usr/share/novnc/
else
    echo "❌ noVNC directory not found, installing..."
    apt-get update && apt-get install -y novnc
fi

# Create symlink if needed
if [ ! -d "/app/novnc" ]; then
    echo "🔗 Creating noVNC symlink..."
    mkdir -p /app/novnc
    if [ -d "/usr/share/novnc" ]; then
        cp -r /usr/share/novnc/* /app/novnc/ 2>/dev/null || true
    fi
fi

# Test websockify command
echo "🧪 Testing websockify command..."
timeout 5 websockify --web=/usr/share/novnc 6080 localhost:5900 &
WEBSOCKIFY_PID=$!
sleep 2

if ps -p $WEBSOCKIFY_PID > /dev/null; then
    echo "✅ websockify test successful"
    kill $WEBSOCKIFY_PID 2>/dev/null || true
else
    echo "❌ websockify test failed"
    
    # Try alternative command
    echo "🔄 Trying alternative websockify command..."
    timeout 5 python3 -m websockify --web=/usr/share/novnc 6080 localhost:5900 &
    ALT_PID=$!
    sleep 2
    
    if ps -p $ALT_PID > /dev/null; then
        echo "✅ Alternative websockify works"
        kill $ALT_PID 2>/dev/null || true
        
        # Update supervisord.conf
        echo "📝 Updating supervisord.conf..."
        sed -i 's|command=/usr/bin/websockify|command=python3 -m websockify|g' /etc/supervisor/conf.d/supervisord.conf
    else
        echo "❌ Both websockify commands failed"
        kill $ALT_PID 2>/dev/null || true
    fi
fi

# Check VNC server
echo "🖥️ Checking VNC server..."
if pgrep -f "x11vnc" > /dev/null; then
    echo "✅ x11vnc is running"
else
    echo "🚀 Starting x11vnc..."
    x11vnc -display :99 -forever -usepw -create -shared -rfbport 5900 &
fi

# Check Xvfb
echo "📺 Checking Xvfb..."
if pgrep -f "Xvfb" > /dev/null; then
    echo "✅ Xvfb is running"
else
    echo "🚀 Starting Xvfb..."
    Xvfb :99 -screen 0 1920x1080x24 &
fi

echo "🎉 VNC fix script completed!"
echo "📋 Next steps:"
echo "1. Restart the container"
echo "2. Check logs: docker logs <container-name>"
echo "3. Test VNC: http://localhost:6080"
