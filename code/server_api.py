#!/usr/bin/env python3
"""
server_api.py

Pequena API HTTP para armazenar grandes arquivos JSON no servidor em disco
e registrar metadados no SQLite. Endpoints:

- POST /upload  -> aceita multipart/form-data com campo 'file' e opcional 'name'
- GET  /download/<id> -> faz download do arquivo (arquivo gzip salvo)
- GET  /list -> lista metadados (id, name, size, sha256, created_at)
- DELETE /delete/<id> -> remove registro e arquivo associado

Uso (dev):
  pip install flask flask-cors
  python server_api.py

Observações:
- Os arquivos são salvos em uploads/ como <timestamp>-<rand>.json.gz (compressão gzip por padrão).
- O conteúdo é lido em streaming (chunks) para não alocar tudo na memória.
- O SHA256 é calculado sobre o conteúdo original (bytes lidos do upload).
"""

from __future__ import annotations

import os
import sqlite3
import hashlib
import gzip
import datetime
import json
import io
import secrets
import bcrypt
from functools import wraps
from pathlib import Path
from typing import Tuple, Generator, Optional, Dict, Any, Callable
from collections import defaultdict
from time import time

from flask import Flask, request, jsonify, send_file, abort, Response, stream_with_context
from flask_cors import CORS

# BUG #5.2: Importar env_loader para validação de variáveis de ambiente
try:
    from env_loader import load_env, get_env, validate_production
except ImportError:
    print("⚠️  env_loader não encontrado - usando variáveis do sistema")
    load_env = lambda: True  # type: ignore
    get_env = lambda var, default=None: os.getenv(var, default or "")  # type: ignore
    validate_production = lambda: True  # type: ignore


BASE = Path(__file__).resolve().parent
UPLOAD_DIR = BASE / "uploads"
DB_PATH = BASE / "db.sqlite"
UPLOAD_DIR.mkdir(exist_ok=True)

# BUG #5.2: Carregar e validar variáveis de ambiente na inicialização
if not load_env():  # type: ignore
    print("❌ ERRO: Falha ao carregar variáveis de ambiente!")
    exit(1)

CHUNK_SIZE = 64 * 1024

# Security: Limites de upload
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", 100 * 1024 * 1024))  # 100MB padrão
ALLOWED_CONTENT_TYPES = {"application/json", "application/octet-stream"}  # JSON ou binário
ALLOWED_FILE_EXTENSIONS = {".json", ".json.gz"}

# BUG #4.4: Rate Limiting - Proteção contra abuso/DDoS
RATE_LIMIT_REQUESTS = 100  # requisições por janela
RATE_LIMIT_WINDOW = 60  # segundos (janela deslizante)
RATE_LIMIT_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB por minuto por IP
RATE_LIMIT_UPLOAD_WINDOW = 60  # segundos

# Rastreamento de requisições por IP (BUG #4.4)
request_history: Dict[str, list] = defaultdict(list)
upload_size_history: Dict[str, list] = defaultdict(list)

# JSON Validation: Limites de estrutura
MAX_JSON_DEPTH = 50  # Máxima profundidade de objetos aninhados
MAX_JSON_KEYS = 10000  # Máximo de chaves totais
MAX_STRING_LENGTH = 1024 * 1024  # 1MB por string


