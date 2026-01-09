# Base Image: Python 3.10
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# 1. Install System Dependencies (Chrome, Node.js, FFmpeg, etc.)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    gcc \
    ffmpeg \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Install Node.js (v18)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest

# 3. Install Google Chrome (for WPPConnect)
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 4. Install WPPConnect Server
RUN npm install -g @wppconnect/server

# 5. Install Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy Application Code
COPY . .

# 7. Create Startup Script
RUN echo '#!/bin/bash\n\
    # Start WPPConnect Server in background\n\
    export PORT=8080\n\
    npx @wppconnect/server --port 8080 &\n\
    \n\
    # Wait for WPPConnect to start (optional, just to be safe)\n\
    sleep 5\n\
    \n\
    # Start Python Backend in foreground\n\
    # Render sets PORT env var, we use it for Uvicorn\n\
    uvicorn main:app --host 0.0.0.0 --port $PORT\n\
    ' > start.sh && chmod +x start.sh

# Expose ports (8000 for Backend, 8080 for WPPConnect internal)
EXPOSE 8000 8080

# Command to run the unified script
CMD ["./start.sh"]
