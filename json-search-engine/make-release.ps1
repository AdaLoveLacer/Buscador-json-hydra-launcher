# Script para gerar releases do projeto JSON Search Engine (Windows)

param(
    [Parameter(Mandatory=$true)][string]$Version,
    [Parameter(Mandatory=$false)][string]$ReleaseType = "full"
)

# Validar versão
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "❌ Versão inválida: $Version" -ForegroundColor Red
    Write-Host "Use formato X.Y.Z (ex: 1.0.0)"
    exit 1
}

# Validar tipo
if ($ReleaseType -notmatch '^(full|web|code)$') {
    Write-Host "❌ Tipo inválido: $ReleaseType" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================" -ForegroundColor Blue
Write-Host "📦 GERADOR DE RELEASES" -ForegroundColor Blue
Write-Host "================================" -ForegroundColor Blue
Write-Host ""

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ProjectDir ".release"
$DistDir = Join-Path $ProjectDir "dist"

Write-Host "Versão: $Version" -ForegroundColor Yellow
Write-Host "Tipo: $ReleaseType" -ForegroundColor Yellow
Write-Host ""

# Criar diretórios
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

# 1. Verificar Git
Write-Host "[1/5] Verificando Git..." -ForegroundColor Yellow
$gitStatus = git status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro: Não está em um repositório Git" -ForegroundColor Red
    exit 1
}

$hasChanges = git diff-index HEAD --
if ($hasChanges) {
    Write-Host "❌ Erro: Existem mudanças não commitadas" -ForegroundColor Red
    Write-Host "Faça commit de todas as mudanças antes de criar um release"
    exit 1
}

Write-Host "✅ Git ok" -ForegroundColor Green
Write-Host ""

# 2. Criar tag
Write-Host "[2/5] Criando tag do Git..." -ForegroundColor Yellow
$tagExists = git rev-parse "v$Version" 2>$null
if ($tagExists) {
    Write-Host "❌ Tag v$Version já existe" -ForegroundColor Red
    exit 1
}

git tag -a "v$Version" -m "Release v$Version" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao criar tag" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Tag v$Version criada" -ForegroundColor Green
Write-Host ""

# 3. Build
Write-Host "[3/5] Compilando projeto..." -ForegroundColor Yellow

if ($ReleaseType -ne "code") {
    npm run build 2>&1 | Select-Object -Last 5
    Write-Host "✅ Build concluído" -ForegroundColor Green
} else {
    Write-Host "⊘ Skipado (código apenas)" -ForegroundColor Green
}

Write-Host ""

# 4. Criar pacotes
Write-Host "[4/5] Criando pacotes..." -ForegroundColor Yellow

$ReleaseName = "json-search-engine-v$Version"

