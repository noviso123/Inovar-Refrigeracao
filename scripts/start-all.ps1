# ============================================
# INOVAR REFRIGERAÇÃO - Script de Inicialização Completa
# Inicia Docker e o Túnel zrok
# ============================================

Write-Host "🚀 Iniciando ambiente completo Inovar Refrigeração..." -ForegroundColor Cyan

# 1. Verificar Docker
try {
    docker --version | Out-Null
}
catch {
    Write-Host "❌ Docker não encontrado. Instale o Docker Desktop primeiro." -ForegroundColor Red
    exit 1
}

# 2. Subir containers Docker
Write-Host "📦 Subindo containers Docker..." -ForegroundColor Yellow
docker-compose up -d

# 3. Iniciar Túnel zrok (Gerenciado pelo Docker)
Write-Host "🌐 Túnel zrok será iniciado pelo Docker..." -ForegroundColor Yellow

# 4. Aguardar backend
Write-Host "⏳ Aguardando backend inicializar..." -ForegroundColor Yellow
for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -Method Get -ErrorAction Stop
        Write-Host "✅ Backend online!" -ForegroundColor Green
        break
    }
    catch {
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Ambiente pronto e compartilhado!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor White
Write-Host "   Pública (Vercel): https://inovar.share.zrok.io" -ForegroundColor Green
Write-Host "   Local API:        http://localhost:8000" -ForegroundColor White
Write-Host "   Local Nginx:      http://localhost:80" -ForegroundColor White
Write-Host "   MinIO:            http://localhost:9011" -ForegroundColor White
Write-Host ""
Write-Host "💡 Mantenha a janela do zrok aberta para o sistema funcionar online." -ForegroundColor Yellow
