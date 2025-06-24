#!/bin/bash

# YouTube Cookie Authentication Setup Script
# This script helps set up cookie authentication for YouTube downloads in production

set -e

echo "🍪 YouTube Cookie Authentication Setup"
echo "======================================"

# Configuration
COOKIES_DIR="/tmp/cookies"
COOKIES_FILE="$COOKIES_DIR/youtube-cookies.txt"
CHROME_PROFILE_DIR="/opt/chrome-profile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running in Docker
check_environment() {
    log_info "Checking environment..."
    
    if [ -f /.dockerenv ]; then
        log_info "Running in Docker container"
        DOCKER_ENV=true
    else
        log_info "Running on host system"
        DOCKER_ENV=false
    fi
    
    # Check if yt-dlp is available
    if ! command -v yt-dlp &> /dev/null; then
        log_error "yt-dlp is not installed"
        exit 1
    fi
    
    log_success "Environment check passed"
}

# Create necessary directories
setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$COOKIES_DIR"
    mkdir -p "$CHROME_PROFILE_DIR"
    
    # Set proper permissions
    chmod 755 "$COOKIES_DIR"
    chmod 755 "$CHROME_PROFILE_DIR"
    
    log_success "Directories created"
}

# Test browser cookie extraction
test_browser_cookies() {
    local browser=$1
    log_info "Testing $browser cookie extraction..."
    
    # Test with a simple YouTube video
    local test_url="https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    if timeout 10 yt-dlp --cookies-from-browser "$browser" --simulate --quiet "$test_url" 2>/dev/null; then
        log_success "$browser cookies are accessible"
        return 0
    else
        log_warning "$browser cookies are not accessible"
        return 1
    fi
}

