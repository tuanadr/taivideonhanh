#!/bin/bash

# Quick VNC Test Script
echo "🧪 Testing VNC Service..."

# Cleanup any existing test containers
docker stop firefox-vnc-test 2>/dev/null || true
docker rm firefox-vnc-test 2>/dev/null || true

# Build and run container for testing
echo "🏗️ Building with simple fix Dockerfile (no GPG issues)..."
docker build -f Dockerfile.simple-fix -t firefox-vnc-test . --progress=plain

if [ $? -ne 0 ]; then
    echo "❌ Simple build failed, trying VNC fix Dockerfile..."
    docker build -f Dockerfile.vnc-fix -t firefox-vnc-test . --progress=plain

    if [ $? -ne 0 ]; then
        echo "❌ VNC fix build failed, trying regular Dockerfile..."
        docker build -t firefox-vnc-test . --progress=plain
    fi
fi

echo "🚀 Starting test container..."
docker run -d --name firefox-vnc-test \
    -p 3003:3000 \
    -p 6083:6080 \
    -e VNC_PASSWORD=firefox123 \
    firefox-vnc-test

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Test API
echo "🔍 Testing API..."
if curl -f http://localhost:3003/health > /dev/null 2>&1; then
    echo "✅ API is working"
    curl -s http://localhost:3003/health | jq . 2>/dev/null || curl -s http://localhost:3003/health
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
        echo "🔍 Testing websockify directly..."
        curl -I http://localhost:6083 2>/dev/null || echo "No HTTP response"
    fi
else
    echo "❌ VNC port not accessible"
fi

# Show container logs
echo "📋 Container logs (last 30 lines):"
docker logs firefox-vnc-test | tail -30

# Show running processes
echo "🔍 Running processes in container:"
docker exec firefox-vnc-test ps aux | grep -E "(websockify|x11vnc|Xvfb|node)" || echo "No matching processes found"

# Check supervisord status
echo "📊 Supervisord status:"
docker exec firefox-vnc-test supervisorctl status || echo "Supervisorctl not available"

echo ""
echo "🌐 Test URLs:"
echo "API: http://localhost:3003"
echo "VNC: http://localhost:6083"
echo ""
echo "🧹 To cleanup: docker stop firefox-vnc-test && docker rm firefox-vnc-test"
echo "🔄 To keep running: Container will stay up for manual testing"
