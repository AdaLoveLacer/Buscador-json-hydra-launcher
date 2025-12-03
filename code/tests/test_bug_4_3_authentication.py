"""
Tests para BUG #4.3 - Authentication/Authorization com API Keys

Testes completos para validar o sistema de autenticação por API keys
"""

import pytest
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from server_api import app, init_db, generate_api_key, hash_api_key, verify_api_key, DB_PATH
import sqlite3
import tempfile
import shutil
import os


@pytest.fixture
def temp_db():
    """Cria um banco de dados temporário para testes."""
    # Criar diretório temporário
    temp_dir = tempfile.mkdtemp()
    temp_db_path = Path(temp_dir) / "test.db"
    
    # Salvar path original
    original_db = DB_PATH
    
    # Usar banco de dados temporário
    import server_api
    server_api.DB_PATH = temp_db_path
    
    # Inicializar banco
    init_db()
    
    yield temp_db_path
    
    # Limpar
    server_api.DB_PATH = original_db
    shutil.rmtree(temp_dir)


@pytest.fixture
def client(temp_db):
    """Cria um cliente Flask para testes."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def api_key(temp_db):
    """Gera uma API key válida para testes."""
    key = generate_api_key()
    hashed = hash_api_key(key)
    
    # Inserir no banco
    conn = sqlite3.connect(str(temp_db))
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO api_keys (name, key_hash, created_at, is_active)
        VALUES (?, ?, datetime('now'), 1)
        """,
        ("test_key", hashed)
    )
    conn.commit()
    conn.close()
    
    return key


# ============================================================================
# TESTES DE AUTENTICAÇÃO
# ============================================================================

def test_missing_api_key(client):
    """Teste 1: Requisição sem API key deve retornar 401."""
    response = client.get("/list")
    assert response.status_code == 401
    data = json.loads(response.data)
    assert "missing API key" in data.get("error", "")


def test_invalid_api_key(client, api_key):
    """Teste 2: Requisição com API key inválida deve retornar 403."""
    response = client.get("/list", headers={"X-API-Key": "invalid_key"})
    assert response.status_code == 403
    data = json.loads(response.data)
    assert "invalid API key" in data.get("error", "")


def test_valid_api_key(client, api_key):
    """Teste 3: Requisição com API key válida deve retornar 200."""
    response = client.get("/list", headers={"X-API-Key": api_key})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)  # /list retorna array


def test_api_key_from_query_param(client, api_key):
    """Teste 4: API key via query parameter deve funcionar."""
    response = client.get(f"/list?api_key={api_key}")
    assert response.status_code == 200


def test_api_key_header_takes_precedence(client, api_key):
    """Teste 5: Header X-API-Key tem precedência sobre query param."""
    response = client.get(
        f"/list?api_key=invalid",
        headers={"X-API-Key": api_key}
    )
    assert response.status_code == 200


# ============================================================================
# TESTES DE ENDPOINTS PROTEGIDOS
# ============================================================================

def test_list_endpoint_protected(client):
    """Teste 6: Endpoint /list é protegido."""
    response = client.get("/list")
    assert response.status_code == 401


def test_upload_endpoint_protected(client):
    """Teste 7: Endpoint /upload é protegido."""
    response = client.post("/upload")
    assert response.status_code == 401


def test_download_endpoint_protected(client):
    """Teste 8: Endpoint /download é protegido."""
    response = client.get("/download/1")
    assert response.status_code == 401


def test_delete_endpoint_protected(client):
    """Teste 9: Endpoint /delete é protegido."""
    response = client.delete("/delete/1")
    assert response.status_code == 401


def test_json_endpoint_protected(client):
    """Teste 10: Endpoint /json é protegido."""
    response = client.get("/json/1")
    assert response.status_code == 401


# ============================================================================
# TESTES DE ADMIN ENDPOINTS
# ============================================================================

def test_admin_create_key_missing_name(client):
    """Teste 11: Criar key sem nome retorna 400."""
    response = client.post(
        "/admin/keys",
        data=json.dumps({}),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = json.loads(response.data)
    assert "missing key name" in data.get("error", "")


def test_admin_create_key_short_name(client):
    """Teste 12: Nome muito curto (< 3 chars) retorna 400."""
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "ab"}),
        content_type="application/json"
    )
    assert response.status_code == 400


def test_admin_create_key_long_name(client):
    """Teste 13: Nome muito longo (> 50 chars) retorna 400."""
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "a" * 51}),
        content_type="application/json"
    )
    assert response.status_code == 400


