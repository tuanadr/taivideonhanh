#!/bin/bash

# Setup YouTube Authentication for taivideonhanh
# This script installs Chrome and sets up cookie authentication

set -e

echo "🚀 Setting up YouTube Authentication..."

# 1. Install Google Chrome
echo "📦 Installing Google Chrome..."
if ! command -v google-chrome &> /dev/null; then
    # Download and install Chrome
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
    sudo apt-get update
    sudo apt-get install -y google-chrome-stable
    echo "✅ Chrome installed successfully"
else
    echo "✅ Chrome already installed"
fi

# 2. Create Chrome profile directory
echo "📁 Creating Chrome profile directory..."
sudo mkdir -p /opt/chrome-profile
sudo chmod 755 /opt/chrome-profile
sudo chown $(whoami):$(whoami) /opt/chrome-profile

# 3. Create cookies directory
echo "📁 Creating cookies directory..."
sudo mkdir -p /tmp/cookies
sudo chmod 755 /tmp/cookies
sudo chown $(whoami):$(whoami) /tmp/cookies

# 4. Test Chrome installation
echo "🧪 Testing Chrome installation..."
google-chrome --version

# 5. Create helper script for manual login
cat > /tmp/youtube-login.sh << 'EOF'
#!/bin/bash
echo "🌐 Opening Chrome for YouTube login..."
echo "Please:"
echo "1. Login to your YouTube account"
echo "2. Watch a few videos to establish session"
echo "3. Close Chrome when done"
echo ""
echo "Press Enter to continue..."
read

google-chrome --user-data-dir=/opt/chrome-profile --no-sandbox --disable-dev-shm-usage
EOF

chmod +x /tmp/youtube-login.sh

# 6. Test yt-dlp with Chrome cookies
echo "🧪 Testing yt-dlp with Chrome cookies..."
if yt-dlp --cookies-from-browser chrome --dump-json --quiet --simulate "https://www.youtube.com/watch?v=jNQXAC9IVRw" > /dev/null 2>&1; then
    echo "✅ Chrome cookies working!"
else
    echo "⚠️ Chrome cookies not working yet - need manual login"
    echo "Run: /tmp/youtube-login.sh"
fi

# 7. Update backend environment
echo "🔧 Updating backend environment..."
if [ -f "backend/.env" ]; then
    # Update existing .env
    if grep -q "YOUTUBE_COOKIES_PATH" backend/.env; then
        sed -i 's|YOUTUBE_COOKIES_PATH=.*|YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt|' backend/.env
    else
        echo "YOUTUBE_COOKIES_PATH=/tmp/cookies/youtube-cookies.txt" >> backend/.env
    fi
    
    if grep -q "CHROME_USER_DATA_DIR" backend/.env; then
        sed -i 's|CHROME_USER_DATA_DIR=.*|CHROME_USER_DATA_DIR=/opt/chrome-profile|' backend/.env
    else
        echo "CHROME_USER_DATA_DIR=/opt/chrome-profile" >> backend/.env
    fi
    
    if grep -q "ENABLE_COOKIE_AUTH" backend/.env; then
        sed -i 's|ENABLE_COOKIE_AUTH=.*|ENABLE_COOKIE_AUTH=true|' backend/.env
    else
        echo "ENABLE_COOKIE_AUTH=true" >> backend/.env
    fi
    
    echo "✅ Backend .env updated"
else
    echo "⚠️ Backend .env not found"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run manual login: /tmp/youtube-login.sh"
echo "2. Restart backend: cd backend && npm start"
echo "3. Test YouTube video extraction"
echo ""
echo "🔧 Manual login instructions:"
echo "1. Run: /tmp/youtube-login.sh"
echo "2. Login to YouTube in the opened browser"
echo "3. Watch 2-3 videos to establish session"
echo "4. Close browser"
echo "5. Restart backend"
echo ""
echo "🧪 Test command:"
echo "yt-dlp --cookies-from-browser chrome --dump-json 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
