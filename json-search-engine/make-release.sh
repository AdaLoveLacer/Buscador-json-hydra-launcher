#!/bin/bash

# Script para gerar releases do projeto JSON Search Engine

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$PROJECT_DIR/.release"
DIST_DIR="$PROJECT_DIR/dist"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}📦 GERADOR DE RELEASES${NC}"
echo -e "${BLUE}================================${NC}\n"

# Função para exibir uso
show_usage() {
    echo "Uso: $0 <versão> [tipo]"
    echo ""
    echo "Versão:"
    echo "  X.Y.Z (ex: 1.0.0)"
    echo ""
    echo "Tipo (opcional):"
    echo "  full   - Release completo (padrão)"
    echo "  web    - Apenas build web"
    echo "  code   - Apenas código fonte"
    echo ""
    echo "Exemplos:"
    echo "  $0 1.0.0"
    echo "  $0 1.0.0 full"
    echo "  $0 1.0.0 web"
    exit 1
}

# Verificar argumentos
if [ -z "$1" ]; then
    show_usage
fi

VERSION="$1"
RELEASE_TYPE="${2:-full}"

# Validar versão
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Versão inválida: $VERSION${NC}"
    echo "Use formato X.Y.Z (ex: 1.0.0)"
    exit 1
fi

# Validar tipo
if ! [[ "$RELEASE_TYPE" =~ ^(full|web|code)$ ]]; then
    echo -e "${RED}❌ Tipo inválido: $RELEASE_TYPE${NC}"
    exit 1
fi

echo -e "${YELLOW}Versão: $VERSION${NC}"
echo -e "${YELLOW}Tipo: $RELEASE_TYPE${NC}\n"

# Criar diretórios
mkdir -p "$BUILD_DIR"
mkdir -p "$DIST_DIR"

# Função para limpeza
cleanup() {
    echo -e "\n${YELLOW}Limpando arquivos temporários...${NC}"
    rm -rf "$BUILD_DIR"
    echo -e "${GREEN}✅ Limpeza concluída${NC}"
}

trap cleanup EXIT

# 1. Verificar Git
echo -e "${YELLOW}[1/5] Verificando Git...${NC}"
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Não está em um repositório Git${NC}"
    exit 1
fi

# Verificar se há mudanças não commitadas
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}❌ Erro: Existem mudanças não commitadas${NC}"
    echo "Faça commit de todas as mudanças antes de criar um release"
    exit 1
fi

echo -e "${GREEN}✅ Git ok${NC}\n"

# 2. Criar tag
echo -e "${YELLOW}[2/5] Criando tag do Git...${NC}"
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo -e "${RED}❌ Tag v$VERSION já existe${NC}"
    exit 1
fi

git tag -a "v$VERSION" -m "Release v$VERSION" || {
    echo -e "${RED}❌ Erro ao criar tag${NC}"
    exit 1
}

echo -e "${GREEN}✅ Tag v$VERSION criada${NC}\n"

# 3. Build
echo -e "${YELLOW}[3/5] Compilando projeto...${NC}"

if [ "$RELEASE_TYPE" != "code" ]; then
    npm run build 2>&1 | tail -5
    echo -e "${GREEN}✅ Build concluído${NC}\n"
else
    echo -e "${GREEN}⊘ Skipado (código apenas)${NC}\n"
fi

# 4. Criar pacotes
echo -e "${YELLOW}[4/5] Criando pacotes...${NC}"

# Verificar se zip está disponível
if ! command -v zip &> /dev/null; then
    echo -e "${RED}❌ ERRO: 'zip' não está instalado${NC}"
    echo -e "${YELLOW}Instale com:${NC}"
    echo -e "  Arch/Manjaro: sudo pacman -S zip"
    echo -e "  Ubuntu/Debian: sudo apt install zip"
    echo -e "  macOS: brew install zip"
    echo -e "  Fedora: sudo dnf install zip"
    exit 1
fi

# Nome base
RELEASE_NAME="json-search-engine-v$VERSION"

case "$RELEASE_TYPE" in
    full)
        # Release completo
        echo "  → Criando pacote completo..."
        
        # Preparar diretório temp
        TEMP_DIR="$BUILD_DIR/$RELEASE_NAME"
        mkdir -p "$TEMP_DIR"
        
        # Copiar arquivos
        cp -r "$PROJECT_DIR"/{app,components,lib,public,styles,hooks,types,locales} "$TEMP_DIR/" 2>/dev/null || true
        cp -r "$PROJECT_DIR"/.next "$TEMP_DIR/" 2>/dev/null || true
        cp "$PROJECT_DIR"/{package.json,package-lock.json,tsconfig.json,next.config.mjs,tailwind.config.cjs,postcss.config.mjs,README.md,.gitignore} "$TEMP_DIR/" 2>/dev/null || true
        cp "$PROJECT_DIR"/auto-start.{sh,bat} "$TEMP_DIR/" 2>/dev/null || true
        
        # Criar arquivo de release notes
        cat > "$TEMP_DIR/RELEASE_NOTES.md" << EOF