def init_db() -> None:
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL;")
    cur.execute("PRAGMA synchronous=NORMAL;")
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
    # BUG #4.3: Tabela de API Keys para autenticação
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            key_hash TEXT NOT NULL,
            created_at TEXT,
            last_used TEXT,
            is_active BOOLEAN DEFAULT 1
        )
        """
    )
    
    # BUG #4.1: ÍNDICES PARA PERFORMANCE
    # Índices em sources (tabela principal com 100k+ registros potenciais)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_sources_sha256 ON sources(sha256)"
    )  # Para deduplicação de uploads (linha 580)
    
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_sources_created_at ON sources(created_at DESC)"
    )  # Para ordenação por data (linha 638)
    
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_sources_size ON sources(size)"
    )  # Para filtros por tamanho (linha 640)
    
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_sources_name ON sources(name)"
    )  # Para busca por nome (linha 643)
    
    # Índices em api_keys (tabela de autenticação)
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)"
    )  # Para validação de keys (linha 301)
    
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active)"
    )  # Para filtro de keys ativas (linha 300)
    
    conn.commit()
    conn.close()


def save_stream_to_file(file_stream, dest_path: Path, compress: bool = True) -> Tuple[int, str]:
    """Grava o stream para arquivo no disco (gzip opcional) e retorna (bytes_written, sha256)."""
    hasher = hashlib.sha256()
    written = 0
    temp_path = dest_path.with_suffix(dest_path.suffix + ".tmp")

    if compress:
        with gzip.open(temp_path, "wb") as f:
            while True:
                chunk = file_stream.read(CHUNK_SIZE)
                if not chunk:
                    break
                # chunk é bytes
                f.write(chunk)
                hasher.update(chunk)
                written += len(chunk)
    else:
        with open(temp_path, "wb") as f:
            while True:
                chunk = file_stream.read(CHUNK_SIZE)
                if not chunk:
                    break
                f.write(chunk)
                hasher.update(chunk)
                written += len(chunk)

    # atomic replace
    os.replace(str(temp_path), str(dest_path))
    return written, hasher.hexdigest()


app = Flask(__name__)

# Restringir CORS apenas a origins confiáveis
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else [
    "http://localhost:3000",
    "http://localhost:4000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:4000",
]

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Content-Length"],
        "max_age": 3600,
        "supports_credentials": True
    }
})


def validate_json_structure(data: Any, depth: int = 0, key_count: int = 0) -> Tuple[bool, Optional[str]]:
    """
    Validar estrutura JSON contra DoS e exploits.
    
    Retorna: (is_valid, error_message)
    """
    # Verificar profundidade (prevent stack overflow)
    if depth > MAX_JSON_DEPTH:
        return False, f"JSON depth exceeds maximum ({MAX_JSON_DEPTH})"
    
    # Verificar tipo de dado
    if isinstance(data, dict):
        for key, value in data.items():
            # Validar tamanho da chave
            if len(str(key)) > MAX_STRING_LENGTH:
                return False, "JSON key exceeds maximum length"
            
            # Contar chaves
            key_count += 1
            if key_count > MAX_JSON_KEYS:
                return False, f"JSON key count exceeds maximum ({MAX_JSON_KEYS})"
            
            # Recursivamente validar valores
            is_valid, error = validate_json_structure(value, depth + 1, key_count)
            if not is_valid:
                return False, error
    
    elif isinstance(data, list):
        # Verificar tamanho da lista
        if len(data) > MAX_JSON_KEYS:
            return False, f"JSON array size exceeds maximum ({MAX_JSON_KEYS})"
        
        for item in data:
            # Recursivamente validar itens
            is_valid, error = validate_json_structure(item, depth + 1, key_count)
            if not is_valid:
                return False, error
    
    elif isinstance(data, str):
        # Verificar tamanho de string
        if len(data) > MAX_STRING_LENGTH:
            return False, "JSON string value exceeds maximum length"
    
    elif isinstance(data, (int, float, bool, type(None))):
        # Tipos primitivos são válidos
        pass
    else:
        return False, f"Unsupported JSON type: {type(data).__name__}"
    
    return True, None


def parse_and_validate_json(file_stream, max_size: Optional[int] = None) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Ler e validar conteúdo JSON do stream.
    
    Retorna: (is_valid, parsed_data, error_message)
    """
    if max_size is None:
        max_size = MAX_UPLOAD_SIZE
    
    try:
        # Ler todo o conteúdo (com limite de tamanho)
        content = b""
        bytes_read = 0
        
        while True:
            chunk = file_stream.read(CHUNK_SIZE)
            if not chunk:
                break
            
            bytes_read += len(chunk)
            if bytes_read > max_size:
                return False, None, f"JSON content exceeds maximum size ({max_size} bytes)"
            
            content += chunk
        
        # Validar que temos conteúdo
        if not content:
            return False, None, "Empty JSON file"
        
        # Tentar decodificar como string
        try:
            json_str = content.decode("utf-8")
        except UnicodeDecodeError:
            return False, None, "Invalid UTF-8 encoding in JSON file"
        
        # Tentar parsear JSON
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as e:
            return False, None, f"Invalid JSON: {e.msg} at line {e.lineno}, col {e.colno}"
        except Exception as e:
            return False, None, f"JSON parsing error: {str(e)}"
        
        # Validar estrutura JSON
        is_valid, error = validate_json_structure(data)
        if not is_valid:
            return False, None, error
        
        return True, data, None
    
    except Exception as e:
        app.logger.exception("Unexpected error during JSON validation")
        return False, None, f"Unexpected error: {str(e)}"


