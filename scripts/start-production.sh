#!/bin/bash
# ============================================
# INOVAR REFRIGERAÇÃO - Script de Produção
# ============================================

echo "🚀 Iniciando ambiente de produção..."

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo "   Copie .env.prod.example para .env e configure as variáveis."
    exit 1
fi

# Subir containers produção
echo "📦 Subindo containers Docker (produção)..."
docker-compose -f docker-compose.prod.yml up -d --build

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
echo "✅ Produção iniciada!"
echo "============================================"
echo ""
echo "📍 URLs:"
echo "   Frontend:  http://localhost:80"
echo "   API:       http://localhost:8000"
echo "   Docs:      http://localhost:8000/docs"
echo "   MinIO:     http://localhost:9011"
echo "   Evolution: http://localhost:8081"
echo ""