# Release v$VERSION

Data: $(date '+%d/%m/%Y %H:%M:%S')

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
EOF

        # Criar ZIP
        cd "$BUILD_DIR"
        zip -r "$DIST_DIR/$RELEASE_NAME-complete.zip" "$RELEASE_NAME" > /dev/null
        echo -e "    ${GREEN}✅ $RELEASE_NAME-complete.zip${NC}"
        cd "$PROJECT_DIR"
        ;;
        
    web)
        # Release apenas web (build compilado)
        echo "  → Criando pacote web..."
        
        TEMP_DIR="$BUILD_DIR/$RELEASE_NAME-web"
        mkdir -p "$TEMP_DIR"
        
        if [ ! -d "$PROJECT_DIR/.next" ]; then
            echo -e "${RED}❌ Build não encontrado. Execute 'npm run build' primeiro${NC}"
            exit 1
        fi
        
        cp -r "$PROJECT_DIR"/.next "$TEMP_DIR/"
        cp -r "$PROJECT_DIR"/public "$TEMP_DIR/" 2>/dev/null || true
        cp "$PROJECT_DIR"/package.json "$TEMP_DIR/"
        cp "$PROJECT_DIR"/README.md "$TEMP_DIR/"
        
        cd "$BUILD_DIR"
        zip -r "$DIST_DIR/$RELEASE_NAME-web.zip" "$RELEASE_NAME-web" > /dev/null
        echo -e "    ${GREEN}✅ $RELEASE_NAME-web.zip${NC}"
        cd "$PROJECT_DIR"
        ;;
        
    code)
        # Release apenas código
        echo "  → Criando pacote de código..."
        
        TEMP_DIR="$BUILD_DIR/$RELEASE_NAME-code"
        mkdir -p "$TEMP_DIR"
        
        cp -r "$PROJECT_DIR"/{app,components,lib,public,styles,hooks,types,locales} "$TEMP_DIR/" 2>/dev/null || true
        cp "$PROJECT_DIR"/{package.json,package-lock.json,tsconfig.json,next.config.mjs,tailwind.config.cjs,postcss.config.mjs,README.md,.gitignore} "$TEMP_DIR/" 2>/dev/null || true
        cp "$PROJECT_DIR"/auto-start.{sh,bat} "$TEMP_DIR/" 2>/dev/null || true
        
        cd "$BUILD_DIR"
        zip -r "$DIST_DIR/$RELEASE_NAME-code.zip" "$RELEASE_NAME-code" > /dev/null
        echo -e "    ${GREEN}✅ $RELEASE_NAME-code.zip${NC}"
        cd "$PROJECT_DIR"
        ;;
esac

echo -e "${GREEN}✅ Pacotes criados${NC}\n"

# 5. Informações finais
echo -e "${YELLOW}[5/5] Gerando informações...${NC}"

# Calcular tamanho dos pacotes
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}📊 RESUMO DO RELEASE${NC}"
echo -e "${GREEN}================================${NC}\n"

echo -e "${BLUE}Versão:${NC} v$VERSION"
echo -e "${BLUE}Tipo:${NC} $RELEASE_TYPE"
echo -e "${BLUE}Data:${NC} $(date '+%d/%m/%Y %H:%M:%S')"
echo -e "${BLUE}Git Tag:${NC} v$VERSION"
echo -e "\n${BLUE}Arquivos gerados:${NC}"

for file in "$DIST_DIR"/*; do
    if [ -f "$file" ]; then
        size=$(du -h "$file" | cut -f1)
        filename=$(basename "$file")
        echo -e "  📦 $filename (${size})"
    fi
done

echo -e "\n${BLUE}Localização:${NC} $DIST_DIR/"

echo -e "\n${GREEN}✅ RELEASE CRIADO COM SUCESSO!${NC}\n"

echo -e "${YELLOW}Próximos passos:${NC}"
echo -e "  1. Revisar os arquivos em: $DIST_DIR/"
echo -e "  2. Fazer push da tag: git push origin v$VERSION"
echo -e "  3. Criar release no GitHub com os arquivos ZIP"
echo -e "  4. Anunciar o novo release\n"

echo -e "${BLUE}Comandos úteis:${NC}"
echo -e "  git push origin v$VERSION          # Enviar tag"
echo -e "  git log -1 --oneline               # Ver último commit"
echo -e "  git tag -l                         # Listar tags\n"