# BUG #4.3: AUTENTICAÇÃO COM API KEYS

def generate_api_key() -> str:
    """Gera uma chave aleatória segura (32 caracteres URL-safe)."""
    return secrets.token_urlsafe(32)


def hash_api_key(key: str) -> str:
    """Faz hash da chave usando bcrypt."""
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(key.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_api_key(plain_key: str, hash_key: str) -> bool:
    """Verifica se a chave corresponde ao hash."""
    try:
        return bcrypt.checkpw(plain_key.encode("utf-8"), hash_key.encode("utf-8"))
    except Exception:
        return False


def get_api_key_from_request() -> Optional[str]:
    """Extrai a API key do header X-API-Key."""
    return request.headers.get("X-API-Key") or request.args.get("api_key")


def validate_api_key(key: Optional[str]) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Valida a API key contra o banco de dados.
    
    Retorna: (is_valid, key_info_dict)
    """
    if not key:
        return False, None
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        # Buscar todos os hashes de keys ativas
        cur.execute(
            """
            SELECT id, name, key_hash, is_active, last_used
            FROM api_keys
            WHERE is_active = 1
            """
        )
        rows = cur.fetchall()
        
        for row in rows:
            key_id, key_name, key_hash, is_active, last_used = row
            if verify_api_key(key, key_hash):
                # Atualizar last_used
                cur.execute(
                    "UPDATE api_keys SET last_used = ? WHERE id = ?",
                    (datetime.datetime.utcnow().isoformat(), key_id)
                )
                conn.commit()
                conn.close()
                
                app.logger.info(f"API key validated: {key_name}")
                return True, {
                    "id": key_id,
                    "name": key_name,
                    "last_used": last_used
                }
        
        conn.close()
        app.logger.warning(f"API key validation failed: invalid key")
        return False, None
    
    except Exception as e:
        conn.close()
        app.logger.exception(f"Error validating API key: {e}")
        return False, None


def require_api_key(f: Callable) -> Callable:
    """
    Decorator para proteger endpoints que exigem autenticação por API key.
    
    Retorna 401 Unauthorized se não houver key.
    Retorna 403 Forbidden se a key for inválida.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        key = get_api_key_from_request()
        is_valid, key_info = validate_api_key(key)
        
        if not is_valid:
            if not key:
                app.logger.warning(f"Request without API key from {request.remote_addr}")
                return jsonify({"error": "missing API key"}), 401
            else:
                app.logger.warning(f"Invalid API key from {request.remote_addr}")
                return jsonify({"error": "invalid API key"}), 403
        
        # Injetar info da key nas kwargs
        kwargs['api_key_info'] = key_info
        return f(*args, **kwargs)
    
    return decorated


# FIM BUG #4.3


# BUG #4.4: RATE LIMITING - PROTEÇÃO CONTRA ABUSO/DDoS

def check_rate_limit(ip: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Verifica se o IP excedeu o rate limit de requisições.
    
    Retorna: (is_allowed, error_info)
    """
    current_time = time()
    
    # Limpar requisições fora da janela
    if ip in request_history:
        request_history[ip] = [
            t for t in request_history[ip] 
            if current_time - t < RATE_LIMIT_WINDOW
        ]
    
    # Verificar se excedeu o limite
    if len(request_history[ip]) >= RATE_LIMIT_REQUESTS:
        return False, {
            "error": "rate limit exceeded",
            "limit": RATE_LIMIT_REQUESTS,
            "window": RATE_LIMIT_WINDOW,
            "current": len(request_history[ip])
        }
    
    # Registrar requisição
    request_history[ip].append(current_time)
    return True, None


def check_upload_size_limit(ip: str, size: int) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Verifica se o IP não excedeu o limite de dados uploadados.
    
    Retorna: (is_allowed, error_info)
    """
    current_time = time()
    
    # Limpar uploads fora da janela
    if ip in upload_size_history:
        upload_size_history[ip] = [
            (t, s) for t, s in upload_size_history[ip]
            if current_time - t < RATE_LIMIT_UPLOAD_WINDOW
        ]
    
    # Calcular total de bytes nesta janela
    total_bytes = sum(s for _, s in upload_size_history[ip])
    
    # Verificar se excederia o limite
    if total_bytes + size > RATE_LIMIT_UPLOAD_SIZE:
        return False, {
            "error": "upload size limit exceeded",
            "limit": RATE_LIMIT_UPLOAD_SIZE,
            "window": RATE_LIMIT_UPLOAD_WINDOW,
            "current": total_bytes,
            "requested": size
        }
    
    # Registrar upload
    upload_size_history[ip].append((current_time, size))
    return True, None


def rate_limit(f: Callable) -> Callable:
    """
    Decorator para rate limiting por IP.
    
    Retorna 429 Too Many Requests se o limite foi excedido.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        ip = request.remote_addr or "unknown"
        
        # Verificar rate limit geral
        is_allowed, error_info = check_rate_limit(ip)
        if not is_allowed:
            app.logger.warning(f"Rate limit exceeded for IP {ip}")
            return jsonify(error_info), 429
        
        # Verificar limite de tamanho de upload (apenas para POST)
        if request.method == "POST":
            content_length = request.content_length or 0
            is_allowed, error_info = check_upload_size_limit(ip, content_length)
            if not is_allowed:
                app.logger.warning(f"Upload size limit exceeded for IP {ip}: {content_length}")
                return jsonify(error_info), 429
        
        return f(*args, **kwargs)
    
    return decorated


# FIM BUG #4.4


# Retornar erros como JSON para clientes XHR/fetch em vez do HTML padrão do Flask
@app.errorhandler(404)
def handle_404(error):
    return jsonify({"error": "not found"}), 404


@app.errorhandler(500)
def handle_500(error):
    # Em produção, não expor detalhes do erro - aqui logamos e retornamos uma mensagem genérica
    app.logger.exception('internal server error')
    return jsonify({"error": "internal server error"}), 500


@app.route("/upload", methods=["POST"])
@rate_limit
@require_api_key
def upload(api_key_info=None):
    # espera multipart/form-data com campo 'file' e opcional 'name'
    if "file" not in request.files:
        return jsonify({"error": "missing file"}), 400

    f = request.files["file"]
    
    # Security: Validar se arquivo foi fornecido
    if not f or not f.filename or f.filename == "":
        return jsonify({"error": "empty file"}), 400
    
    # Security: Validar extensão do arquivo
    file_ext = Path(f.filename).suffix.lower()
    if file_ext not in ALLOWED_FILE_EXTENSIONS:
        return jsonify({"error": f"invalid file extension, allowed: {', '.join(ALLOWED_FILE_EXTENSIONS)}"}), 400
    
    # Security: Validar Content-Type
    content_type = request.headers.get("Content-Type", "").split(";")[0].lower()
    if f.content_type and f.content_type not in ALLOWED_CONTENT_TYPES and "multipart" not in content_type:
        return jsonify({"error": f"invalid content type, allowed: {', '.join(ALLOWED_CONTENT_TYPES)}"}), 400
    
    # Security: Validar tamanho do arquivo (content-length header)
    content_length = request.content_length
    if content_length and content_length > MAX_UPLOAD_SIZE:
        return jsonify({"error": f"file too large (max {MAX_UPLOAD_SIZE} bytes)"}), 413
    
    name = request.form.get("name") or f.filename or f"source-{int(datetime.datetime.utcnow().timestamp())}"
    compress = request.form.get("compress", "1") not in ("0", "false", "False")
    skip_validation = request.form.get("skip_validation", "0") in ("1", "true", "True")

    # JSON Validation: Validar conteúdo JSON se não foi skipado
    if not skip_validation and f.filename and f.filename.endswith(".json"):
        # Ler stream em buffer para validação
        file_bytes = f.stream.read()
        f.stream = io.BytesIO(file_bytes)  # Reset stream para reutilização
        
        # Validar conteúdo JSON
        is_valid, _, error_msg = parse_and_validate_json(io.BytesIO(file_bytes), max_size=MAX_UPLOAD_SIZE)
        if not is_valid:
            app.logger.warning(f"JSON validation failed for {f.filename}: {error_msg}")
            return jsonify({"error": "invalid JSON content", "detail": error_msg}), 400

    # filename: timestamp-rand.json.gz
    suffix = ".json.gz" if compress else ".json"
    filename = f"{int(datetime.datetime.utcnow().timestamp())}-{os.urandom(6).hex()}{suffix}"
    dest_path = UPLOAD_DIR / filename

    try:
        written, sha = save_stream_to_file(f.stream, dest_path, compress=compress)
    except Exception as e:
        app.logger.exception("save_stream_to_file failed")
        return jsonify({"error": "failed to save file", "detail": str(e)}), 500
    
    # Security: Validar que arquivo não excedeu tamanho máximo durante processamento
    if written > MAX_UPLOAD_SIZE:
        try:
            if dest_path.exists():
                dest_path.unlink()
        except Exception:
            app.logger.exception('failed to remove oversized file %s', dest_path)
        return jsonify({"error": f"file too large after processing (max {MAX_UPLOAD_SIZE} bytes)"}), 413

    # If a file with the same sha256 already exists in DB, delete the just-written
    # file and return the existing id to avoid duplicate stored blobs.
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, filename FROM sources WHERE sha256 = ?", (sha,))
    existing = cur.fetchone()
    if existing:
        existing_id, existing_filename = existing[0], existing[1]
        try:
            # remove the newly written duplicate file
            if dest_path.exists():
                dest_path.unlink()
        except Exception:
            app.logger.exception('failed to remove duplicate upload file %s', dest_path)
        # Log duplicate upload event for observability
        app.logger.info('duplicate upload detected: sha=%s existing_id=%s client=%s filename=%s', sha, existing_id, request.remote_addr, f'{dest_path.name}')
        conn.close()
        return jsonify({"id": existing_id, "name": name, "filename": existing_filename, "size": written, "sha256": sha, "note": "duplicate"}), 200

    # gravar metadados no sqlite
    cur.execute(
        "INSERT INTO sources (name, filename, size, sha256, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (name, filename, written, sha, None, datetime.datetime.utcnow().isoformat()),
    )
    conn.commit()
    id_ = cur.lastrowid
    conn.close()


    app.logger.info('upload stored: id=%s filename=%s size=%s sha=%s client=%s', id_, filename, written, sha, request.remote_addr)

    # Limitar a pasta uploads para os 5 arquivos .json.gz mais recentes
    try:
        gz_files = sorted(
            [f for f in os.listdir(UPLOAD_DIR) if f.endswith('.json.gz')],
            key=lambda f: os.path.getmtime(os.path.join(UPLOAD_DIR, f)),
            reverse=True
        )
        for old_file in gz_files[5:]:
            try:
                os.remove(os.path.join(UPLOAD_DIR, old_file))
                app.logger.info(f'Removido arquivo antigo: {old_file}')
            except Exception as e:
                app.logger.warning(f'Erro ao remover {old_file}: {e}')
    except Exception as e:
        app.logger.warning(f'Erro ao limitar arquivos uploads: {e}')

    return jsonify({"id": id_, "name": name, "filename": filename, "size": written, "sha256": sha}), 201


@app.route("/download/<int:id_>", methods=["GET"])
@rate_limit
@require_api_key
def download(id_, api_key_info=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT filename FROM sources WHERE id = ?", (id_,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return abort(404)
    file_path = UPLOAD_DIR / row[0]
    if not file_path.exists():
        return abort(404)
    # Serve file as attachment
    return send_file(str(file_path), as_attachment=True, download_name=row[0])


@app.route("/list", methods=["GET"])
@rate_limit
@require_api_key
def list_sources(api_key_info=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, name, filename, size, sha256, created_at FROM sources ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    items = [
        {"id": r[0], "name": r[1], "filename": r[2], "size": r[3], "sha256": r[4], "created_at": r[5]}
        for r in rows
    ]
    return jsonify(items)


@app.route("/delete/<int:id_>", methods=["DELETE"])
@rate_limit
@require_api_key
def delete_source(id_, api_key_info=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT filename FROM sources WHERE id = ?", (id_,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "not found"}), 404
    filename = row[0]
    cur.execute("DELETE FROM sources WHERE id = ?", (id_,))
    conn.commit()
    conn.close()

    try:
        p = UPLOAD_DIR / filename
        if p.exists():
            p.unlink()
    except Exception as e:
        app.logger.warning("failed to delete file %s: %s", filename, e)

    return jsonify({"deleted": id_})


@app.route("/json/<int:id_>", methods=["GET"])
@rate_limit
@require_api_key
def get_json(id_, api_key_info=None):
    """Retorna o conteúdo JSON descomprimido para o registro `id_`.
    Faz streaming da descompressão para não carregar todo o arquivo na memória.
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT filename FROM sources WHERE id = ?", (id_,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return abort(404)

    file_path = UPLOAD_DIR / row[0]
    if not file_path.exists():
        return abort(404)

    def read_file_chunks() -> Generator[bytes, None, None]:
        """Generator function that yields bytes chunks from the file."""
        try:
            # Se o arquivo estiver comprimido (.gz), abra com gzip e leia em chunks
            opener = gzip.open if str(file_path).endswith('.gz') else open
            with opener(file_path, 'rb') as f:
                while True:
                    raw_chunk = f.read(CHUNK_SIZE)
                    if not raw_chunk:
                        break
                    # Garante que estamos sempre retornando bytes
                    if isinstance(raw_chunk, str):
                        chunk = raw_chunk.encode('utf-8')
                    else:
                        chunk = raw_chunk
                    yield chunk
        except Exception:
            app.logger.exception('error streaming json for id=%s', id_)
            yield b''

    # Stream the JSON bytes and set application/json content type 
    chunks = read_file_chunks()
    return Response(chunks, mimetype='application/json')


# BUG #4.3: ENDPOINTS DE ADMIN PARA GERENCIAR API KEYS

@app.route("/admin/keys", methods=["POST"])
def admin_create_key():
    """
    Criar uma nova API key.
    
    Body: {"name": "key_name"}
    Retorna: {"name": "key_name", "key": "token_urlsafe_32"}
    """
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    
    if not name:
        return jsonify({"error": "missing key name"}), 400
    
    if len(name) < 3 or len(name) > 50:
        return jsonify({"error": "key name must be 3-50 characters"}), 400
    
    # Gerar nova key
    plain_key = generate_api_key()
    hashed_key = hash_api_key(plain_key)
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            INSERT INTO api_keys (name, key_hash, created_at, is_active)
            VALUES (?, ?, ?, 1)
            """,
            (name, hashed_key, datetime.datetime.utcnow().isoformat())
        )
        conn.commit()
        key_id = cur.lastrowid
        conn.close()
        
        app.logger.info(f"API key created: {name} (ID: {key_id})")
        
        return jsonify({
            "id": key_id,
            "name": name,
            "key": plain_key,
            "note": "Keep this key safe! You will not be able to see it again."
        }), 201
    
    except sqlite3.IntegrityError:
        conn.close()
        app.logger.warning(f"API key name already exists: {name}")
        return jsonify({"error": "key name already exists"}), 409
    
    except Exception as e:
        conn.close()
        app.logger.exception(f"Error creating API key: {e}")
        return jsonify({"error": "failed to create key"}), 500


@app.route("/admin/keys", methods=["GET"])
def admin_list_keys():
    """
    Listar todas as API keys (sem mostrar os hashes).
    
    Retorna: [{"id": 1, "name": "key_name", "created_at": "...", "last_used": "...", "is_active": true}]
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        cur.execute(
            """
            SELECT id, name, created_at, last_used, is_active
            FROM api_keys
            ORDER BY created_at DESC
            """
        )
        rows = cur.fetchall()
        conn.close()
        
        keys = [
            {
                "id": r[0],
                "name": r[1],
                "created_at": r[2],
                "last_used": r[3],
                "is_active": bool(r[4])
            }
            for r in rows
        ]
        
        return jsonify(keys), 200
    
    except Exception as e:
        conn.close()
        app.logger.exception(f"Error listing API keys: {e}")
        return jsonify({"error": "failed to list keys"}), 500


@app.route("/admin/keys/<int:key_id>", methods=["DELETE"])
def admin_delete_key(key_id):
    """
    Deletar (desativar) uma API key pelo ID.
    
    Retorna: {"deleted": true}
    """
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        # Verifica se existe
        cur.execute("SELECT name FROM api_keys WHERE id = ?", (key_id,))
        row = cur.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"error": "key not found"}), 404
        
        key_name = row[0]
        
        # Marca como inativa ao invés de deletar (soft delete para auditoria)
        cur.execute("UPDATE api_keys SET is_active = 0 WHERE id = ?", (key_id,))
        conn.commit()
        conn.close()
        
        app.logger.info(f"API key deactivated: {key_name} (ID: {key_id})")
        
        return jsonify({"deleted": True, "key_id": key_id}), 200
    
    except Exception as e:
        conn.close()
        app.logger.exception(f"Error deleting API key: {e}")
        return jsonify({"error": "failed to delete key"}), 500


