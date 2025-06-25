#!/bin/bash

# Create YouTube Cookies for taivideonhanh
# This script helps you create a cookie file for YouTube authentication

set -e

echo "🍪 YouTube Cookie Setup Guide"
echo "=============================="
echo ""

# Create cookies directory
sudo mkdir -p /tmp/cookies
sudo chmod 755 /tmp/cookies
sudo chown $(whoami):$(whoami) /tmp/cookies

echo "📋 HƯỚNG DẪN TẠO COOKIE FILE:"
echo ""
echo "🔧 Cách 1: Sử dụng Browser Extension (Khuyến nghị)"
echo "1. Mở Chrome/Firefox trên máy tính có GUI"
echo "2. Cài đặt extension: 'Get cookies.txt LOCALLY'"
echo "   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
echo "   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/"
echo "3. Đăng nhập vào YouTube.com"
echo "4. Xem 2-3 video để tạo session"
echo "5. Click extension icon → Export cookies cho youtube.com"
echo "6. Lưu file cookies.txt"
echo "7. Upload file lên server:"
echo "   scp cookies.txt user@server:/tmp/cookies/youtube-cookies.txt"
echo ""

echo "🔧 Cách 2: Sử dụng yt-dlp trực tiếp (nếu có GUI)"
echo "1. Trên máy có GUI, chạy:"
echo "   google-chrome --user-data-dir=/tmp/chrome-profile"
echo "2. Đăng nhập YouTube, xem vài video"
echo "3. Đóng Chrome"
echo "4. Chạy: yt-dlp --cookies-from-browser chrome --dump-json 'https://youtube.com/watch?v=test'"
echo "5. Nếu thành công, copy profile lên server"
echo ""

echo "🔧 Cách 3: Tạo cookie file thủ công"
echo "1. Mở Developer Tools (F12) trên YouTube"
echo "2. Vào tab Application/Storage → Cookies → https://www.youtube.com"
echo "3. Copy các cookies quan trọng:"
echo "   - VISITOR_INFO1_LIVE"
echo "   - YSC" 
echo "   - CONSENT"
echo "   - PREF"
echo "4. Tạo file cookies.txt theo format Netscape"
echo ""

# Create sample cookie file template
cat > /tmp/cookies/youtube-cookies-template.txt << 'EOF'
# Netscape HTTP Cookie File
# This is a generated file! Do not edit.

.youtube.com	TRUE	/	FALSE	1735689600	VISITOR_INFO1_LIVE	YOUR_VISITOR_INFO_HERE
.youtube.com	TRUE	/	FALSE	1735689600	YSC	YOUR_YSC_HERE
.youtube.com	TRUE	/	FALSE	1735689600	CONSENT	YES+cb.20210328-17-p0.en+FX+YOUR_CONSENT_HERE
.youtube.com	TRUE	/	FALSE	1735689600	PREF	YOUR_PREF_HERE
EOF

echo "📄 Template cookie file tạo tại: /tmp/cookies/youtube-cookies-template.txt"
echo ""

echo "🧪 KIỂM TRA COOKIE FILE:"
echo "Sau khi có cookie file, chạy lệnh test:"
echo "yt-dlp --cookies /tmp/cookies/youtube-cookies.txt --dump-json 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"
echo ""

echo "🔄 RESTART BACKEND:"
echo "Sau khi có cookies, restart backend:"
echo "cd backend && npm start"
echo ""

echo "📱 ALTERNATIVE: Sử dụng cookies từ điện thoại"
echo "1. Cài app 'HTTP Toolkit' hoặc 'Packet Capture'"
echo "2. Bật proxy, mở YouTube app"
echo "3. Xem video, capture HTTP requests"
echo "4. Extract cookies từ requests"
echo ""

# Test if we already have a working cookie file
if [ -f "/tmp/cookies/youtube-cookies.txt" ]; then
    echo "🧪 Testing existing cookie file..."
    if yt-dlp --cookies /tmp/cookies/youtube-cookies.txt --dump-json --quiet --simulate "https://www.youtube.com/watch?v=jNQXAC9IVRw" > /dev/null 2>&1; then
        echo "✅ Existing cookie file is working!"
        echo "🚀 You can restart the backend now: cd backend && npm start"
    else
        echo "❌ Existing cookie file is not working"
        echo "📝 Please follow the instructions above to create a new one"
    fi
else
    echo "📝 No cookie file found. Please follow the instructions above."
fi

echo ""
echo "💡 TIP: Nếu bạn có máy Windows/Mac với GUI:"
echo "1. Cài Chrome + extension 'Get cookies.txt LOCALLY'"
echo "2. Login YouTube, export cookies"
echo "3. Upload lên server: scp cookies.txt user@server:/tmp/cookies/youtube-cookies.txt"
echo ""
echo "🎯 Mục tiêu: Có file /tmp/cookies/youtube-cookies.txt hoạt động"
