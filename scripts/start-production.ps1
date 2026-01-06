# ============================================
# INOVAR REFRIGERAÇÃO - Script de Produção (PowerShell)
# ============================================

Write-Host "🚀 Iniciando ambiente de produção..." -ForegroundColor Cyan

# Verificar arquivo .env
if (-not (Test-Path ".env")) {
    Write-Host "❌ Arquivo .env não encontrado!" -ForegroundColor Red
    Write-Host "   Copie .env.prod.example para .env e configure as variáveis." -ForegroundColor Yellow
    exit 1
}

# Subir containers produção
Write-Host "📦 Subindo containers Docker (produção)..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml up -d --build

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
Write-Host "✅ Produção iniciada!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor White
Write-Host "   Frontend:  http://localhost:80" -ForegroundColor White
Write-Host "   API:       http://localhost:8000" -ForegroundColor White
Write-Host "   Docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "   MinIO:     http://localhost:9011" -ForegroundColor White
Write-Host "   Evolution: http://localhost:8081" -ForegroundColor White
Write-Host ""