# FIM BUG #4.3


# BUG #4.1: ANÁLISE DE ÍNDICES E PERFORMANCE

def analyze_database_performance() -> Dict[str, Any]:
    """
    Analisa a performance do banco de dados e índices.
    
    Retorna informações sobre índices criados, tamanho do DB, etc.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        # Listar todos os índices
        cur.execute(
            """
            SELECT name, tbl_name, sql
            FROM sqlite_master
            WHERE type='index' AND sql IS NOT NULL
            """
        )
        indexes = cur.fetchall()
        
        # Contar registros por tabela
        cur.execute("SELECT COUNT(*) FROM sources")
        sources_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM api_keys")
        api_keys_count = cur.fetchone()[0]
        
        # Tamanho do banco
        db_size = DB_PATH.stat().st_size if DB_PATH.exists() else 0
        
        conn.close()
        
        return {
            "indexes": [{"name": idx[0], "table": idx[1], "sql": idx[2]} for idx in indexes],
            "sources_count": sources_count,
            "api_keys_count": api_keys_count,
            "db_size_mb": round(db_size / (1024 * 1024), 2),
            "indexes_count": len(indexes)
        }
    except Exception as e:
        app.logger.exception(f"Error analyzing database performance: {e}")
        return {"error": str(e)}


@app.route("/admin/db-stats", methods=["GET"])
@rate_limit
@require_api_key
def get_db_stats(api_key_info=None):
    """
    Retorna estatísticas de performance do banco de dados (BUG #4.1).
    
    Endpoint útil para monitoramento e otimização.
    """
    stats = analyze_database_performance()
    return jsonify(stats), 200


# BUG #5.3: Health Checks Avançados
# ═══════════════════════════════════════════════════════════════════════════

def get_health_status() -> Dict[str, Any]:
    """
    Verifica saúde de todos os componentes do sistema.
    
    Retorna:
        dict: Status de cada componente (database, uploads, api_keys, etc)
    """
    health = {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "components": {},
        "checks": []
    }
    
    # 1. Verificar Database
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM sources")
        sources_count = cur.fetchone()[0]
        conn.close()
        
        health["components"]["database"] = {
            "status": "healthy",
            "sources_count": sources_count
        }
    except Exception as e:
        health["components"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health["status"] = "unhealthy"
    
    # 2. Verificar diretório de uploads
    try:
        if UPLOAD_DIR.exists():
            upload_files = len(list(UPLOAD_DIR.glob("*")))
            health["components"]["uploads"] = {
                "status": "healthy",
                "files_count": upload_files,
                "path": str(UPLOAD_DIR)
            }
        else:
            health["components"]["uploads"] = {
                "status": "warning",
                "message": "Upload directory does not exist"
            }
            health["status"] = "degraded"
    except Exception as e:
        health["components"]["uploads"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        health["status"] = "unhealthy"
    
    # 3. Verificar API Keys
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM api_keys WHERE is_active=1")
        active_keys = cur.fetchone()[0]
        conn.close()
        
        health["components"]["api_keys"] = {
            "status": "healthy",
            "active_keys": active_keys
        }
    except Exception as e:
        health["components"]["api_keys"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
    # 4. Verificar rate limiting
    try:
        health["components"]["rate_limiting"] = {
            "status": "healthy",
            "tracked_ips": len(request_history),
            "tracking_size_mb": round(
                sum(len(v) for v in request_history.values()) * 100 / (1024 * 1024),
                2
            )
        }
    except Exception as e:
        health["components"]["rate_limiting"] = {
            "status": "degraded",
            "error": str(e)
        }
    
    return health


@app.route("/health", methods=["GET"])
def health_check():
    """
    Health check simples - retorna 200 se saudável.
    
    Usado por Docker health checks e load balancers.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.close()
        return jsonify({"status": "healthy"}), 200
    except Exception:
        return jsonify({"status": "unhealthy"}), 503


@app.route("/health/ready", methods=["GET"])
def readiness_probe():
    """
    Readiness probe - verifica se aplicação está pronta para receber tráfego.
    
    Usado por Kubernetes e orquestradores.
    """
    health = get_health_status()
    
    if health["status"] == "healthy":
        return jsonify(health), 200
    else:
        return jsonify(health), 503


@app.route("/health/live", methods=["GET"])
def liveness_probe():
    """
    Liveness probe - verifica se aplicação está viva (não travada).
    
    Usado por Kubernetes para decidir se precisa fazer restart.
    """
    try:
        # Verificar se consegue fazer query simples
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        conn.close()
        
        return jsonify({
            "status": "alive",
            "timestamp": datetime.datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "status": "dead",
            "error": str(e)
        }), 503


@app.route("/health/detailed", methods=["GET"])
@rate_limit
def detailed_health():
    """
    Health check detalhado com informações completas do sistema.
    
    Requer autenticação opcional por API key.
    Retorna informações sobre database, uploads, cache, etc.
    """
    # Tentar extrair API key se fornecida
    auth_header = request.headers.get("Authorization", "")
    has_auth = bool(auth_header.startswith("Bearer "))
    
    health = get_health_status()
    
    if has_auth:
        # Adicionar informações extras se autenticado
        try:
            conn = sqlite3.connect(DB_PATH)
            cur = conn.cursor()
            
            # Tamanho total dos uploads
            cur.execute("SELECT SUM(size) FROM sources")
            total_size = cur.fetchone()[0] or 0
            
            health["components"]["database"]["total_upload_size_mb"] = round(
                total_size / (1024 * 1024), 2
            )
            
            conn.close()
        except Exception:
            pass
    
    return jsonify(health), 200 if health["status"] == "healthy" else 503


# FIM BUG #5.3


def setup_environment():
    """Prepara o ambiente Python e Node.js"""
    import subprocess
    import sys
    import time
    import webbrowser
    from shutil import which

    # Verifica requisitos
    if which('node') is None:
        print("Erro: Node.js não encontrado! Por favor, instale o Node.js")
        sys.exit(1)

    # Instala dependências Python se necessário
    subprocess.run([sys.executable, "-m", "pip", "install", "flask", "flask-cors"], check=True)

    # Instala dependências Node.js se necessário
    if not (BASE / "node_modules").exists():
        print("Instalando dependências Node.js...")
        subprocess.run(["npm", "install"], cwd=str(BASE), check=True)

    return True

def run_servers():
    """Inicia os servidores Flask e Next.js"""
    import subprocess
    import threading
    import webbrowser
    import time
    
    def run_flask():
        init_db()
        print("Backend Flask iniciado em http://localhost:4000")
        app.run(port=4000)

    def run_nextjs():
        from shutil import which
        print("Iniciando frontend Next.js...")
        try:
            npm_path = which("npm")
            if npm_path is None:
                print("Erro: npm não encontrado! Verificando se pnpm está disponível...")
                pnpm_path = which("pnpm")
                if pnpm_path is None:
                    print("Erro: nem npm nem pnpm foram encontrados. Verificando yarn...")
                    yarn_path = which("yarn")
                    if yarn_path is None:
                        print("Erro: Nenhum gerenciador de pacotes (npm/pnpm/yarn) encontrado!")
                        return
                    package_manager = "yarn"
                else:
                    package_manager = "pnpm"
            else:
                package_manager = "npm"
            
            # Use the absolute executable path returned by shutil.which to avoid
            # Windows "file not found" issues when calling via subprocess.
            if npm_path:
                pm_exec, pm_name = npm_path, "npm"
            elif pnpm_path:
                pm_exec, pm_name = pnpm_path, "pnpm"
            elif yarn_path:
                pm_exec, pm_name = yarn_path, "yarn"
            else:
                print("Nenhum gerenciador de pacotes encontrado para executar o frontend.")
                return

            print(f"Usando {pm_name} ({pm_exec}) para iniciar o projeto...")
            # Call the package manager executable directly
            subprocess.run([pm_exec, "run", "dev"], cwd=str(BASE), check=True)
        except subprocess.CalledProcessError as e:
            print(f"Erro ao executar {package_manager}:", e)
        except Exception as e:
            print("Erro inesperado ao iniciar o frontend:", e)

    # Inicia Flask em uma thread separada
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # Aguarda um momento para o Flask iniciar
    time.sleep(2)

    # Inicia Next.js em uma thread separada
    next_thread = threading.Thread(target=run_nextjs, daemon=True)
    next_thread.start()

    # Aguarda um momento e abre o navegador
    time.sleep(3)
    print("\nAbrindo navegador em http://localhost:3000")
    webbrowser.open("http://localhost:3000")

    print("\nServidores rodando:")
    print("- Backend Flask: http://localhost:4000")
    print("- Frontend Next.js: http://localhost:3000")
    print("\nPressione Ctrl+C para encerrar ambos os servidores\n")

    try:
        # Mantém o programa rodando até Ctrl+C
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nEncerrando servidores...")

if __name__ == "__main__":
    if setup_environment():
        run_servers()
