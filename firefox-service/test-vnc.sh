#!/bin/bash

# Quick VNC Test Script
echo "🧪 Testing VNC Service..."

# Build and run container for testing
echo "🏗️ Building latest image..."
docker build -t firefox-vnc-test . -q

echo "🚀 Starting test container..."
docker run -d --name firefox-vnc-test \
    -p 3003:3000 \
    -p 6083:6080 \
    firefox-vnc-test

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 20

# Test API
echo "🔍 Testing API..."
if curl -f http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ API is working"
else
    echo "❌ API failed"
fi

# Test VNC port
echo "🖥️ Testing VNC port..."
if nc -z localhost 6083; then
    echo "✅ VNC port is accessible"
    
    # Try to get VNC page
    if curl -f http://localhost:6083 > /dev/null 2>&1; then
        echo "✅ VNC web interface is working"
    else
        echo "⚠️ VNC port open but web interface not responding"
    fi
else
    echo "❌ VNC port not accessible"
fi

# Show container logs
echo "📋 Container logs:"
docker logs firefox-vnc-test | tail -20

# Show running processes
echo "🔍 Running processes in container:"
docker exec firefox-vnc-test ps aux | grep -E "(websockify|x11vnc|Xvfb|node)"

echo ""
echo "🌐 Test URLs:"
echo "API: http://localhost:3003"
echo "VNC: http://localhost:6083"
echo ""
echo "🧹 To cleanup: docker stop firefox-vnc-test && docker rm firefox-vnc-test"
