@echo off
REM Script para criar um release .zip do Buscador-Json
REM Este script copia todos os arquivos necessários e gera releases.zip na pasta atual

REM Define pasta temporária
set TMP_RELEASE=release_temp

REM Remove pasta temporária se existir
if exist %TMP_RELEASE% rmdir /s /q %TMP_RELEASE%

REM Cria estrutura de diretórios
mkdir %TMP_RELEASE%\app
mkdir %TMP_RELEASE%\app\[locale]
mkdir %TMP_RELEASE%\components
mkdir %TMP_RELEASE%\components\ui
mkdir %TMP_RELEASE%\lib
mkdir %TMP_RELEASE%\hooks
mkdir %TMP_RELEASE%\locales
mkdir %TMP_RELEASE%\public
mkdir %TMP_RELEASE%\styles
mkdir %TMP_RELEASE%\types

REM Copia arquivos principais
copy start_server.bat %TMP_RELEASE%\start_server.bat
copy start_server.sh %TMP_RELEASE%\start_server.sh
copy server.py %TMP_RELEASE%\server.py
copy server_api.py %TMP_RELEASE%\server_api.py
copy package.json %TMP_RELEASE%\package.json
copy pnpm-lock.yaml %TMP_RELEASE%\pnpm-lock.yaml
copy README-PT-BR.md %TMP_RELEASE%\README-PT-BR.md
copy Dockerfile %TMP_RELEASE%\Dockerfile
copy next.config.mjs %TMP_RELEASE%\next.config.mjs
copy tailwind.config.cjs %TMP_RELEASE%\tailwind.config.cjs
copy tsconfig.json %TMP_RELEASE%\tsconfig.json
copy next-env.d.ts %TMP_RELEASE%\next-env.d.ts
copy postcss.config.mjs %TMP_RELEASE%\postcss.config.mjs
copy package-lock.json %TMP_RELEASE%\package-lock.json
copy components.json %TMP_RELEASE%\components.json
copy .gitignore %TMP_RELEASE%\.gitignore
copy tsconfig.tsbuildinfo %TMP_RELEASE%\tsconfig.tsbuildinfo

REM Criar requirements.txt se não existir
if not exist requirements.txt (
    echo flask>> requirements.txt
    echo flask-cors>> requirements.txt
)
copy requirements.txt %TMP_RELEASE%\requirements.txt

REM Copiar banco de dados se existir
if exist db.sqlite copy db.sqlite %TMP_RELEASE%\db.sqlite

REM Copia diretórios do projeto
xcopy app %TMP_RELEASE%\app /E /I /Y
xcopy components %TMP_RELEASE%\components /E /I /Y
xcopy lib %TMP_RELEASE%\lib /E /I /Y
xcopy hooks %TMP_RELEASE%\hooks /E /I /Y
xcopy locales %TMP_RELEASE%\locales /E /I /Y
xcopy public %TMP_RELEASE%\public /E /I /Y
xcopy styles %TMP_RELEASE%\styles /E /I /Y
xcopy types %TMP_RELEASE%\types /E /I /Y
xcopy uploads %TMP_RELEASE%\uploads /E /I /Y

REM Copia cache Python
xcopy __pycache__ %TMP_RELEASE%\__pycache__ /E /I /Y

REM Cria o arquivo zip
powershell Compress-Archive -Path %TMP_RELEASE%\* -DestinationPath releases.zip

REM Remove pasta temporária
rmdir /s /q %TMP_RELEASE%

echo Release criado: releases.zip
pause