def test_admin_create_key_success(client):
    """Teste 14: Criar key com nome válido retorna 201 e a key gerada."""
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "my_key"}),
        content_type="application/json"
    )
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data["name"] == "my_key"
    assert "key" in data
    assert len(data["key"]) > 20  # API key é longo
    assert "id" in data


def test_admin_create_key_duplicate_name(client):
    """Teste 15: Criar key com nome duplicado retorna 409."""
    # Primeira criação
    response1 = client.post(
        "/admin/keys",
        data=json.dumps({"name": "duplicate_key"}),
        content_type="application/json"
    )
    assert response1.status_code == 201
    
    # Segunda criação com mesmo nome
    response2 = client.post(
        "/admin/keys",
        data=json.dumps({"name": "duplicate_key"}),
        content_type="application/json"
    )
    assert response2.status_code == 409
    data = json.loads(response2.data)
    assert "already exists" in data.get("error", "")


def test_admin_list_keys(client, api_key):
    """Teste 16: Listar keys retorna lista correta."""
    # Criar mais uma key
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "key2"}),
        content_type="application/json"
    )
    assert response.status_code == 201
    
    # Listar
    response = client.get("/admin/keys")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) >= 2  # test_key e key2
    
    # Verificar que não há key_hash ou plain text
    for item in data:
        assert "key" not in item  # Não deve retornar a key
        assert "key_hash" not in item  # Não deve retornar o hash
        assert "id" in item
        assert "name" in item
        assert "created_at" in item
        assert "is_active" in item


def test_admin_delete_key(client):
    """Teste 17: Deletar key marca como inativa."""
    # Criar key
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "key_to_delete"}),
        content_type="application/json"
    )
    key_id = json.loads(response.data)["id"]
    
    # Deletar
    response = client.delete(f"/admin/keys/{key_id}")
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data["deleted"] == True
    assert data["key_id"] == key_id
    
    # Verificar que key está inativa
    response = client.get("/admin/keys")
    keys = json.loads(response.data)
    key_to_delete = next((k for k in keys if k["id"] == key_id), None)
    assert key_to_delete is not None
    assert key_to_delete["is_active"] == False


def test_admin_delete_nonexistent_key(client):
    """Teste 18: Deletar key inexistente retorna 404."""
    response = client.delete("/admin/keys/99999")
    assert response.status_code == 404


# ============================================================================
# TESTES DE VALIDAÇÃO DE HASH
# ============================================================================

def test_api_key_hashing():
    """Teste 19: Hash de API key com bcrypt é seguro."""
    key = generate_api_key()
    hash1 = hash_api_key(key)
    hash2 = hash_api_key(key)
    
    # Hashes diferentes (devido ao salt aleatório)
    assert hash1 != hash2
    
    # Mas ambos verificam a mesma key
    assert verify_api_key(key, hash1)
    assert verify_api_key(key, hash2)


def test_api_key_verification():
    """Teste 20: Verificação de API key funciona corretamente."""
    key = generate_api_key()
    hashed = hash_api_key(key)
    
    # Key correta deve validar
    assert verify_api_key(key, hashed) == True
    
    # Key incorreta não deve validar
    assert verify_api_key("wrong_key", hashed) == False
    assert verify_api_key("", hashed) == False


# ============================================================================
# TESTES DE INTEGRAÇÃO
# ============================================================================

def test_full_workflow(client):
    """Teste 21: Workflow completo - criar key, usar, e deletar."""
    # 1. Criar key
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "workflow_key"}),
        content_type="application/json"
    )
    assert response.status_code == 201
    key_data = json.loads(response.data)
    key = key_data["key"]
    key_id = key_data["id"]
    
    # 2. Usar key para acessar /list
    response = client.get(
        "/list",
        headers={"X-API-Key": key}
    )
    assert response.status_code == 200
    
    # 3. Deletar key
    response = client.delete(f"/admin/keys/{key_id}")
    assert response.status_code == 200
    
    # 4. Tentar usar key deletada deve falhar
    response = client.get(
        "/list",
        headers={"X-API-Key": key}
    )
    assert response.status_code == 403


def test_key_update_last_used(client):
    """Teste 22: last_used é atualizado ao usar a key."""
    # Criar key
    response = client.post(
        "/admin/keys",
        data=json.dumps({"name": "track_usage"}),
        content_type="application/json"
    )
    key = json.loads(response.data)["key"]
    
    # Usar key
    response = client.get(
        "/list",
        headers={"X-API-Key": key}
    )
    assert response.status_code == 200
    
    # Listar keys e verificar que last_used foi atualizado
    response = client.get("/admin/keys")
    keys = json.loads(response.data)
    track_usage = next((k for k in keys if k["name"] == "track_usage"), None)
    assert track_usage is not None
    assert track_usage["last_used"] is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
