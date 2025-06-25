#!/bin/bash

# Firefox Service Build Test Script
echo "🔥 Building Firefox Cookie Service..."

# Clean up any existing containers
echo "🧹 Cleaning up existing containers..."
docker stop firefox-cookie-service 2>/dev/null || true
docker rm firefox-cookie-service 2>/dev/null || true
docker stop firefox-cookie-service-test 2>/dev/null || true
docker rm firefox-cookie-service-test 2>/dev/null || true

# Build the Docker image
echo "🏗️ Building Docker image..."
docker build -t firefox-cookie-service . --progress=plain

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"

    # Test run the container
    echo "🚀 Testing container startup..."
    docker run -d --name firefox-cookie-service-test \
        -p 3001:3000 \
        -p 6081:6080 \
        -v $(pwd)/data:/app/cookies \
        firefox-cookie-service

    # Wait a bit for services to start
    echo "⏳ Waiting for services to start..."
    sleep 15

    # Check if services are running
    echo "🔍 Checking service health..."
    if curl -f http://localhost:3001/health; then
        echo "✅ Health check passed!"

        # Show health response
        echo "📊 Health response:"
        curl -s http://localhost:3001/health | jq . || curl -s http://localhost:3001/health

        # Test VNC access (just check if port is open)
        echo "🖥️ Checking VNC port..."
        if nc -z localhost 6081; then
            echo "✅ VNC port is accessible!"
        else
            echo "⚠️ VNC port not accessible (this is expected if noVNC has issues)"
        fi

    else
        echo "❌ Health check failed"
        echo "📋 Container logs:"
        docker logs firefox-cookie-service-test
    fi

    # Show final status
    echo "📋 Final container status:"
    docker ps | grep firefox-cookie-service-test || echo "Container not running"

    # Ask user if they want to keep the container running
    echo ""
    echo "🤔 Do you want to keep the test container running? (y/N)"
    read -t 10 -n 1 keep_running
    echo ""

    if [[ $keep_running =~ ^[Yy]$ ]]; then
        echo "✅ Container will keep running on:"
        echo "   - API: http://localhost:3001"
        echo "   - VNC: http://localhost:6081"
        echo "   - Container name: firefox-cookie-service-test"
        echo ""
        echo "To stop later: docker stop firefox-cookie-service-test"
    else
        # Cleanup test container
        echo "🧹 Cleaning up test container..."
        docker stop firefox-cookie-service-test
        docker rm firefox-cookie-service-test
    fi

else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "🎉 Firefox Cookie Service build and test completed!"
echo "📖 See README.md for usage instructions"
