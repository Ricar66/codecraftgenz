#!/bin/bash

# Script de inicialização para Azure App Service Linux
echo "🚀 Iniciando CodeCraft no Azure App Service..."

# Definir variáveis de ambiente padrão se não estiverem definidas
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-8080}

# Iniciar o servidor
echo "🌐 Iniciando servidor Node.js na porta $PORT..."
exec node server.js