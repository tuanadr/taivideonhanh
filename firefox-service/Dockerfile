# Firefox Service for Cookie Management
# Optimized for yt-dlp cookie extraction

FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    firefox \
    xvfb \
    x11vnc \
    novnc \
    websockify \
    supervisor \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    nodejs \
    npm \
    sqlite3 \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp for testing
RUN pip3 install yt-dlp

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
RUN ln -s /usr/share/novnc /app/novnc

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
