# 🚀 Buscador JSON - Complete Setup Guide

> Guia completo de instalação, configuração e deployment do Buscador JSON

## 📋 Índice

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Instalação Rápida](#instalação-rápida)
3. [Instalação Detalhada](#instalação-detalhada)
4. [Configuração](#configuração)
5. [Docker Deployment](#docker-deployment)
6. [Desenvolvimento Local](#desenvolvimento-local)
7. [Troubleshooting](#troubleshooting)
8. [Deployment em Produção](#deployment-em-produção)

---

## 💻 Requisitos do Sistema

### Mínimo
- **RAM**: 2 GB
- **Disco**: 10 GB livres
- **CPU**: Dual-core 2.0 GHz+
- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)

### Recomendado
- **RAM**: 4+ GB
- **Disco**: 50 GB+ (para grandes volumes de dados)
- **CPU**: Quad-core 2.4 GHz+
- **Internet**: Conexão de 10+ Mbps para downloads

### Dependências Obrigatórias

#### Windows
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (4.0+)
- [Git](https://git-scm.com/) (2.30+)
- [Node.js](https://nodejs.org/) (16+ LTS recomendado)
- [Python](https://www.python.org/) (3.8+)

#### macOS
```bash
# Usando Homebrew
brew install docker git node python@3.11

# Docker Desktop
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install -y git curl
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs python3.11 python3-pip
```

---

## ⚡ Instalação Rápida

### 🪟 Windows (PowerShell)

```powershell
# 1. Clone repositório
git clone <repo-url>
cd Buscador-Json\code

# 2. Validar ambiente
.\validate-env.ps1

# 3. Iniciar com Docker
.\docker-init.ps1

# 4. Acessar aplicação
# Frontend: http://localhost:3000
# API: http://localhost:4000
```

### 🐧 Linux/macOS

```bash
# 1. Clone repositório
git clone <repo-url>
cd Buscador-Json/code

# 2. Validar ambiente
chmod +x validate-env.sh
./validate-env.sh

# 3. Iniciar com Docker
chmod +x docker-init.sh
./docker-init.sh

# 4. Acessar aplicação
# Frontend: http://localhost:3000
# API: http://localhost:4000
```

---

## 📚 Instalação Detalhada

### Passo 1: Clonar Repositório

```bash
git clone https://github.com/seu-usuario/Buscador-Json.git
cd Buscador-Json/code
```

### Passo 2: Validar Ambiente

O script de validação verifica todos os pré-requisitos:

```bash
# Windows
.\validate-env.ps1

# Linux/macOS
./validate-env.sh
```

**O que é verificado:**
- ✓ Docker e Docker Compose
- ✓ Node.js e npm/pnpm
- ✓ Python 3.8+
- ✓ Portas disponíveis (3000, 4000, 8080)
- ✓ Espaço em disco
- ✓ Variáveis de ambiente

**Correções automáticas:**
- Cria diretórios (`uploads/`, `data/`)
- Copia `.env.example` → `.env`
- Tenta instalar dependências faltantes

### Passo 3: Instalar Dependências

```bash
# Node.js
npm install -g pnpm  # Gerenciador preferido
pnpm install
# ou
npm install

# Python
pip3 install -r requirements.txt
```

### Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar template
cp .env.example .env

# Editar .env com seus valores
# Mínimo necessário:
#   NEXT_PUBLIC_API_URL=http://localhost:4000
#   NODE_ENV=development
#   FLASK_ENV=development
#   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### Passo 5: Inicializar Banco de Dados

```bash
python3 init-db.py --backup --stats

# Verificar
python3 init-db.py --verify-only --stats
```

### Passo 6: Compilar Aplicação

```bash
# Frontend (Next.js)
pnpm build

# Opcional: Verificar sintaxe TypeScript
npx tsc --noEmit
```

---

## ⚙️ Configuração

### Arquivo `.env`

Copie ``.env.example` e customize:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
NODE_ENV=production
NEXT_PUBLIC_LOG_LEVEL=info

# Backend
FLASK_ENV=production
FLASK_DEBUG=0
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
MAX_UPLOAD_SIZE=104857600  # 100MB

# Database
DATABASE_URL=sqlite:///./db.sqlite
UPLOAD_DIR=./uploads
```

### Variáveis de Ambiente Principais

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `NEXT_PUBLIC_API_URL` | URL da API (frontend) | `http://localhost:4000` |
| `NODE_ENV` | Ambiente Node | `production` |
| `FLASK_ENV` | Ambiente Flask | `production` |
| `FLASK_DEBUG` | Debug mode (0/1) | `0` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |
| `MAX_UPLOAD_SIZE` | Tamanho máximo upload | `104857600` (100MB) |

---

## 🐳 Docker Deployment

### Inicialização com Docker Compose

```bash
# Construir imagens
docker-compose build

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Visualizar logs
docker-compose logs -f
```

### Serviços Disponíveis

```yaml
Frontend   (Next.js)  → http://localhost:3000
Backend    (Flask)    → http://localhost:4000
Debug UI   (SQLite)   → http://localhost:8080 (--profile debug)
```

### Parar/Reiniciar Serviços

```bash
# Parar
docker-compose down

# Reiniciar
docker-compose restart

# Parar com limpeza de volumes
docker-compose down -v  # CUIDADO: Deleta dados!
```

---

## 🔨 Desenvolvimento Local

### Instalação para Dev

```bash
# Instalar dependências Node
pnpm install

# Instalar dependências Python
pip3 install -r requirements.txt

# Inicializar banco
python3 init-db.py
```

### Executar Localmente

#### Terminal 1 - Frontend (Next.js)
```bash
NODE_ENV=development npm run dev
# Acessa: http://localhost:3000
```

#### Terminal 2 - Backend (Flask)
```bash
FLASK_ENV=development FLASK_DEBUG=1 python3 server_api.py
# Acessa: http://localhost:4000
```

### Desenvolvimento com Hot Reload

**Frontend**: Qualquer mudança em `app/`, `components/`, `lib/` recarrega automaticamente

**Backend**: Use `--reload` com Flask:
```bash
FLASK_ENV=development FLASK_DEBUG=1 flask run --reload
```

### Scripts Úteis

```bash
# TypeScript checking
npx tsc --noEmit

# Format code
pnpm format

# Lint
pnpm lint

# Tests
pnpm test

# Python linting
pylint server_api.py
```

---

## 🐛 Troubleshooting

### Problema: "Port already in use"

```bash
# Encontrar processo usando a porta
# Windows
netstat -ano | findstr :3000

# Linux/macOS
lsof -i :3000

# Solução: Mudar porta em docker-compose.yml
# De: ports: ["3000:3000"]
# Para: ports: ["3001:3000"]
```

### Problema: "CORS error"

**Solução 1:** Verificar `NEXT_PUBLIC_API_URL` em `.env`

```bash
# Deve estar acessível do frontend
NEXT_PUBLIC_API_URL=http://localhost:4000  # Local
NEXT_PUBLIC_API_URL=http://backend:4000    # Docker
```

**Solução 2:** Verificar `ALLOWED_ORIGINS`

```bash
# Deve incluir a origem do frontend
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000
```

### Problema: "Database locked"

```bash
# SQLite WAL files corrompidos
rm db.sqlite-wal db.sqlite-shm

# Reiniciar
docker-compose restart backend
```

### Problema: "npm dependencies outdated"

```bash
# Atualizar
pnpm update
pnpm install

# Limpar cache
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Problema: "Docker daemon not running"

```bash
# Windows: Abrir Docker Desktop
# Linux
sudo systemctl start docker

# macOS
open /Applications/Docker.app
```

---

## 🚀 Deployment em Produção

### Checklist de Deploy

- [ ] `.env` com valores reais de produção
- [ ] `ALLOWED_ORIGINS` restritivo (não use `*`)
- [ ] `FLASK_DEBUG=0` e `NODE_ENV=production`
- [ ] HTTPS configurado (nginx/reverse proxy)
- [ ] Database em volume externo
- [ ] Backup automático habilitado
- [ ] Monitoring ativado
- [ ] Limites de recursos configurados

### Configuração de Produção

#### .env.production
```bash
# Frontend
NEXT_PUBLIC_API_URL=https://api.seudomain.com
NODE_ENV=production

# Backend
FLASK_ENV=production
FLASK_DEBUG=0
ALLOWED_ORIGINS=https://seudomain.com,https://www.seudomain.com

# Security
MAX_UPLOAD_SIZE=104857600
```

#### docker-compose.prod.yml
```yaml
version: '3.9'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 512M

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: always
    environment:
      - FLASK_ENV=production
    volumes:
      - /data/uploads:/app/uploads
      - /data/db:/app/data
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

#### HTTPS com Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name seudomain.com;

    ssl_certificate /etc/letsencrypt/live/seudomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudomain.com/privkey.pem;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api/ {
        proxy_pass http://backend:4000/;
    }
}
```

### Backup Automático

```bash
#!/bin/bash
# backup.sh - Executar via cron diariamente

BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR

# Backup do banco
docker-compose exec -T backend python3 << EOF
import shutil
import os
from datetime import datetime, timedelta

timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
shutil.copy2('/app/data/db.sqlite', '/backups/db_${timestamp}.sqlite')

# Manter apenas últimos 30 dias
cutoff = datetime.now() - timedelta(days=30)
for f in os.listdir('/backups'):
    if os.stat(f).st_mtime < cutoff.timestamp():
        os.remove(f)
EOF
```

### Monitoramento

**Verificar saúde dos serviços:**
```bash
# Status
docker-compose ps

# Logs
docker-compose logs -f --tail=100

# Resource usage
docker stats
```

---

## 📞 Suporte e Recursos

### Documentação
- [Docker Guide](./DOCKER_SETUP.md)
- [Architecture](./docs/)
- [API Reference](./docs/api.md)

### Comandos Úteis
```bash
# Visualizar logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Executar em container
docker-compose exec backend python3 -c "import sys; print(sys.version)"

# Backup manual
python3 init-db.py --backup

# Reset database
docker-compose exec backend python3 init-db.py
```

### Problemas Comuns

| Erro | Solução |
|------|---------|
| Port 3000 in use | Mudar `ports: ["3001:3000"]` |
| CORS error | Verificar `ALLOWED_ORIGINS` |
| Database locked | `rm db.sqlite-wal && restart` |
| Memory error | Aumentar Docker memory limit |
| Build failed | `docker-compose build --no-cache --pull` |

---

## ✅ Verificação de Instalação

Após completar a instalação:

```bash
# 1. Verificar variáveis de ambiente
echo $NEXT_PUBLIC_API_URL
echo $FLASK_ENV

# 2. Acessar frontend
curl http://localhost:3000

# 3. Acessar API
curl http://localhost:4000/list

# 4. Verificar banco
python3 init-db.py --verify-only --stats

# 5. Verificar Docker
docker-compose ps
```

---

## 📊 Performance Tips

1. **Aumentar cache SQLite**
   ```sql
   PRAGMA cache_size=10000;
   ```

2. **Habilitar WAL mode**
   ```sql
   PRAGMA journal_mode=WAL;
   ```

3. **Ajustar recursos Docker**
   ```yaml
   deploy:
     resources:
       limits:
         memory: 2G
       reservations:
         memory: 1G
   ```

4. **Usar gzip compression**
   ```nginx
   gzip on;
   gzip_types text/plain text/css application/json;
   ```

---

**Última atualização:** 2024
**Status:** ✅ Production Ready
**Versão:** 1.0
