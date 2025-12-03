# Dockerfile para Buscador-Json (Next.js + Python)

# Imagem base com Node.js e Python
FROM node:20-bullseye

# Instala Python 3 e pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Instala pnpm globalmente
RUN npm install -g pnpm

# Diretório de trabalho
WORKDIR /app

# Copia arquivos do projeto
COPY code/ ./

# Instala dependências Node.js
RUN pnpm install --legacy-peer-deps

# Instala dependências Python
# Gera requirements.txt se não existir
RUN if [ ! -f requirements.txt ]; then \
      grep -Eo 'import ([a-zA-Z0-9_]+)' server_api.py server.py | awk '{print $2}' | sort | uniq > requirements.txt; \
    fi
RUN python3 -m venv .venv && \
    . .venv/bin/activate && \
    pip install --upgrade pip && \
    pip install -r requirements.txt

# Expor portas (Next.js: 3000, Flask: 4000)
EXPOSE 3000
EXPOSE 4000

# Comando de inicialização
CMD ["bash", "start_server.sh"]
