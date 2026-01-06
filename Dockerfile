# Build Stage for Frontend
FROM node:18-alpine as frontend-build
# Copy dependency definitions
# Try to copy package-lock.json if it exists, otherwise just package.json
COPY frontend/package.json ./
# If you have a lock file, copy it. If not, this line might fail or be skipped depending on context,
# but explicitly copying just package.json is safer if lock is missing.
# Ideally: COPY frontend/package*.json ./
COPY frontend/package*.json ./
# Install dependencies
RUN npm install
# Copy source code
COPY frontend/ ./
# Build the application
RUN npm run build

# Runtime Stage for Backend
FROM python:3.9-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend_python/requirements.txt ./
# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend_python/ .

# Copy built frontend assets from previous stage
COPY --from=frontend-build /app/frontend/dist /app/static

# Environment variables
ENV STATIC_DIR=/app/static
ENV PORT=8000

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
