# Docker Bake configuration for optimized builds
# This file enables advanced BuildKit features for faster builds

variable "REGISTRY" {
  default = "taivideonhanh"
}

variable "TAG" {
  default = "latest"
}

# Build groups for parallel execution
group "default" {
  targets = ["frontend", "backend"]
}

group "production" {
  targets = ["frontend-prod", "backend-prod"]
}

# Frontend target
target "frontend" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  target = "runner"
  tags = ["${REGISTRY}/frontend:${TAG}"]
  
  # Build optimizations
  cache-from = [
    "type=local,src=.docker-cache/frontend"
  ]
  cache-to = [
    "type=local,dest=.docker-cache/frontend,mode=max"
  ]
  
  # Build arguments
  args = {
    NODE_ENV = "production"
    NEXT_TELEMETRY_DISABLED = "1"
  }
  
  # Platform support
  platforms = ["linux/amd64"]
  
  # Output configuration
  output = ["type=docker"]
}

# Backend target
target "backend" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = "runner"
  tags = ["${REGISTRY}/backend:${TAG}"]
  
  # Build optimizations
  cache-from = [
    "type=local,src=.docker-cache/backend"
  ]
  cache-to = [
    "type=local,dest=.docker-cache/backend,mode=max"
  ]
  
  # Build arguments
  args = {
    NODE_ENV = "production"
  }
  
  # Platform support
  platforms = ["linux/amd64"]
  
  # Output configuration
  output = ["type=docker"]
}

# Production frontend target
target "frontend-prod" {
  inherits = ["frontend"]
  tags = ["${REGISTRY}/frontend:prod", "${REGISTRY}/frontend:${TAG}"]
  
  # Production-specific optimizations
  args = {
    NODE_ENV = "production"
    NEXT_TELEMETRY_DISABLED = "1"
    NEXT_OPTIMIZE = "true"
  }
  
  # Multi-platform for production
  platforms = ["linux/amd64", "linux/arm64"]
}

# Production backend target
target "backend-prod" {
  inherits = ["backend"]
  tags = ["${REGISTRY}/backend:prod", "${REGISTRY}/backend:${TAG}"]
  
  # Production-specific optimizations
  args = {
    NODE_ENV = "production"
    OPTIMIZE_BUILD = "true"
  }
  
  # Multi-platform for production
  platforms = ["linux/amd64", "linux/arm64"]
}

# Development targets with faster builds
target "frontend-dev" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  target = "deps"
  tags = ["${REGISTRY}/frontend:dev"]
  
  # Development optimizations
  cache-from = [
    "type=local,src=.docker-cache/frontend-dev"
  ]
  cache-to = [
    "type=local,dest=.docker-cache/frontend-dev,mode=max"
  ]
  
  args = {
    NODE_ENV = "development"
  }
}

target "backend-dev" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = "deps"
  tags = ["${REGISTRY}/backend:dev"]
  
  # Development optimizations
  cache-from = [
    "type=local,src=.docker-cache/backend-dev"
  ]
  cache-to = [
    "type=local,dest=.docker-cache/backend-dev,mode=max"
  ]
  
  args = {
    NODE_ENV = "development"
  }
}

# Test targets
target "frontend-test" {
  context = "./frontend"
  dockerfile = "Dockerfile"
  target = "builder"
  tags = ["${REGISTRY}/frontend:test"]
  
  args = {
    NODE_ENV = "test"
  }
}

target "backend-test" {
  context = "./backend"
  dockerfile = "Dockerfile"
  target = "builder"
  tags = ["${REGISTRY}/backend:test"]
  
  args = {
    NODE_ENV = "test"
  }
}

# Cache management target
target "cache-warmup" {
  context = "."
  dockerfile-inline = <<EOF
FROM alpine:latest
RUN echo "Cache warmup completed"
EOF
  
  cache-from = [
    "type=local,src=.docker-cache/frontend",
    "type=local,src=.docker-cache/backend"
  ]
  
  output = ["type=cacheonly"]
}
