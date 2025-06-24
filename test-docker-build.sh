#!/bin/bash

# Test Docker build script for EasyPanel deployment
# Kiểm tra build và dependencies trước khi deploy

set -e

echo "🔧 Testing Docker build for EasyPanel deployment..."

# Build image
echo "📦 Building Docker image..."
docker build -t taivideonhanh-test .

# Test if image runs
echo "🚀 Testing container startup..."
docker run -d --name taivideonhanh-test-container \
  -p 8080:80 \
  -e NODE_ENV=production \
  -e DB_HOST=localhost \
  -e DB_USER=postgres \
  -e DB_PASSWORD=test \
  -e DB_NAME=postgres \
  -e REDIS_HOST=localhost \
  -e REDIS_PORT=6379 \
  -e JWT_ACCESS_SECRET=test_secret_minimum_32_characters_long \
  -e JWT_REFRESH_SECRET=test_refresh_secret_minimum_32_characters_long \
  -e PORT=5000 \
  taivideonhanh-test

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Check if container is running
if docker ps | grep -q taivideonhanh-test-container; then
  echo "✅ Container is running"
  
  # Test health endpoint
  echo "🏥 Testing health endpoint..."
  if curl -f http://localhost:8080/api/health; then
    echo "✅ Health endpoint is working"
  else
    echo "❌ Health endpoint failed"
    docker logs taivideonhanh-test-container
  fi
else
  echo "❌ Container failed to start"
  docker logs taivideonhanh-test-container
fi

# Cleanup
echo "🧹 Cleaning up..."
docker stop taivideonhanh-test-container || true
docker rm taivideonhanh-test-container || true
docker rmi taivideonhanh-test || true

echo "✅ Test completed"
