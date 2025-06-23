# TaiVideoNhanh Docker Build Makefile
# Provides easy commands for optimized Docker builds

.PHONY: help build quick-build bake-build prod-build dev-build test clean setup

# Default target
.DEFAULT_GOAL := help

# Variables
COMPOSE_FILE ?= docker-compose.yml
COMPOSE_PROD_FILE ?= docker-compose.prod.yml
REGISTRY ?= taivideonhanh
TAG ?= latest

# Colors for output
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)TaiVideoNhanh Docker Build Commands$(NC)"
	@echo "===================================="
	@echo
	@echo "$(GREEN)Quick Build Commands:$(NC)"
	@echo "  make quick-build    - Fastest build with all optimizations"
	@echo "  make bake-build     - Use Docker Bake for maximum performance"
	@echo "  make build          - Standard optimized build"
	@echo
	@echo "$(GREEN)Environment-specific Builds:$(NC)"
	@echo "  make dev-build      - Development build (faster, with dev deps)"
	@echo "  make prod-build     - Production build (optimized, multi-platform)"
	@echo "  make test           - Run tests in containers"
	@echo
	@echo "$(GREEN)Maintenance Commands:$(NC)"
	@echo "  make clean          - Clean up Docker resources"
	@echo "  make setup          - Setup build environment"
	@echo "  make cache-warmup   - Warm up build cache"
	@echo
	@echo "$(GREEN)Usage Examples:$(NC)"
	@echo "  make quick-build              # Fastest build"
	@echo "  make bake-build TAG=v1.0      # Bake build with custom tag"
	@echo "  make prod-build REGISTRY=myregistry  # Production build"
	@echo
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Setup optimized build environment
	@echo "$(BLUE)Setting up build environment...$(NC)"
	@export DOCKER_BUILDKIT=1
	@export COMPOSE_DOCKER_CLI_BUILD=1
	@export COMPOSE_BAKE=true
	@mkdir -p .docker-cache/frontend .docker-cache/backend
	@echo "$(GREEN)✅ Build environment ready$(NC)"

quick-build: setup ## Fastest build with all optimizations (recommended)
	@echo "$(BLUE)Starting quick optimized build...$(NC)"
	@./scripts/quick-build.sh
	@echo "$(GREEN)✅ Quick build completed$(NC)"

bake-build: setup ## Use Docker Bake for maximum performance
	@echo "$(BLUE)Building with Docker Bake...$(NC)"
	@docker buildx bake --progress=plain
	@echo "$(GREEN)✅ Bake build completed$(NC)"

build: setup ## Standard optimized build
	@echo "$(BLUE)Building with standard optimization...$(NC)"
	@export DOCKER_BUILDKIT=1 && \
	 export COMPOSE_DOCKER_CLI_BUILD=1 && \
	 export COMPOSE_BAKE=true && \
	 docker-compose build --parallel
	@echo "$(GREEN)✅ Standard build completed$(NC)"

dev-build: setup ## Development build (faster, includes dev dependencies)
	@echo "$(BLUE)Building development images...$(NC)"
	@docker buildx bake frontend-dev backend-dev
	@echo "$(GREEN)✅ Development build completed$(NC)"

prod-build: setup ## Production build (optimized, multi-platform)
	@echo "$(BLUE)Building production images...$(NC)"
	@docker buildx bake production
	@echo "$(GREEN)✅ Production build completed$(NC)"

test: ## Run tests in containers
	@echo "$(BLUE)Running tests...$(NC)"
	@docker buildx bake frontend-test backend-test
	@docker run --rm $(REGISTRY)/frontend:test npm test
	@docker run --rm $(REGISTRY)/backend:test npm test
	@echo "$(GREEN)✅ Tests completed$(NC)"

cache-warmup: setup ## Warm up build cache for faster subsequent builds
	@echo "$(BLUE)Warming up build cache...$(NC)"
	@docker buildx bake cache-warmup
	@echo "$(GREEN)✅ Cache warmup completed$(NC)"

clean: ## Clean up Docker resources
	@echo "$(BLUE)Cleaning up Docker resources...$(NC)"
	@docker-compose down --remove-orphans 2>/dev/null || true
	@docker image prune -f
	@docker container prune -f
	@docker volume prune -f
	@echo "$(GREEN)✅ Cleanup completed$(NC)"

deep-clean: ## Deep clean including build cache
	@echo "$(BLUE)Performing deep clean...$(NC)"
	@$(MAKE) clean
	@docker buildx prune -f
	@rm -rf .docker-cache
	@echo "$(GREEN)✅ Deep clean completed$(NC)"

# Development workflow commands
up: build ## Build and start all services
	@echo "$(BLUE)Starting services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Services started$(NC)"

down: ## Stop all services
	@echo "$(BLUE)Stopping services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

logs: ## Show logs from all services
	@docker-compose logs -f

restart: down up ## Restart all services

# Production deployment commands
prod-up: prod-build ## Build and start production services
	@echo "$(BLUE)Starting production services...$(NC)"
	@docker-compose -f $(COMPOSE_PROD_FILE) up -d
	@echo "$(GREEN)✅ Production services started$(NC)"

prod-down: ## Stop production services
	@echo "$(BLUE)Stopping production services...$(NC)"
	@docker-compose -f $(COMPOSE_PROD_FILE) down
	@echo "$(GREEN)✅ Production services stopped$(NC)"

# Monitoring commands
stats: ## Show container resource usage
	@docker stats

images: ## Show built images and their sizes
	@echo "$(BLUE)Docker Images:$(NC)"
	@docker images | grep -E "(REPOSITORY|$(REGISTRY))" | head -20

# Build time benchmarking
benchmark: ## Benchmark different build methods
	@echo "$(BLUE)Benchmarking build methods...$(NC)"
	@echo "$(YELLOW)1. Standard build:$(NC)"
	@time $(MAKE) clean build
	@echo "$(YELLOW)2. Quick build:$(NC)"
	@time $(MAKE) clean quick-build
	@echo "$(YELLOW)3. Bake build:$(NC)"
	@time $(MAKE) clean bake-build
	@echo "$(GREEN)✅ Benchmark completed$(NC)"

# Health check
health: ## Check system health and build readiness
	@echo "$(BLUE)Checking system health...$(NC)"
	@docker --version
	@docker-compose --version
	@docker buildx version
	@echo "$(GREEN)✅ System health check completed$(NC)"
