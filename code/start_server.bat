@echo off
REM Arquivo de atalho para rodar o servidor Python que inicia o Next.js
REM Este .bat cria (se necessário) uma virtualenv em .venv, ativa e executa o servidor Python (server_api.py)
REM Execute este .bat dando duplo-clique ou via terminal (cmd).

SET SCRIPT_DIR=%~dp0

REM Criar virtualenv em .venv se não existir
if not exist "%SCRIPT_DIR%.venv\Scripts\python.exe" (
	echo Criando virtualenv em .venv...
	python -m venv "%SCRIPT_DIR%.venv"
	if errorlevel 1 (
		echo Falha ao criar virtualenv. Verifique se o Python está instalado e no PATH.
		pause
		exit /b 1
	)
)

REM Ativar a virtualenv
call "%SCRIPT_DIR%.venv\Scripts\activate.bat"

REM Se existir um wrapper 'server.py' (inicia Next.js), prefira executá-lo; caso contrário execute 'server_api.py'.
if exist "%SCRIPT_DIR%server.py" (
	echo Encontrado server.py - executando wrapper do Next.js
	python "%SCRIPT_DIR%server.py" %*
) else (
	echo server.py nao encontrado - executando server_api.py (API Flask)
	python "%SCRIPT_DIR%server_api.py" %*
)

echo.
echo Pressione qualquer tecla para fechar...
pause > nul
