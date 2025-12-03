# 🐳 Buscador JSON - Docker Setup Guide

> Documentação completa para deployment containerizado do Buscador JSON com Docker e Docker Compose

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Arquitetura](#arquitetura)
3. [Inicialização Rápida](#inicialização-rápida)
4. [Configuração Detalhada](#configuração-detalhada)
5. [Gerenciamento de Containers](#gerenciamento-de-containers)
6. [Troubleshooting](#troubleshooting)
7. [Produção](#produção)

---

## 🔧 Pré-requisitos

### Windows, Mac ou Linux

- **Docker Desktop** (versão 4.0+)
  - [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Incluye Docker Engine e Docker Compose

- **Git** (para clonar o repositório)
- **2GB RAM** mínimo (recomendado 4GB+)
- **10GB espaço em disco** disponível

### Verificar Instalação

```powershell
# Windows PowerShell
docker --version
docker-compose --version
docker ps

# Linux/Mac
docker --version
docker-compose --version
docker ps
```

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network                           │
│                  (buscador-network)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐              ┌──────────────────┐   │
│  │                  │              │                  │   │
│  │  Frontend        │◄────────────►│  Backend         │   │
│  │  (Next.js)       │   HTTP/REST  │  (Flask)         │   │
│  │  Port: 3000      │              │  Port: 4000      │   │
│  │                  │              │                  │   │
│  └──────────────────┘              └──────────────────┘   │
│         │                                  │               │
│         │                                  │               │
│         └──────────┬───────────────────────┘               │
│                    │                                       │
│         ┌──────────▼────────────┐                          │
│         │                       │                          │
│         │  Data Persistence     │                          │
│         │  - uploads/           │                          │
│         │  - data/db.sqlite     │                          │
│         │                       │                          │
│         └───────────────────────┘                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  SQLite-Web (Debug Profile - Opcional)             │   │
│  │  Port: 8080 - Browser UI para Database             │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Componentes

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| **Frontend** | Node.js 18 Alpine | 3000 | Next.js Application |
| **Backend** | Python 3.11 Slim | 4000 | Flask REST API |
| **SQLite-Web** | coleifer/sqlite-web | 8080 | Database UI (opcional) |

---

## 🚀 Inicialização Rápida

### Windows (PowerShell)

```powershell
# 1. Clone o repositório
git clone <repo-url>
cd Buscador-Json\code

# 2. Execute o script de inicialização
.\docker-init.ps1

# 3. Acesse a aplicação
# Frontend: http://localhost:3000
# API: http://localhost:4000
```

### Linux/Mac (Bash)

```bash
# 1. Clone o repositório
git clone <repo-url>
cd Buscador-Json/code

# 2. Torne o script executável
chmod +x docker-init.sh

# 3. Execute o script de inicialização
./docker-init.sh

# 4. Acesse a aplicação
# Frontend: http://localhost:3000
# API: http://localhost:4000
```

### Inicialização Manual

```bash
# Criar diretórios necessários
mkdir -p uploads data

# Copiar arquivo de configuração
cp .env.example .env

# Construir imagens
docker-compose build

# Iniciar serviços
docker-compose up -d

# Verificar status
docker-compose ps
```

---

## ⚙️ Configuração Detalhada

### Arquivo `.env`

Copie `.env.example` para `.env` e ajuste as variáveis:

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

### Dockerfile.frontend

Construção otimizada em 2 estágios:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
# - Instala dependências
# - Executa build Next.js
# - Gera .next otimizado

# Stage 2: Runtime
FROM node:18-alpine
# - Copia apenas arquivos necessários
# - Instala dependências de produção
# - Executa Next.js em modo produção
```

**Características:**
- Build otimizado com cache
- Imagem final reduzida (~200MB)
- Health checks configurados
- Logs estruturados

### Dockerfile.backend

Construção otimizada para Python Flask:

```dockerfile
FROM python:3.11-slim
# - Instala dependências do sistema
# - Instala pacotes Python
# - Copia aplicação Flask
# - Configura health checks
```

**Características:**
- Imagem base mínima (~150MB)
- Gerenciamento automático de uploads
- Health checks HTTP
- WAL mode SQLite habilitado

### docker-compose.yml

Orquestração de serviços:

```yaml
version: '3.9'

services:
  frontend:
    build: Dockerfile.frontend
    ports: [3000:3000]
    depends_on:
      - backend
    healthcheck: curl

  backend:
    build: Dockerfile.backend
    ports: [4000:4000]
    volumes:
      - ./uploads:/app/uploads
      - ./data:/app/data
    healthcheck: http

  sqlite-web:  # (debug profile)
    image: coleifer/sqlite-web:latest
    ports: [8080:8080]
```

---

## 🎮 Gerenciamento de Containers

### Comandos Essenciais

```bash
# Status dos serviços
docker-compose ps

# Visualizar logs
docker-compose logs -f                    # Todos os serviços
docker-compose logs -f backend            # Backend apenas
docker-compose logs -f frontend           # Frontend apenas
docker-compose logs -f --tail=50          # Últimas 50 linhas

# Parar serviços
docker-compose down                       # Parar e remover containers
docker-compose stop                       # Parar sem remover

# Reiniciar serviços
docker-compose restart                    # Reiniciar todos
docker-compose restart backend            # Reiniciar um específico

# Reconstruir imagens
docker-compose build                      # Rebuild (com cache)
docker-compose build --no-cache           # Rebuild completo

# Executar comandos
docker-compose exec backend python -c "import sys; print(sys.version)"
docker-compose exec frontend npm list     # Verificar dependências
```

### Gerenciamento de Volumes

```bash
# Listar volumes
docker volume ls

# Inspetar volume
docker volume inspect buscador-json_uploads

# Remover volumes (CUIDADO - deleta dados!)
docker-compose down -v                    # Remove containers + volumes

# Backup de dados
docker run --rm -v buscador-json_data:/data -v ${PWD}/backup:/backup \
  alpine tar czf /backup/db-backup.tar.gz -C /data .
```

### Debug com sqlite-web

```bash
# Iniciar com profile debug
docker-compose --profile debug up -d

# Acessar em http://localhost:8080

# Parar debug profile
docker-compose --profile debug down
```

---

## 🔍 Troubleshooting

### Problema: "Docker daemon is not running"

**Solução:**
```bash
# Windows: Abra Docker Desktop
# Linux: sudo systemctl start docker
# Mac: Abra Docker.app
```

### Problema: "Port already in use"

**Solução:**
```bash
# Encontrar processo usando a porta
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Mudar porta em docker-compose.yml
# De: ports: ["3000:3000"]
# Para: ports: ["3001:3000"]  # Porta externa diferente
```

### Problema: "Failed to build image"

**Solução:**
```bash
# Limpar cache de build
docker-compose build --no-cache --pull

# Verificar logs de build
docker-compose build --verbose

# Remover imagens danificadas
docker image rm buscador-json_frontend buscador-json_backend
docker-compose build
```

### Problema: "Database locked" (SQLite)

**Solução:**
```bash
# Verificar arquivos de WAL
ls -la data/db.sqlite*

# Remover WAL danificado (CUIDADO!)
rm data/db.sqlite-wal data/db.sqlite-shm

# Reiniciar
docker-compose restart backend
```

### Problema: "Frontend não consegue conectar ao Backend"

**Solução:**
```bash
# Verificar NEXT_PUBLIC_API_URL em .env
# Docker: http://backend:4000
# Local: http://localhost:4000

# Testar conectividade entre containers
docker-compose exec frontend curl http://backend:4000/list

# Verificar logs
docker-compose logs backend
```

---

## 📦 Produção

### Checklist de Deploy

- [ ] Atualizar `.env` com valores de produção
- [ ] Configurar `ALLOWED_ORIGINS` restritivo
- [ ] Usar HTTPS com reverse proxy (nginx)
- [ ] Aumentar limites de recursos (CPU, memória)
- [ ] Configurar persistent volumes externo
- [ ] Habilitar backup automático de BD
- [ ] Usar Docker registry privado (se aplicável)
- [ ] Configurar monitoring (Prometheus/Grafana)
- [ ] Testar disaster recovery

### Configuração de Produção

```yaml
# docker-compose.prod.yml
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
        reservations:
          cpus: '1'
          memory: 256M

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    restart: always
    environment:
      - FLASK_ENV=production
      - FLASK_DEBUG=0
      - DATABASE_URL=sqlite:////data/db.sqlite
    volumes:
      - /data/uploads:/app/uploads
      - /data/db:/app/data
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M
```

### Nginx Reverse Proxy

```nginx
upstream backend {
    server backend:4000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name buscador.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name buscador.example.com;

    ssl_certificate /etc/letsencrypt/live/buscador.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/buscador.example.com/privkey.pem;

    # API
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

### Backup Automático

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DB_PATH="/data/db.sqlite"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

docker-compose exec -T backend python << EOF
import shutil
import os
from datetime import datetime, timedelta

# Backup do banco
shutil.copy2('/app/data/db.sqlite', '/app/data/backups/db_${TIMESTAMP}.sqlite')

# Limpar backups antigos (manter últimos 30 dias)
cutoff = datetime.now() - timedelta(days=30)
for f in os.listdir('/app/data/backups'):
    path = os.path.join('/app/data/backups', f)
    if os.stat(path).st_mtime < cutoff.timestamp():
        os.remove(path)
EOF
```

---

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
- [Flask Docker Best Practices](https://flask.palletsprojects.com/en/2.3.x/deploying/)
- [SQLite Best Practices](https://www.sqlite.org/bestpractice.html)

---

## 📞 Suporte

Para problemas ou dúvidas:

1. Verificar logs: `docker-compose logs -f`
2. Verificar status: `docker-compose ps`
3. Consultar [Troubleshooting](#troubleshooting)
4. Abrir issue no repositório

---

**Última atualização:** 2024
**Status:** ✅ Production Ready
