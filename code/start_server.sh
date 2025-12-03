#!/bin/bash
# Arquivo de atalho para rodar o servidor Python que inicia o Next.js
# Este .sh cria (se necessário) uma virtualenv em .venv, ativa e executa o servidor Python (server_api.py)
# Execute este script via terminal: bash start_server.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/"

# Criar virtualenv em .venv se não existir
if [ ! -f "${SCRIPT_DIR}.venv/bin/python" ]; then
    echo "Criando virtualenv em .venv..."
    python3 -m venv "${SCRIPT_DIR}.venv"
    if [ $? -ne 0 ]; then
        echo "Falha ao criar virtualenv. Verifique se o Python 3 está instalado e no PATH."
        read -n 1 -s -r -p "Pressione qualquer tecla para sair..."
        exit 1
    fi
fi

# Ativar a virtualenv
source "${SCRIPT_DIR}.venv/bin/activate"

# Se existir um wrapper 'server.py' (inicia Next.js), prefira executá-lo; caso contrário execute 'server_api.py'.
if [ -f "${SCRIPT_DIR}server.py" ]; then
    echo "Encontrado server.py - executando wrapper do Next.js"
    python "${SCRIPT_DIR}server.py" "$@"
else
    echo "server.py nao encontrado - executando server_api.py (API Flask)"
    python "${SCRIPT_DIR}server_api.py" "$@"
fi

echo
read -n 1 -s -r -p "Pressione qualquer tecla para fechar..."
