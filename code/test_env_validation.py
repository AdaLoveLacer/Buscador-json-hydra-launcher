#!/usr/bin/env python3
"""
BUG #5.2: Test Environment Validation

Testes para garantir que o módulo env_loader funciona corretamente.

Uso:
    python -m pytest test_env_validation.py -v
    
Ou diretamente:
    python test_env_validation.py
"""

import os
import sys
import unittest
import tempfile
from pathlib import Path
from unittest import TestCase, main

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from env_loader import EnvLoader, load_env, get_env
    ENV_LOADER_AVAILABLE = True
except ImportError:
    ENV_LOADER_AVAILABLE = False
    print("⚠️  env_loader module not found - some tests will be skipped")


class TestEnvLoader(TestCase):
    """Testes para o módulo env_loader"""
    
    def setUp(self):
        """Configura ambiente de teste"""
        self.loader = EnvLoader()
        self.original_env = os.environ.copy()
    
    def tearDown(self):
        """Restaura ambiente original"""
        os.environ.clear()
        os.environ.update(self.original_env)
    
    @unittest.skipIf(not ENV_LOADER_AVAILABLE, "env_loader not available")
    def test_loader_initialization(self):
        """Testa inicialização do loader"""
        self.assertFalse(self.loader.loaded)
        self.assertEqual(len(self.loader.vars), 0)
        self.assertEqual(len(self.loader.warnings), 0)
        self.assertEqual(len(self.loader.errors), 0)
    
    @unittest.skipIf(not ENV_LOADER_AVAILABLE, "env_loader not available")
    def test_required_variables_present(self):
        """Testa detecção de variáveis obrigatórias presentes"""
        os.environ["NODE_ENV"] = "development"
        os.environ["FLASK_ENV"] = "development"
        os.environ["NEXT_PUBLIC_API_URL"] = "http://localhost:4000"
        
        success = self.loader.load()
        
        self.assertTrue(success)
        self.assertEqual(len(self.loader.errors), 0)
        self.assertEqual(self.loader.get("NODE_ENV"), "development")
    
    @unittest.skipIf(not ENV_LOADER_AVAILABLE, "env_loader not available")
    def test_optional_variables_defaults(self):
        """Testa valores padrão para variáveis opcionais"""
        os.environ["NODE_ENV"] = "development"
        os.environ["FLASK_ENV"] = "development"
        os.environ["NEXT_PUBLIC_API_URL"] = "http://localhost:4000"
        
        self.loader.load()
        
        # Deve ter valores padrão
        self.assertEqual(self.loader.get("MAX_UPLOAD_SIZE"), "104857600")
        self.assertEqual(self.loader.get("RATE_LIMIT_REQUESTS"), "100")
    
    @unittest.skipIf(not ENV_LOADER_AVAILABLE, "env_loader not available")
    def test_validator_enforcement(self):
        """Testa validadores para valores específicos"""
        os.environ["NODE_ENV"] = "invalid_value"
        os.environ["FLASK_ENV"] = "development"
        os.environ["NEXT_PUBLIC_API_URL"] = "http://localhost:4000"
        
        success = self.loader.load()
        
        # Deve falhar validação
        self.assertFalse(success)
        self.assertTrue(any("invalid_value" in e for e in self.loader.errors))
    
    @unittest.skipIf(not ENV_LOADER_AVAILABLE, "env_loader not available")
    def test_numeric_validators(self):
        """Testa validadores numéricos"""
        os.environ["NODE_ENV"] = "development"
        os.environ["FLASK_ENV"] = "development"
        os.environ["NEXT_PUBLIC_API_URL"] = "http://localhost:4000"
        os.environ["MAX_UPLOAD_SIZE"] = "invalid_number"
        
        success = self.loader.load()
        
        # Deve falhar mas usar padrão
        self.assertFalse(success)
        # Deve ter tentado carregar e falhado
        self.assertTrue(len(self.loader.warnings) > 0 or len(self.loader.errors) > 0)


class TestEnvValidationQuick(TestCase):
    """Testes rápidos de validação de ambiente"""
    
    def test_env_file_example_exists(self):
        """Verifica se .env.example existe"""
        env_example = Path(__file__).parent / ".env.example"
        self.assertTrue(env_example.exists(), ".env.example não encontrado")
    
    def test_required_variables_documented(self):
        """Verifica se variáveis obrigatórias estão documentadas"""
        env_example = Path(__file__).parent / ".env.example"
        content = env_example.read_text()
        
        required = ["NEXT_PUBLIC_API_URL", "NODE_ENV", "FLASK_ENV"]
        for var in required:
            self.assertIn(var, content, f"{var} não documentado em .env.example")
    
    def test_rate_limiting_documented(self):
        """Verifica se variáveis de rate limiting estão documentadas"""
        env_example = Path(__file__).parent / ".env.example"
        content = env_example.read_text()
        
        rate_limit_vars = ["RATE_LIMIT_REQUESTS", "RATE_LIMIT_WINDOW", "RATE_LIMIT_UPLOAD_SIZE"]
        for var in rate_limit_vars:
            self.assertIn(var, content, f"{var} (BUG #4.4) não documentado")
    
    def test_database_index_documented(self):
        """Verifica se variáveis de índice de banco de dados estão documentadas"""
        env_example = Path(__file__).parent / ".env.example"
        content = env_example.read_text()
        
        self.assertIn("DATABASE_ENABLE_STATS", content, "DATABASE_ENABLE_STATS (BUG #4.1) não documentado")
        self.assertIn("SQLITE_JOURNAL_MODE", content, "SQLITE_JOURNAL_MODE não documentado")
    
    def test_env_example_well_formatted(self):
        """Verifica formatação do .env.example"""
        env_example = Path(__file__).parent / ".env.example"
        lines = env_example.read_text().split('\n')
        
        # Deve ter comentários com explicações
        comment_lines = [l for l in lines if l.strip().startswith('#')]
        self.assertGreater(len(comment_lines), 20, ".env.example deve ter muitos comentários")


# ─── Helper para execução direta ───────────────────────────────────────────────

def run_quick_validation():
    """Executa validação rápida do ambiente"""
    print("\n" + "="*60)
    print("🔍 QUICK ENVIRONMENT VALIDATION")
    print("="*60)
    
    checks = {
        ".env.example exists": Path(__file__).parent.joinpath(".env.example").exists(),
        "env_loader.py exists": Path(__file__).parent.joinpath("env_loader.py").exists(),
        "validate-env.sh exists": Path(__file__).parent.joinpath("validate-env.sh").exists(),
        "validate-env.ps1 exists": Path(__file__).parent.joinpath("validate-env.ps1").exists(),
    }
    
    passed = 0
    for check_name, result in checks.items():
        status = "✓" if result else "✗"
        print(f"{status} {check_name}")
        if result:
            passed += 1
    
    print("="*60)
    print(f"✓ {passed}/{len(checks)} checks passed\n")
    
    return passed == len(checks)


if __name__ == "__main__":
    import unittest
    
    # Rodar validação rápida primeiro
    if not run_quick_validation():
        print("⚠️  Some environment files are missing!")
    
    # Rodar testes unitários
    print("\nRunning unit tests...\n")
    unittest.main(verbosity=2)
