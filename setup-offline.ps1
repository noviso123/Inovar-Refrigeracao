# Inovar Refrigeração - Offline Setup Script
# This script prepares the local environment for development and testing.

Write-Host "🚀 Starting Offline Setup for Inovar Refrigeração..." -ForegroundColor Cyan

# 1. Backend Setup
Write-Host "`n📦 Setting up Backend..." -ForegroundColor Yellow
if (Test-Path "backend_python") {
    cd backend_python

    # Dependencies
    if (Get-Command pip -ErrorAction SilentlyContinue) {
        Write-Host "Installing backend dependencies..."
        pip install -r requirements.txt
    } else {
        Write-Host "⚠️ pip not found. Please install Python and pip." -ForegroundColor Red
    }

    # .env Setup
    if (-not (Test-Path ".env")) {
        Write-Host "Creating .env from .env.example..."
        Copy-Item ".env.example" ".env"
    } else {
        Write-Host ".env already exists, skipping."
    }

    cd ..
}

# 2. Frontend Setup
Write-Host "`n📦 Setting up Frontend..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    cd frontend

    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "Installing frontend dependencies..."
        npm install
    } else {
        Write-Host "⚠️ npm not found. Please install Node.js." -ForegroundColor Red
    }

    cd ..
}

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nTo start the project:"
Write-Host "1. Backend: cd backend_python; python main.py"
Write-Host "2. Frontend: cd frontend; npm run dev"
Write-Host "`nRemember to set up your local services (Redis, PostgreSQL, Evolution API) if needed or use defaults."
