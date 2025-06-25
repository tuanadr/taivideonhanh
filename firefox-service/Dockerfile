# Firefox Service - Production Ready (No GPG Issues)
FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install all dependencies in one layer to avoid GPG issues
RUN apt-get update && apt-get install -y \
    firefox \
    xvfb \
    x11vnc \
    supervisor \
    curl \
    wget \
    python3 \
    python3-pip \
    python3-websockify \
    novnc \
    sqlite3 \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18 from binary (avoid GPG issues)
RUN curl -fsSL https://nodejs.org/dist/v18.20.4/node-v18.20.4-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1

# Install yt-dlp for testing
RUN pip3 install yt-dlp

# Install geckodriver for Selenium
RUN GECKODRIVER_VERSION=$(curl -s https://api.github.com/repos/mozilla/geckodriver/releases/latest | grep tag_name | cut -d '"' -f 4) && \
    wget -O /tmp/geckodriver.tar.gz "https://github.com/mozilla/geckodriver/releases/download/${GECKODRIVER_VERSION}/geckodriver-${GECKODRIVER_VERSION}-linux64.tar.gz" && \
    tar -xzf /tmp/geckodriver.tar.gz -C /usr/local/bin && \
    chmod +x /usr/local/bin/geckodriver && \
    rm /tmp/geckodriver.tar.gz

# Create app directory
WORKDIR /app

# Create Firefox profile directory
RUN mkdir -p /app/firefox-profile /app/cookies /app/logs

# Copy application files
COPY package.json package-lock.json ./
RUN npm install

COPY src/ ./src/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create startup scripts
COPY scripts/ ./scripts/
RUN chmod +x ./scripts/*.sh

# Set up noVNC
RUN mkdir -p /app/novnc && \
    if [ -d "/usr/share/novnc" ]; then \
        cp -r /usr/share/novnc/* /app/novnc/ 2>/dev/null || true; \
    fi && \
    # Ensure websockify is available
    python3 -c "import websockify" || pip3 install websockify

# Create user for Firefox
RUN useradd -m -s /bin/bash firefox && \
    chown -R firefox:firefox /app

# Expose ports
EXPOSE 3000 5900 6080

# Environment variables
ENV DISPLAY=:99
ENV FIREFOX_PROFILE_PATH=/app/firefox-profile
ENV COOKIES_PATH=/app/cookies
ENV VNC_PASSWORD=firefox123
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
