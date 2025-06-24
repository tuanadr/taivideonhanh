#!/bin/bash

# Production YouTube Cookie Setup Script
# Sets up cookie authentication for YouTube downloads in production environment

set -e

echo "🍪 Production YouTube Cookie Setup"
echo "=================================="

# Configuration
COOKIES_DIR="/tmp/cookies"
COOKIES_FILE="$COOKIES_DIR/youtube-cookies.txt"
BACKUP_DIR="/tmp/cookies-backup"

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

# Check if running in production environment
check_environment() {
    log_info "Checking production environment..."
    
    if [ -f /.dockerenv ]; then
        log_info "Running in Docker container (production)"
        PRODUCTION_ENV=true
    else
        log_warning "Not running in Docker - this may be development environment"
        PRODUCTION_ENV=false
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
    mkdir -p "$BACKUP_DIR"
    
    # Set proper permissions
    chmod 755 "$COOKIES_DIR"
    chmod 755 "$BACKUP_DIR"
    
    log_success "Directories created"
}

# Create sample cookie file for manual setup
create_sample_cookie_file() {
    log_info "Creating sample cookie file..."
    
    cat > "$COOKIES_FILE" << 'EOF'
# Netscape HTTP Cookie File
# This is a generated file! Do not edit.

# To get real YouTube cookies:
# 1. Install browser extension "Get cookies.txt LOCALLY" 
# 2. Go to youtube.com and login
# 3. Click the extension and export cookies
# 4. Replace this file with the exported cookies

.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	sample_visitor_info
.youtube.com	TRUE	/	TRUE	1735689600	YSC	sample_ysc_value
.youtube.com	TRUE	/	FALSE	1735689600	PREF	sample_pref_value
EOF

    chmod 644 "$COOKIES_FILE"
    log_success "Sample cookie file created at $COOKIES_FILE"
}

# Test cookie file with yt-dlp
test_cookie_file() {
    log_info "Testing cookie file with yt-dlp..."
    
    if [ ! -f "$COOKIES_FILE" ]; then
        log_error "Cookie file not found: $COOKIES_FILE"
        return 1
    fi
    
    # Test with a simple YouTube video
    local test_url="https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    log_info "Testing with URL: $test_url"
    
    if timeout 30 yt-dlp --cookies "$COOKIES_FILE" --simulate --quiet "$test_url" 2>/dev/null; then
        log_success "Cookie file test passed!"
        return 0
    else
        log_warning "Cookie file test failed - cookies may be invalid or expired"
        return 1
    fi
}

# Test without cookies (fallback method)
test_without_cookies() {
    log_info "Testing YouTube extraction without cookies..."
    
    local test_url="https://www.youtube.com/watch?v=jNQXAC9IVRw"
    
    if timeout 30 yt-dlp --simulate --quiet "$test_url" 2>/dev/null; then
        log_success "YouTube extraction works without cookies"
        return 0
    else
        log_error "YouTube extraction fails even without cookies"
        return 1
    fi
}

# Generate environment configuration
create_env_config() {
    log_info "Creating environment configuration..."
    
    local env_file=".env.youtube-cookies"
    
    cat > "$env_file" << EOF
# YouTube Cookie Authentication Configuration
# Generated on $(date)

# Cookie file path
YOUTUBE_COOKIES_PATH=$COOKIES_FILE

# Enable cookie authentication
ENABLE_COOKIE_AUTH=true

# Don't skip cookie authentication in production
SKIP_COOKIE_AUTH=false

# YouTube extraction settings
YOUTUBE_MAX_RETRIES=3
YOUTUBE_RETRY_DELAY=2000
YOUTUBE_MIN_REQUEST_INTERVAL=2000
YOUTUBE_USER_AGENT_ROTATION=true
EOF

    log_success "Environment configuration created: $env_file"
    log_info "Add these variables to your production environment"
}

# Generate manual setup instructions
generate_instructions() {
    log_info "Generating setup instructions..."
    
    cat << 'EOF'

📋 MANUAL COOKIE SETUP INSTRUCTIONS:

🔧 Method 1: Browser Extension (Recommended)
1. Install browser extension "Get cookies.txt LOCALLY"
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

2. Navigate to YouTube and login to your account

3. Click the extension icon and export cookies

4. Copy the exported cookies to replace the sample file:
   cp downloaded-cookies.txt /tmp/cookies/youtube-cookies.txt

🔧 Method 2: Manual Cookie Extraction
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Find YouTube cookies
4. Export in Netscape format
5. Save to /tmp/cookies/youtube-cookies.txt

🔧 Method 3: yt-dlp Browser Integration
1. Ensure browser is installed in container
2. Login to YouTube in browser
3. Use --cookies-from-browser chrome option

⚠️ IMPORTANT NOTES:
- Cookies expire periodically and need to be updated
- Keep cookies secure and private
- Test after setup to ensure they work
- Monitor for authentication failures

🧪 TESTING:
Run this command to test your setup:
yt-dlp --cookies /tmp/cookies/youtube-cookies.txt --simulate "https://www.youtube.com/watch?v=jNQXAC9IVRw"

EOF
}

# Backup existing cookies
backup_cookies() {
    if [ -f "$COOKIES_FILE" ]; then
        log_info "Backing up existing cookies..."
        cp "$COOKIES_FILE" "$BACKUP_DIR/youtube-cookies-$(date +%Y%m%d-%H%M%S).txt"
        log_success "Cookies backed up"
    fi
}

# Main setup process
main() {
    echo
    log_info "Starting production YouTube cookie setup..."
    echo
    
    # Check environment
    check_environment
    echo
    
    # Setup directories
    setup_directories
    echo
    
    # Backup existing cookies
    backup_cookies
    echo
    
    # Test without cookies first
    if test_without_cookies; then
        log_info "YouTube works without cookies - cookie setup is optional but recommended"
    else
        log_warning "YouTube requires cookies - cookie setup is mandatory"
    fi
    echo
    
    # Create sample cookie file
    create_sample_cookie_file
    echo
    
    # Test the sample (will likely fail)
    if test_cookie_file; then
        log_success "Cookie setup completed successfully!"
    else
        log_warning "Sample cookies don't work (expected)"
        log_info "You need to replace with real cookies"
    fi
    echo
    
    # Create environment config
    create_env_config
    echo
    
    # Generate instructions
    generate_instructions
    
    echo
    log_info "Setup completed!"
    log_info "Next steps:"
    log_info "  1. Replace sample cookies with real YouTube cookies"
    log_info "  2. Test the setup with yt-dlp"
    log_info "  3. Update environment variables in production"
    log_info "  4. Restart the application"
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
    "backup")
        backup_cookies
        log_success "Cookies backed up"
        ;;
    "clean")
        log_info "Cleaning up cookie files..."
        rm -f "$COOKIES_FILE"
        log_success "Cookie files cleaned"
        ;;
    "help"|"-h"|"--help")
        cat << EOF
Production YouTube Cookie Setup Script

Usage: $0 [command]

Commands:
  (no command)  Run full setup process
  test          Test current cookie configuration
  backup        Backup existing cookies
  clean         Remove cookie files
  help          Show this help message

Examples:
  $0                    # Run full setup
  $0 test              # Test current setup
  $0 backup            # Backup cookies

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
