#!/usr/bin/env python3
"""
recover.py - Script para recriar o banco de dados a partir dos arquivos em uploads/

Este script:
1. Recria o banco de dados do zero usando o schema do server_api.py
2. Processa cada arquivo .json.gz em uploads/ e re-insere no banco
"""

import os
import sqlite3
import hashlib
import gzip
import datetime
from pathlib import Path


BASE = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE / "uploads"
DB_PATH = BASE / "db.sqlite"

# Garante que uploads/ existe
UPLOAD_DIR.mkdir(exist_ok=True)

def init_db() -> None:
    """Recria o banco do zero com o schema correto."""
    print(f"Criando novo banco em {DB_PATH}")
    
    # Remove banco antigo e arquivos WAL/SHM se existirem
    for f in [DB_PATH, DB_PATH.with_suffix('.sqlite-wal'), DB_PATH.with_suffix('.sqlite-shm')]:
        try:
            if f.exists():
                f.unlink()
                print(f"Removido {f}")
        except Exception as e:
            print(f"Aviso: não foi possível remover {f}: {e}")
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Configura WAL mode e sync normal
    cur.execute("PRAGMA journal_mode=WAL;")
    cur.execute("PRAGMA synchronous=NORMAL;")
    
    # Cria tabela sources
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            filename TEXT,
            size INTEGER,
            sha256 TEXT,
            meta TEXT,
            created_at TEXT
        )
        """
    )
    conn.commit()
    conn.close()
    print("Schema do banco recriado com sucesso")


def calc_sha256(file_path: Path) -> tuple[int, str]:
    """Calcula SHA256 e tamanho de um arquivo."""
    hasher = hashlib.sha256()
    size = 0
    chunk_size = 64 * 1024
    
    if str(file_path).endswith('.gz'):
        with gzip.open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
                size += len(chunk)
    else:
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
                size += len(chunk)
    
    return size, hasher.hexdigest()


def process_uploads() -> None:
    """Processa cada arquivo em uploads/ e insere no banco."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print(f"\nProcessando arquivos em {UPLOAD_DIR}")
    
    for filename in os.listdir(UPLOAD_DIR):
        if not (filename.endswith('.json') or filename.endswith('.json.gz')):
            continue
            
        file_path = UPLOAD_DIR / filename
        try:
            size, sha = calc_sha256(file_path)
            name = f"recovered-{filename}"
            created_at = datetime.datetime.fromtimestamp(
                os.path.getctime(file_path)
            ).isoformat()
            
            # Insere ou atualiza registro
            cur.execute(
                """
                INSERT INTO sources 
                    (name, filename, size, sha256, created_at)
                VALUES 
                    (?, ?, ?, ?, ?)
                """,
                (name, filename, size, sha, created_at)
            )
            print(f"Processado {filename} ({size} bytes)")
            
        except Exception as e:
            print(f"Erro processando {filename}: {e}")
            continue
    
    conn.commit()
    
    # Verifica totais
    cur.execute("SELECT COUNT(*), SUM(size) FROM sources")
    count, total_size = cur.fetchone()
    print(f"\nResumo:")
    print(f"- {count} arquivos processados")
    print(f"- {total_size or 0:,} bytes total")
    
    conn.close()


def main():
    """Função principal."""
    print("Iniciando recuperação do banco de dados\n")
    
    # Recria o banco
    init_db()
    
    # Processa uploads/
    process_uploads()
    
    print("\nRecuperação concluída!")
    

if __name__ == "__main__":
    main()