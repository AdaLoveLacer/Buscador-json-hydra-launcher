
from __future__ import annotations

#!/usr/bin/env python3
import os

# Função para remover uploads antigos
def remove_old_uploads():
    old_files = [
        "1762527080-cfac667a6271.json.gz",
        "1762527081-6c3078bb2b68.json.gz",
        "1762527082-bd3711116466.json.gz",
        "1762528125-a0851c648b99.json.gz",
        "1762529022-e6fb62609c08.json.gz",
        "1762530129-91b6c76bb192.json.gz",
        "1762530530-c47cbe6e35c8.json.gz",
        "1762534441-89f9d83984b5.json.gz",
    ]
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    for fname in old_files:
        fpath = os.path.join(uploads_dir, fname)
        if os.path.exists(fpath):
            try:
                os.remove(fpath)
                print(f"Removido: {fpath}")
            except Exception as e:
                print(f"Erro ao remover {fpath}: {e}")

"""
server.py - Wrapper para iniciar o ambiente de desenvolvimento

Este script oferece um ambiente de desenvolvimento integrado para o projeto:
1. Verifica e configura automaticamente o ambiente Python e Node.js
2. Detecta e utiliza o gerenciador de pacotes disponível (pnpm > npm > yarn)
3. Tenta iniciar o backend (server_api.run_servers) e, em fallback, inicia apenas o frontend Next.js
4. Gerencia dependências e abre o navegador automaticamente

Uso:
    python server.py         # modo desenvolvimento
    python server.py --mode start  # modo produção
"""
import json
import subprocess
import sys
import time
import webbrowser
import signal
from pathlib import Path
from shutil import which

# Configurações
PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_URL = "http://localhost:3000"


def find_package_manager() -> tuple[str, str]:
    for pm in ["pnpm", "npm", "yarn"]:
        path = which(pm)
        if path:
            return path, pm
    return "", ""


def read_package_json() -> dict | None:
    try:
        pj = PROJECT_DIR / "package.json"
        if not pj.exists():
            return None
        return json.loads(pj.read_text(encoding="utf-8"))
    except Exception as e:
        print("Erro ao ler package.json:", e)
        return None


def run_command(cmd: list[str], cwd: Path | str = PROJECT_DIR) -> int:
    print("Executando:", " ".join(cmd))
    proc = subprocess.Popen(cmd, cwd=str(cwd))
    proc.wait()
    return proc.returncode


def start_server_process(cmd: list[str], cwd: Path | str = PROJECT_DIR) -> subprocess.Popen:
    proc = subprocess.Popen(cmd, cwd=str(cwd), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    def forward():
        assert proc.stdout is not None
        for line in proc.stdout:
            print(line, end="")

    from threading import Thread
    Thread(target=forward, daemon=True).start()
    return proc


def ensure_node_environment(pkg_path: str, pkg_name: str) -> bool:
    node_modules = PROJECT_DIR / "node_modules"
    if not node_modules.exists():
        print(f"Instalando dependências com {pkg_name}...")
        if run_command([pkg_path, "install"]) != 0:
            if pkg_name == "npm":
                print("npm install falhou; tentando com --legacy-peer-deps")
                return run_command([pkg_path, "install", "--legacy-peer-deps"]) == 0
            return False
    return True


def main() -> int:
    mode = "dev"
    if "--mode" in sys.argv:
        idx = sys.argv.index("--mode")
        if idx + 1 < len(sys.argv):
            mode = sys.argv[idx + 1]

    # Verifica Node.js
    if not which("node"):
        print("ERRO: Node.js não encontrado no PATH. Instale Node.js em https://nodejs.org/")
        return 1

    pkg_path, pkg_name = find_package_manager()
    if not pkg_path:
        print("ERRO: Nenhum gerenciador de pacotes (pnpm/npm/yarn) encontrado no PATH.")
        return 1

    # instala dependências Python necessárias (flask para server_api)
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "flask", "flask-cors"], check=True)
    except Exception as e:
        print("Falha ao instalar dependências Python:", e)
        return 1

    if not ensure_node_environment(pkg_path, pkg_name):
        print("Falha ao instalar dependências Node")
        return 1

    pkg = read_package_json() or {}
    scripts = pkg.get("scripts", {})
    script = mode if mode in scripts else ("dev" if "dev" in scripts else "start")

    # Tenta usar server_api.run_servers() — é o comportamento desejado quando disponível
    try:
        import server_api
        print("Chamando server_api.run_servers()...")
        server_api.run_servers()
        return 0
    except Exception as e:
        print("server_api.run_servers() não disponível ou falhou:", e)
        print("Fazendo fallback para iniciar apenas o frontend com", pkg_name)

    # Fallback: iniciar apenas frontend
    if pkg_name == "npm":
        cmd = [pkg_path, "run", script]
    else:
        cmd = [pkg_path, script]

    proc = start_server_process(cmd)

    # Abrir o navegador depois de um pequeno atraso
    try:
        time.sleep(3)
        webbrowser.open(DEFAULT_URL)
    except Exception:
        pass

    try:
        rc = proc.wait()
        return rc or 0
    except KeyboardInterrupt:
        try:
            proc.terminate()
        except Exception:
            pass
        return 0


if __name__ == "__main__":
    remove_old_uploads()
    raise SystemExit(main())
