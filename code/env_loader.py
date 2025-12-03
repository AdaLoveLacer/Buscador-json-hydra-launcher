#!/usr/bin/env python3
"""
BUG #5.2: Environment Variables Loader & Validator

Carrega e valida variáveis de ambiente de forma segura com valores padrão sensatos.
Garante que a aplicação tem todas as variáveis necessárias antes de iniciar.

Uso:
    from env_loader import load_env, get_env
    
    env = load_env()
    api_url = get_env("API_URL")
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any

try:
    from dotenv import load_dotenv, find_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False
    def load_dotenv(path=None): return None
    def find_dotenv(start=None, raise_error_if_not_found=False, usecwd=False): return None


class EnvLoader:
    """Carregador seguro de variáveis de ambiente com valores padrão e validação."""
    
    # Variáveis obrigatórias para inicialização
    REQUIRED_VARS = {
        "NODE_ENV": "development",
        "FLASK_ENV": "development",
        "NEXT_PUBLIC_API_URL": "http://localhost:4000",
    }
    
    # Variáveis opcionais com valores padrão
    OPTIONAL_VARS = {
        "NEXT_PUBLIC_LOG_LEVEL": "info",
        "FLASK_DEBUG": "0",
        "ALLOWED_ORIGINS": "http://localhost:3000,http://localhost:4000",
        "MAX_UPLOAD_SIZE": "104857600",  # 100MB
        "DATABASE_URL": "sqlite:///./db.sqlite",
        "UPLOAD_DIR": "./uploads",
        "PYTHONUNBUFFERED": "1",
        "CORS_ENABLED": "true",
        "CORS_MAX_AGE": "3600",
        "SQLITE_JOURNAL_MODE": "WAL",
        "TZ": "UTC",
        # BUG #4.4: Rate limiting defaults
        "RATE_LIMIT_REQUESTS": "100",
        "RATE_LIMIT_WINDOW": "60",
        "RATE_LIMIT_UPLOAD_SIZE": "524288000",  # 500MB
        "RATE_LIMIT_UPLOAD_WINDOW": "60",
    }
    
    # Validadores customizados para valores específicos
    VALIDATORS = {
        "NODE_ENV": lambda x: x in ("production", "development", "test"),
        "FLASK_ENV": lambda x: x in ("production", "development"),
        "NEXT_PUBLIC_LOG_LEVEL": lambda x: x in ("debug", "info", "warn", "error"),
        "FLASK_DEBUG": lambda x: x in ("0", "1"),
        "MAX_UPLOAD_SIZE": lambda x: int(x) > 0,
        "RATE_LIMIT_REQUESTS": lambda x: int(x) > 0,
        "RATE_LIMIT_WINDOW": lambda x: int(x) > 0,
        "RATE_LIMIT_UPLOAD_SIZE": lambda x: int(x) > 0,
        "RATE_LIMIT_UPLOAD_WINDOW": lambda x: int(x) > 0,
        "CORS_MAX_AGE": lambda x: int(x) > 0,
    }
    
    def __init__(self):
        self.loaded = False
        self.vars: Dict[str, str] = {}
        self.warnings: list[str] = []
        self.errors: list[str] = []
    
    def load(self) -> bool:
        """
        Carrega variáveis de ambiente de .env e do sistema.
        
        Retorna True se bem-sucedido, False caso haja erros críticos.
        """
        # Carregar arquivo .env se existir
        if DOTENV_AVAILABLE:
            env_file = find_dotenv()
            if env_file:
                print(f"[*] Carregando variaveis de {env_file}")
                load_dotenv(env_file)
        else:
            # Tentar carregar manualmente se dotenv não está disponível
            env_file = Path.cwd() / ".env"
            if env_file.exists():
                print(f"[*] Carregando variaveis de {env_file} (manual)")
                self._load_env_file(env_file)
            else:
                print("[!] Arquivo .env nao encontrado - usando variaveis do sistema")
        
        # Carregar variáveis obrigatórias
        for var, default in self.REQUIRED_VARS.items():
            value = os.getenv(var, default)
            if not value:
                self.errors.append(f"Variavel obrigatoria ausente: {var}")
            else:
                if not self._validate(var, value):
                    self.errors.append(f"Valor invalido para {var}: {value}")
                else:
                    self.vars[var] = value
        
        # Carregar variáveis opcionais com padrões
        for var, default in self.OPTIONAL_VARS.items():
            value = os.getenv(var, default)
            if value:
                if not self._validate(var, value):
                    self.warnings.append(f"Valor invalido para {var}: {value}, usando padrao: {default}")
                    self.vars[var] = default
                else:
                    self.vars[var] = value
            else:
                self.vars[var] = default
        
        self.loaded = True
        return len(self.errors) == 0
    
    def _load_env_file(self, path: Path) -> None:
        """Carrega arquivo .env manualmente sem dotenv."""
        try:
            for line in path.read_text().split('\n'):
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"\'')
                    if key and not os.getenv(key):  # Não sobrescreve variáveis do sistema
                        os.environ[key] = value
        except Exception as e:
            print(f"[!] Erro ao carregar .env: {e}")
    
    def _validate(self, var: str, value: str) -> bool:
        """Valida um valor de variável de ambiente."""
        if var not in self.VALIDATORS:
            return True  # Sem validador = válido por padrão
        
        try:
            validator = self.VALIDATORS[var]
            return validator(value)
        except (ValueError, TypeError):
            return False
    
    def get(self, var: str, default: Optional[str] = None) -> str:
        """Obtém o valor de uma variável."""
        return self.vars.get(var, default or "")
    
    def print_status(self) -> None:
        """Exibe status de carregamento."""
        print("\n" + "="*60)
        print("[*] ENVIRONMENT VARIABLES STATUS")
        print("="*60)
        
        if self.errors:
            print(f"\n[X] Erros ({len(self.errors)}):")
            for error in self.errors:
                print(f"   - {error}")
        
        if self.warnings:
            print(f"\n[!] Avisos ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"   - {warning}")
        
        print(f"\n[+] Variaveis Carregadas ({len(self.vars)}):")
        for var, value in sorted(self.vars.items()):
            # Não mostrar valores sensíveis
            display_value = value
            if any(secret in var.lower() for secret in ["key", "secret", "password", "token"]):
                display_value = "***" + value[-4:] if len(value) > 4 else "***"
            print(f"   {var}={display_value}")
        
        print("="*60 + "\n")
    
    def validate_production(self) -> bool:
        """Validações específicas para produção."""
        errors = []
        
        if self.vars.get("FLASK_DEBUG") == "1":
            errors.append("FLASK_DEBUG=1 nao deve estar ativado em producao!")
        
        if self.vars.get("FLASK_ENV") != "production":
            errors.append("FLASK_ENV deve ser 'production' em ambiente de producao")
        
        if self.vars.get("NODE_ENV") != "production":
            errors.append("NODE_ENV deve ser 'production' em ambiente de producao")
        
        if self.vars.get("ALLOWED_ORIGINS") == "http://localhost:3000,http://localhost:4000":
            errors.append("ALLOWED_ORIGINS contem localhost - configure para producao!")
        
        if errors:
            print("\n[!] PRODUCTION WARNINGS:")
            for error in errors:
                print(f"   - {error}")
        
        return len(errors) == 0


# Instância global
_env_loader = EnvLoader()


def load_env() -> bool:
    """Carrega variáveis de ambiente. Retorna True se bem-sucedido."""
    if not _env_loader.load():
        print("\n[X] ERRO: Falha ao carregar variaveis de ambiente!")
        _env_loader.print_status()
        return False
    
    _env_loader.print_status()
    return True


def get_env(var: str, default: Optional[str] = None) -> str:
    """Obtém valor de variável carregada."""
    if not _env_loader.loaded:
        raise RuntimeError("Variaveis de ambiente nao foram carregadas. Chame load_env() primeiro!")
    return _env_loader.get(var, default)


def validate_production() -> bool:
    """Valida configuração para produção."""
    return _env_loader.validate_production()


if __name__ == "__main__":
    # Script de teste
    if load_env():
        print("[+] Variaveis carregadas com sucesso!")
        
        # Teste de acesso
        print(f"\nNODE_ENV: {get_env('NODE_ENV')}")
        print(f"FLASK_ENV: {get_env('FLASK_ENV')}")
        print(f"API_URL: {get_env('NEXT_PUBLIC_API_URL')}")
        
        # Validação de produção se solicitado
        if "--production" in sys.argv:
            print("\n[*] Validando configuracao para producao...")
            if validate_production():
                print("[+] Configuracao OK para producao!")
            else:
                print("[!] Revise os avisos acima!")
    else:
        print("[-] Falha ao carregar variaveis de ambiente!")
        sys.exit(1)
