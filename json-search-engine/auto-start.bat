@echo off
setlocal enabledelayedexpansion

REM Cores (usando echo com atributos)
set "BLUE=[34m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "RED=[31m"
set "NC=[0m"

REM Diretórios e portas
set "PROJECT_DIR=%~dp0"
set "VENV_DIR=%PROJECT_DIR%venv"
set "NODE_PORT=3000"
set "SERVER_URL=http://localhost:%NODE_PORT%"

echo.
echo ================================
echo 🚀 AUTO-START NEXT.JS
echo ================================
echo.

REM 1. Verificar e instalar dependências Node.js
echo [1/3] Verificando dependências Node.js...
cd /d "%PROJECT_DIR%"

if not exist "node_modules" (
    echo   → Instalando dependências...
    call npm install
) else (
    echo   → Verificando atualizações...
    call npm install
)

if !errorlevel! neq 0 (
    echo   ❌ Erro ao instalar dependências Node.js
    pause
    exit /b 1
)

echo   ✅ Dependências Node.js ok
echo.

REM 2. Iniciar servidor
echo [2/3] Iniciando servidor...

REM Matar processos antigos
echo   → Limpando portas antigas...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM Iniciar Next.js
echo   → Iniciando Next.js em :%NODE_PORT%...
start "JSON Search Next.js Server" cmd /k npm run dev

REM Aguardar servidor iniciar
echo   → Aguardando resposta do servidor...
timeout /t 5 /nobreak >nul

REM Verificar se servidor está respondendo (usando PowerShell)
powershell -Command "for ($i=1; $i -le 30; $i++) { try { $response = Invoke-WebRequest -Uri 'http://localhost:%NODE_PORT%' -ErrorAction Stop; Write-Host '   ✅ Next.js respondendo'; exit 0 } catch { if ($i -eq 30) { Write-Host '   ⚠️  Next.js não respondeu no tempo esperado' } Start-Sleep -Seconds 1 } }" 2>nul

echo.

REM 3. Abrir navegador
echo [3/3] Abrindo navegador...

REM Tentar abrir com navegador padrão
start "" "%SERVER_URL%"

echo   ✅ Navegador aberto
echo.

echo ================================
echo ✅ SERVIDOR INICIADO COM SUCESSO!
echo ================================
echo.

echo Servidor rodando em:
echo   🌐 %SERVER_URL%
echo.

echo Para parar o servidor, feche a janela do terminal ou pressione Ctrl+C
echo.

pause
