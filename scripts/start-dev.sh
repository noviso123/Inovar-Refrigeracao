#!/bin/bash
# ============================================
# INOVAR REFRIGERAÇÃO - Script de Desenvolvimento
# ============================================

echo "🚀 Iniciando ambiente de desenvolvimento..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale o Docker primeiro."
    exit 1
fi

# Subir containers
echo "📦 Subindo containers Docker..."
docker-compose up -d

# Aguardar backend
echo "⏳ Aguardando backend inicializar..."
for i in {1..30}; do
    if curl -s http://localhost:8000/ > /dev/null; then
        echo "✅ Backend online!"
        break
    fi
    sleep 2
done

echo ""
echo "============================================"
echo "✅ Ambiente pronto!"
echo "============================================"
echo ""
echo "📍 URLs:"
echo "   API:      http://localhost:8000"
echo "   Docs:     http://localhost:8000/docs"
echo "   Frontend: http://localhost:5173 (npm run dev)"
echo "   Nginx:    http://localhost:80"
echo "   MinIO:    http://localhost:9011"
echo ""
