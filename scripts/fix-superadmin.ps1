# ============================================
# INOVAR REFRIGERAÇÃO - FIX SUPER ADMIN (PowerShell)
# Script de Reparação - Backend Python
# ============================================

param(
    [string]$AdminEmail = "admin@inovar.com",
    [string]$ContainerName = "inovar-postgres"
)

Write-Host "🚀 Iniciando reparação do Inovar Refrigeração App..." -ForegroundColor Cyan
Write-Host "📧 Alvo: $AdminEmail" -ForegroundColor Yellow

# Detectar container do banco de dados
if (-not (docker ps --filter "name=$ContainerName" --format "{{.Names}}" 2>$null)) {
    $ContainerName = docker ps --filter "name=postgres" --format "{{.Names}}" | Select-Object -First 1
    if (-not $ContainerName) {
        Write-Host "❌ Nenhum container PostgreSQL encontrado!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📂 Container detetado: $ContainerName" -ForegroundColor Green

# 1. Executar script SQL de reparação (Python/SQLAlchemy)
Write-Host "`n✨ Passo 1: Executando script SQL de reparação..." -ForegroundColor Cyan

$sqlScript = @"
-- Atualizar usuário para Super Admin (Backend Python)
UPDATE users 
SET 
    role = 'super_admin',
    is_active = true
WHERE email = '$AdminEmail';

-- Verificar resultado
SELECT email, role, is_active FROM users WHERE email = '$AdminEmail';
"@

$sqlScript | docker exec -i $ContainerName psql -U inovar_admin -d inovar_db

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Usuário atualizado com sucesso!" -ForegroundColor Green
}
else {
    Write-Host "⚠️ Possível erro ao executar SQL. Verificar logs." -ForegroundColor Yellow
}

# 2. Reiniciar backend
Write-Host "`n♻️ Passo 2: Reiniciando containers..." -ForegroundColor Cyan
docker-compose restart backend 2>$null
Write-Host "✅ Backend reiniciado!" -ForegroundColor Green

# 3. Verificação final
Write-Host "`n🔍 Passo 3: Verificação final..." -ForegroundColor Cyan

$verification = @"
SELECT 
    u.email,
    u.role,
    u.is_active,
    CASE WHEN u.role = 'super_admin' THEN 'ASSINATURA VITALICIA (BYPASS)' ELSE 'Verificar assinatura' END as status
FROM users u
WHERE u.email = '$AdminEmail';
"@

$verification | docker exec -i $ContainerName psql -U inovar_admin -d inovar_db

Write-Host "`n🎉 CONCLUÍDO!" -ForegroundColor Green
Write-Host "👉 Abra uma aba anônima e tente logar com: $AdminEmail" -ForegroundColor Yellow
