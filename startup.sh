#!/bin/bash

# Script de inicialização para Azure App Service Linux
echo "🚀 Iniciando CodeCraft no Azure App Service..."

# Definir variáveis de ambiente padrão se não estiverem definidas
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8080}

# Verificar se o Prisma Client está disponível
if [ -f "node_modules/.bin/prisma" ]; then
    echo "📦 Prisma encontrado, gerando cliente..."
    npx prisma generate || echo "⚠️  Aviso: Falha ao gerar cliente Prisma"
else
    echo "⚠️  Prisma não encontrado, continuando sem migração..."
fi

# Iniciar o servidor
echo "🌐 Iniciando servidor Node.js na porta $PORT..."
exec node server.js