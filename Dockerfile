# Backend Python + WPPConnect Server - Unified Container
FROM python:3.10-slim

WORKDIR /app

# 1. Install System Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    gcc \
    python3-dev \
    ffmpeg \
    libpq-dev \
    curl \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 2. Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g npm@latest \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

# 3. Install Google Chrome (for WPPConnect/Puppeteer)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 4. Install WPPConnect Server
RUN npm install -g @wppconnect/server \
    && npm cache clean --force

# 5. Install Python Dependencies
COPY backend_python/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip cache purge

# 6. Copy Backend Code
COPY backend_python/ .

# 7. Environment Variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV MALLOC_ARENA_MAX=2
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 8. Create directories for WPPConnect sessions
RUN mkdir -p /app/tokens /app/sessions

# 9. Create Startup Script
RUN printf "#!/bin/bash\n\
    set -e\n\
    \n\
    echo \"🔧 Setting up environment...\"\n\
    \n\
    # Start WPPConnect Server in background on port 8081\n\
    echo \"🚀 Starting WPPConnect Server on port 8081...\"\n\
    # Use 'command -v' to find the executable path dynamically\n\
    WPP_CMD=\$(command -v wppconnect-server)\n\
    echo \"Found wppconnect-server at: \$WPP_CMD\"\n\
    \n\
    \$WPP_CMD --port 8081 --secretKey \"\${WPPCONNECT_SECRET:-default_secret}\" > wpp.log 2>&1 &\n\
    \n\
    # Wait for WPPConnect to be ready (max 60s)\n\
    echo \"⏳ Waiting for WPPConnect to start on port 8081...\"\n\
    for i in {1..60}; do\n\
    if curl -s http://localhost:8081 > /dev/null; then\n\
    echo \"✅ WPPConnect is up!\"\n\
    break\n\
    fi\n\
    sleep 1\n\
    done\n\
    \n\
    # Start Python Backend\n\
    echo \"🐍 Starting Python Backend on port \${PORT:-8000}...\"\n\
    exec uvicorn main:app --host 0.0.0.0 --port \${PORT:-8000} --proxy-headers --workers 1\n" > start.sh && chmod +x start.sh

# 10. Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Expose ports
EXPOSE 8081

# Start both services
CMD ["./start.sh"]