switch ($ReleaseType) {
    "full" {
        Write-Host "  → Criando pacote completo..."
        
        $TempDir = Join-Path $BuildDir $ReleaseName
        New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
        
        # Copiar arquivos
        $dirs = @("app", "components", "lib", "public", "styles", "hooks", "types", "locales", ".next")
        $files = @("package.json", "package-lock.json", "tsconfig.json", "next.config.mjs", "tailwind.config.cjs", "postcss.config.mjs", "README.md", ".gitignore", "auto-start.sh", "auto-start.bat")
        
        foreach ($dir in $dirs) {
            $source = Join-Path $ProjectDir $dir
            if (Test-Path $source) {
                Copy-Item $source (Join-Path $TempDir $dir) -Recurse -Force 2>$null
            }
        }
        
        foreach ($file in $files) {
            $source = Join-Path $ProjectDir $file
            if (Test-Path $source) {
                Copy-Item $source (Join-Path $TempDir $file) -Force 2>$null
            }
        }
        
        # Criar RELEASE_NOTES.md
        $releaseNotes = @"
# Release v$Version

Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')

## 🎯 O que há neste release

- ✅ JSON Search Engine completamente funcional
- ✅ Suporte a busca em tempo real com debounce
- ✅ Armazenamento com IndexedDB (até 250MB)
- ✅ Links magnéticos para torrent
- ✅ Interface com múltiplos temas
- ✅ Scripts de inicialização (Linux/macOS e Windows)

## 📦 Conteúdo

- Código-fonte completo
- Build Next.js pré-compilado
- Scripts de inicialização
- README com documentação

## 🚀 Início Rápido

### Linux/macOS
\`\`\`bash
chmod +x auto-start.sh
./auto-start.sh
\`\`\`

### Windows
Duplo clique em \`auto-start.bat\`

## 📋 Requisitos

- Node.js v18+
- npm (incluído com Node.js)

## 📚 Documentação

Veja README.md para documentação completa.

---
GitHub: https://github.com/AdaLoveLacer/Buscador-Json
"@
        
        Set-Content -Path (Join-Path $TempDir "RELEASE_NOTES.md") -Value $releaseNotes
        
        # Criar ZIP usando PowerShell
        $zipPath = Join-Path $DistDir "$ReleaseName-complete.zip"
        Compress-Archive -Path $TempDir -DestinationPath $zipPath -Force
        Write-Host "    ✅ $ReleaseName-complete.zip" -ForegroundColor Green
    }
    
    "web" {
        Write-Host "  → Criando pacote web..."
        
        $sourceNextDir = Join-Path $ProjectDir ".next"
        if (-not (Test-Path $sourceNextDir)) {
            Write-Host "❌ Build não encontrado. Execute 'npm run build' primeiro" -ForegroundColor Red
            exit 1
        }
        
        $TempDir = Join-Path $BuildDir "$ReleaseName-web"
        New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
        
        Copy-Item $sourceNextDir (Join-Path $TempDir ".next") -Recurse -Force
        
        $publicDir = Join-Path $ProjectDir "public"
        if (Test-Path $publicDir) {
            Copy-Item $publicDir (Join-Path $TempDir "public") -Recurse -Force 2>$null
        }
        
        Copy-Item (Join-Path $ProjectDir "package.json") (Join-Path $TempDir "package.json") -Force
        Copy-Item (Join-Path $ProjectDir "README.md") (Join-Path $TempDir "README.md") -Force
        
        $zipPath = Join-Path $DistDir "$ReleaseName-web.zip"
        Compress-Archive -Path $TempDir -DestinationPath $zipPath -Force
        Write-Host "    ✅ $ReleaseName-web.zip" -ForegroundColor Green
    }
    
    "code" {
        Write-Host "  → Criando pacote de código..."
        
        $TempDir = Join-Path $BuildDir "$ReleaseName-code"
        New-Item -ItemType Directory -Force -Path $TempDir | Out-Null
        
        $dirs = @("app", "components", "lib", "public", "styles", "hooks", "types", "locales")
        $files = @("package.json", "package-lock.json", "tsconfig.json", "next.config.mjs", "tailwind.config.cjs", "postcss.config.mjs", "README.md", ".gitignore", "auto-start.sh", "auto-start.bat")
        
        foreach ($dir in $dirs) {
            $source = Join-Path $ProjectDir $dir
            if (Test-Path $source) {
                Copy-Item $source (Join-Path $TempDir $dir) -Recurse -Force 2>$null
            }
        }
        
        foreach ($file in $files) {
            $source = Join-Path $ProjectDir $file
            if (Test-Path $source) {
                Copy-Item $source (Join-Path $TempDir $file) -Force 2>$null
            }
        }
        
        $zipPath = Join-Path $DistDir "$ReleaseName-code.zip"
        Compress-Archive -Path $TempDir -DestinationPath $zipPath -Force
        Write-Host "    ✅ $ReleaseName-code.zip" -ForegroundColor Green
    }
}

Write-Host "✅ Pacotes criados" -ForegroundColor Green
Write-Host ""

# 5. Informações finais
Write-Host "[5/5] Gerando informações..." -ForegroundColor Yellow

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "📊 RESUMO DO RELEASE" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

Write-Host "Versão: v$Version" -ForegroundColor Blue
Write-Host "Tipo: $ReleaseType" -ForegroundColor Blue
Write-Host "Data: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')" -ForegroundColor Blue
Write-Host "Git Tag: v$Version" -ForegroundColor Blue
Write-Host ""
Write-Host "Arquivos gerados:" -ForegroundColor Blue

Get-ChildItem -Path $DistDir -File | ForEach-Object {
    $size = "{0:N2} MB" -f ($_.Length / 1MB)
    Write-Host "  📦 $($_.Name) ($size)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Localização: $DistDir/" -ForegroundColor Blue
Write-Host ""

Write-Host "✅ RELEASE CRIADO COM SUCESSO!" -ForegroundColor Green
Write-Host ""

Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Revisar os arquivos em: $DistDir/" -ForegroundColor Gray
Write-Host "  2. Fazer push da tag: git push origin v$Version" -ForegroundColor Gray
Write-Host "  3. Criar release no GitHub com os arquivos ZIP" -ForegroundColor Gray
Write-Host "  4. Anunciar o novo release" -ForegroundColor Gray
Write-Host ""

Write-Host "Comandos úteis:" -ForegroundColor Blue
Write-Host "  git push origin v$Version          # Enviar tag" -ForegroundColor Gray
Write-Host "  git log -1 --oneline               # Ver último commit" -ForegroundColor Gray
Write-Host "  git tag -l                         # Listar tags" -ForegroundColor Gray
Write-Host ""

# Limpeza
Remove-Item -Path $BuildDir -Recurse -Force 2>$null
