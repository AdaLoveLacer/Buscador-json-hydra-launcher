#!/bin/bash

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_PORT=3000
SERVER_URL="http://localhost:$NODE_PORT"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🚀 AUTO-START NEXT.JS${NC}"
echo -e "${BLUE}================================${NC}\n"

# 1. Verificar dependências Node.js
echo -e "${YELLOW}[1/3] Verificando dependências Node.js...${NC}"
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  → Instalando dependências...${NC}"
    npm install
else
    echo -e "${YELLOW}  → Verificando atualizações...${NC}"
    npm install
fi
echo -e "${GREEN}  ✅ Dependências ok${NC}\n"

# 2. Limpar e iniciar Next.js
echo -e "${YELLOW}[2/3] Iniciando servidor...${NC}"

# Matar processos antigos
echo -e "${YELLOW}  → Limpando portas antigas...${NC}"
pkill -f "node.*next" 2>/dev/null || true
sleep 2

# Iniciar Next.js (background)
echo -e "${YELLOW}  → Iniciando Next.js em :$NODE_PORT...${NC}"
npm run dev > /tmp/nextjs_server.log 2>&1 &
NEXT_PID=$!
sleep 5

# Verificar se Next.js está respondendo
echo -e "${YELLOW}  → Aguardando resposta do servidor...${NC}"
for i in {1..30}; do
    if curl -s "http://localhost:$NODE_PORT" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✅ Next.js respondendo${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}  ⚠️  Next.js não respondeu no tempo esperado${NC}"
    fi
    sleep 1
done

echo ""

# 3. Abrir navegador
echo -e "${YELLOW}[3/3] Abrindo navegador...${NC}"

# Tentar diferentes navegadores
if command -v xdg-open &> /dev/null; then
    xdg-open "$SERVER_URL" 2>/dev/null &
    echo -e "${GREEN}  ✅ Navegador aberto${NC}"
elif command -v firefox &> /dev/null; then
    firefox "$SERVER_URL" 2>/dev/null &
    echo -e "${GREEN}  ✅ Firefox aberto${NC}"
elif command -v chromium &> /dev/null; then
    chromium "$SERVER_URL" 2>/dev/null &
    echo -e "${GREEN}  ✅ Chromium aberto${NC}"
elif command -v google-chrome &> /dev/null; then
    google-chrome "$SERVER_URL" 2>/dev/null &
    echo -e "${GREEN}  ✅ Chrome aberto${NC}"
else
    echo -e "${YELLOW}  ℹ️  Nenhum navegador encontrado${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ SERVIDOR INICIADO COM SUCESSO!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Servidor rodando em:${NC}"
echo -e "  🌐 ${GREEN}$SERVER_URL${NC}"
echo ""
echo -e "${YELLOW}PID do processo:${NC}"
echo -e "  $NEXT_PID"
echo ""
echo -e "${YELLOW}Para parar o servidor, execute:${NC}"
echo -e "  ${BLUE}kill $NEXT_PID${NC}"
echo ""
echo -e "${YELLOW}Logs em tempo real:${NC}"
echo -e "  tail -f /tmp/nextjs_server.log"
echo ""

# Aguardar servidor
wait