# Find available browsers
find_browsers() {
    log_info "Searching for available browsers..."
    
    local browsers=("chrome" "firefox" "safari" "edge")
    local available_browsers=()
    
    for browser in "${browsers[@]}"; do
        if test_browser_cookies "$browser"; then
            available_browsers+=("$browser")
        fi
    done
    
    if [ ${#available_browsers[@]} -eq 0 ]; then
        log_warning "No browsers with accessible cookies found"
        return 1
    else
        log_success "Available browsers: ${available_browsers[*]}"
        echo "${available_browsers[0]}" # Return first available browser
        return 0
    fi
}

# Export cookies from browser to file
export_cookies() {
    local browser=$1
    log_info "Exporting cookies from $browser to file..."
    
    # Use yt-dlp to extract and save cookies
    if yt-dlp --cookies-from-browser "$browser" --cookies "$COOKIES_FILE" --simulate --quiet "https://www.youtube.com/watch?v=jNQXAC9IVRw" 2>/dev/null; then
        log_success "Cookies exported to $COOKIES_FILE"
        
        # Verify cookie file format
        if head -1 "$COOKIES_FILE" | grep -q "# HTTP Cookie File\|# Netscape HTTP Cookie File"; then
            log_success "Cookie file format is valid"
            return 0
        else
            log_warning "Cookie file format may be invalid"
            return 1
        fi
    else
        log_error "Failed to export cookies from $browser"
        return 1
    fi
}

# Test cookie file
test_cookie_file() {
    log_info "Testing cookie file..."
    
    if [ ! -f "$COOKIES_FILE" ]; then
        log_error "Cookie file not found: $COOKIES_FILE"
        return 1
    fi
    
    # Test with a YouTube video
    local test_url="https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    if timeout 15 yt-dlp --cookies "$COOKIES_FILE" --simulate --quiet "$test_url" 2>/dev/null; then
        log_success "Cookie file is working"
        return 0
    else
        log_error "Cookie file test failed"
        return 1
    fi
}

# Create environment file
create_env_file() {
    log_info "Creating environment configuration..."
    
    local env_file=".env.cookies"
    
    cat > "$env_file" << EOF
# YouTube Cookie Authentication Configuration
# Generated on $(date)

# Cookie file path
YOUTUBE_COOKIES_PATH=$COOKIES_FILE

# Chrome profile directory (if using browser cookies)
CHROME_USER_DATA_DIR=$CHROME_PROFILE_DIR

# Enable cookie authentication
ENABLE_COOKIE_AUTH=true

# Don't skip cookie authentication in production
SKIP_COOKIE_AUTH=false
EOF

    log_success "Environment file created: $env_file"
    log_info "Add these variables to your production environment"
}

# Generate Docker setup instructions
generate_docker_instructions() {
    log_info "Generating Docker setup instructions..."
    
    cat << 'EOF'

🐳 DOCKER SETUP INSTRUCTIONS:

1. Add to your Dockerfile:
   ```dockerfile
   # Create directories for cookies
   RUN mkdir -p /tmp/cookies /opt/chrome-profile
   RUN chmod 755 /tmp/cookies /opt/chrome-profile
   ```

2. Add to docker-compose.yml:
   ```yaml
   services:
     app:
       volumes:
         - ./cookies:/tmp/cookies:ro
         - chrome-profile:/opt/chrome-profile
       environment:
         - YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt
         - ENABLE_COOKIE_AUTH=true
   
   volumes:
     chrome-profile:
   ```

3. Copy your cookie file to the host:
   ```bash
   cp /tmp/cookies/youtube-cookies.txt ./cookies/
   ```

EOF
}

# Main setup process
main() {
    echo
    log_info "Starting YouTube cookie authentication setup..."
    echo
    
    # Check environment
    check_environment
    echo
    
    # Setup directories
    setup_directories
    echo
    
    # Try to find and use browser cookies
    if available_browser=$(find_browsers); then
        echo
        log_info "Using browser: $available_browser"
        
        if export_cookies "$available_browser"; then
            echo
            if test_cookie_file; then
                log_success "Cookie authentication setup completed successfully!"
            else
                log_warning "Cookie file created but test failed"
            fi
        else
            log_error "Failed to export cookies"
        fi
    else
        echo
        log_warning "No browser cookies available"
        log_info "You'll need to manually create a cookie file"
        
        cat << 'EOF'

📋 MANUAL COOKIE SETUP:

1. Install a browser extension to export cookies:
   - Chrome: "Get cookies.txt LOCALLY"
   - Firefox: "cookies.txt"

2. Navigate to YouTube and login

3. Export cookies to a text file

4. Copy the file to: /tmp/cookies/youtube-cookies.txt

5. Ensure the file starts with: # HTTP Cookie File

EOF
    fi
    
    echo
    create_env_file
    echo
    
    if [ "$DOCKER_ENV" = true ]; then
        generate_docker_instructions
    fi
    
    echo
    log_info "Setup completed!"
    log_info "Remember to:"
    log_info "  - Keep your cookie file secure and private"
    log_info "  - Update cookies periodically (they expire)"
    log_info "  - Test the setup with your application"
    echo
}

# Handle command line arguments
case "${1:-}" in
    "test")
        log_info "Testing current cookie setup..."
        if test_cookie_file; then
            log_success "Cookie authentication is working!"
            exit 0
        else
            log_error "Cookie authentication test failed"
            exit 1
        fi
        ;;
    "browsers")
        log_info "Checking available browsers..."
        find_browsers
        ;;
    "export")
        if [ -z "$2" ]; then
            log_error "Usage: $0 export <browser>"
            exit 1
        fi
        export_cookies "$2"
        ;;
    "help"|"-h"|"--help")
        cat << EOF
YouTube Cookie Authentication Setup Script

Usage: $0 [command]

Commands:
  (no command)  Run full setup process
  test          Test current cookie configuration
  browsers      List available browsers
  export <browser>  Export cookies from specific browser
  help          Show this help message

Examples:
  $0                    # Run full setup
  $0 test              # Test current setup
  $0 browsers          # Check available browsers
  $0 export chrome     # Export cookies from Chrome

EOF
        exit 0
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown command: $1"
        log_info "Use '$0 help' for usage information"
        exit 1
        ;;
esac
