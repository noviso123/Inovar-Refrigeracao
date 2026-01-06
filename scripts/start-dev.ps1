# ============================================
# INOVAR REFRIGERAÇÃO - Script de Desenvolvimento (PowerShell)
# ============================================

Write-Host "🚀 Iniciando ambiente de desenvolvimento..." -ForegroundColor Cyan

# Verificar Docker
try {
    docker --version | Out-Null
}
catch {
    Write-Host "❌ Docker não encontrado. Instale o Docker primeiro." -ForegroundColor Red
    exit 1
}

# Subir containers
Write-Host "📦 Subindo containers Docker..." -ForegroundColor Yellow
docker-compose up -d

# Aguardar backend
Write-Host "⏳ Aguardando backend inicializar..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/" -Method Get -ErrorAction Stop
        Write-Host "✅ Backend online!" -ForegroundColor Green
        break
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Ambiente pronto!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor White
Write-Host "   API:      http://localhost:8000" -ForegroundColor White
Write-Host "   Docs:     http://localhost:8000/docs" -ForegroundColor White
Write-Host "   Frontend: http://localhost:5173 (npm run dev)" -ForegroundColor White
Write-Host "   Nginx:    http://localhost:80" -ForegroundColor White
Write-Host "   MinIO:    http://localhost:9011" -ForegroundColor White
Write-Host ""
