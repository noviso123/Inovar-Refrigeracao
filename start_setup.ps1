# Script para iniciar o sistema e configurar Admin
Write-Host "Iniciando sistema para Setup de Admin..." -ForegroundColor Green

# 1. Instalar dependencias (tentativa segura)
Write-Host "Instalando dependencias do Backend..."
cd backend_python
..\.venv\Scripts\pip install fastapi uvicorn sqlalchemy pydantic python-jose passlib bcrypt python-multipart boto3 httpx redis
# Tentar psycopg2-binary forçando binário
..\.venv\Scripts\pip install psycopg2-binary --only-binary :all:

# 2. Iniciar Backend
Write-Host "Iniciando Backend..."
Start-Process -FilePath "..\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn main:app --reload --host 0.0.0.0 --port 8000" -NoNewWindow

# 3. Iniciar Frontend
Write-Host "Iniciando Frontend..."
cd ..\frontend
npm run dev

Write-Host "Acesse: http://localhost:5173/setup" -ForegroundColor Cyan
