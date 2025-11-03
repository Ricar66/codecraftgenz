#!/bin/bash

# Script de inicialização para Azure App Service Linux
echo "🚀 Iniciando CodeCraft no Azure App Service..."

# Definir variáveis de ambiente padrão se não estiverem definidas
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8080}

# Geração do Prisma Client é feita no build (postinstall/.deployment)
# Evitar executar Prisma em runtime para não causar erros de permissão no Azure
echo "ℹ️  Pulando geração do Prisma Client no startup (feito no build)."

# Iniciar o servidor
echo "🌐 Iniciando servidor Node.js na porta $PORT..."
exec node server.js