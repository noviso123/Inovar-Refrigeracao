# Build Frontend Script for Windows
# This script builds the Svelte frontend and copies it to the backend static directory

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Building Frontend for Production" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location frontend-svelte

Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
npm install

Write-Host ""
Write-Host "🔨 Building frontend..." -ForegroundColor Yellow
npm run build

Write-Host ""
Write-Host "📋 Copying build to backend static directory..." -ForegroundColor Yellow
Set-Location ..
if (Test-Path "backend_python\static") {
    Remove-Item -Path "backend_python\static" -Recurse -Force
}
Copy-Item -Path "frontend-svelte\build" -Destination "backend_python\static" -Recurse

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "✅ Frontend build complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Static files are now in backend_python\static\" -ForegroundColor White
Write-Host "You can now run the backend to serve both API and frontend." -ForegroundColor White
