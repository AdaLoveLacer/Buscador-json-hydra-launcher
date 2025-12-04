# 🔍 Buscador JSON Hydra Launcher

Um poderoso motor de busca web para encontrar conteúdo em arquivos JSON do Hydra Launcher. Busque títulos, termos e acesse links magnéticos de torrent diretamente.

## ✨ Funcionalidades

### 🔎 Busca Avançada
- **Busca em tempo real** com debounce de 300ms para máxima performance
- **Suporte a JSONs grandes** (até 250MB) sem travamentos
- **Busca profunda** em estruturas complexas de JSON
- Resultados limitados a 100 para melhor performance
- Indicador visual "Buscando..." durante processamento

### 📤 Carregamento de Dados
- **Upload de arquivo** - Selecione arquivos JSON locais
- **Carregamento por URL** - Cole links diretos para JSONs
- **Atualização de URLs** - Recarregue dados com novo botão de refresh
- **Persistência** - Dados salvos automaticamente no IndexedDB (250MB+)

### 🔗 Links Magnéticos
- **Abrir com cliente torrent** - Clique no ícone download para abrir automaticamente
- **Copiar link** - Copie links magnéticos para clipboard
- **Exibição clara** - Mostra todos os links disponíveis por item

### 💾 Armazenamento
- **IndexedDB** - Suporta até 250MB de dados (sem limite do localStorage)
- **Persistência automática** - Arquivos salvos e recuperados ao recarregar
- **Gerenciamento de arquivos** - Remova arquivos individuais

### 🎨 Interface
- **Tema dark** com suporte a múltiplas paletas de cores
- **Seletor de tema** - Customize cores do projeto
- **Interface responsiva** - Otimizada para desktop
- **Animações suaves** - Transições fluidas e indicadores visuais

### 📊 Exportação
- **Download JSON** - Exporte resultados de busca em formato JSON

## 🚀 Como Utilizar

### Pré-requisitos
- **Node.js** v18+ (verificar com `node --version`)
- **npm** (incluído com Node.js)
- Git (para clonar o repositório)

### Linux/macOS

#### 1. **Instalação Rápida**
```bash
cd json-search-engine
chmod +x auto-start.sh
./auto-start.sh
```

O script irá:
- Verificar e instalar dependências Node.js
- Iniciar o servidor Next.js
- Abrir o navegador automaticamente em http://localhost:3000

#### 2. **Instalação Manual**
```bash
cd json-search-engine
npm install
npm run dev
```

Depois abra http://localhost:3000 no navegador.

### Windows

#### 1. **Instalação Rápida**
Duplo clique em `auto-start.bat`

O script irá:
- Verificar e instalar dependências Node.js
- Iniciar o servidor Next.js
- Abrir o navegador automaticamente

#### 2. **Instalação Manual**
```powershell
cd json-search-engine
npm install
npm run dev
```

Depois abra http://localhost:3000 no navegador.

## 📖 Guia de Uso

### Adicionando Arquivos

#### Via Upload Local
1. Na seção **"Adicionar JSON"** à esquerda
2. Clique na área tracejada ou arraste um arquivo `.json`
3. Arquivo é carregado automaticamente

#### Via URL
1. Cole a URL do arquivo JSON no campo de texto
2. Clique em **"Carregar JSON"**
3. Aguarde o carregamento

### Buscando

1. **Digite um termo** no campo de busca
2. **Aguarde 300ms** (busca com debounce automático)
3. **Veja os resultados** abaixo

### Abrindo Torrent

Para cada resultado encontrado:
- 🔗 Clique no ícone de **download** (📥) para abrir no cliente torrent
- 📋 Clique em **copy** para copiar o link magnético

### Atualizando Dados

Para arquivos carregados por URL:
1. Passe o mouse sobre o arquivo na lista
2. Clique no ícone de **refresh** (🔄)
3. Dados são recarregados automaticamente

### Removendo Arquivos

1. Passe o mouse sobre o arquivo na lista
2. Clique no ícone de **trash** (🗑️)
3. Arquivo é removido

### Exportando Resultados

1. Após buscar, clique em **"Download JSON"**
2. Um arquivo com os resultados é baixado

## ⚙️ Configuração

### Variáveis de Ambiente (Opcional)

Crie um arquivo `.env.local`:

```bash
# Porta customizada (padrão: 3000)
NEXT_PUBLIC_PORT=3000
```

### Build para Produção

```bash
npm run build
npm run start
```

## 📊 Especificações Técnicas

### Stack
- **Frontend**: Next.js 16 com React 19
- **Armazenamento**: IndexedDB (250MB+)
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: React Hooks
- **Performance**: Debounce, memoization, early stopping

### Performance
- Busca com debounce de 300ms
- Limite de 100 resultados por busca
- Profundidade máxima de 20 níveis em JSON
- Early stopping para evitar processing desnecessário
- Detecção de referências circulares

### Suporte de Navegadores
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 🐛 Troubleshooting

### Porta 3000 já está em uso

**Linux/macOS:**
```bash
# Matar processo na porta 3000
kill $(lsof -t -i:3000)
```

**Windows:**
```powershell
# Matar processo na porta 3000
taskkill /F /IM node.exe
```

### Erro ao carregar JSON

Verifique se:
- [ ] O arquivo/URL é um JSON válido
- [ ] A URL é acessível publicamente (sem CORS bloqueado)
- [ ] O arquivo não ultrapassa 250MB

### Dados não salvam

Verifique:
- [ ] IndexedDB está habilitado no navegador
- [ ] Não há extensões bloqueando storage
- [ ] Espaço em disco disponível

### Busca lenta

A busca é otimizada para:
- Arquivos até 250MB funcionam bem
- JSONs muito profundos (>20 níveis) são truncados
- Limite de 100 resultados reduz processamento

## 📁 Estrutura do Projeto

```
json-search-engine/
├── app/
│   ├── page.tsx              # Página principal
│   └── layout.tsx            # Layout global
├── components/
│   ├── search-results.tsx    # Exibição de resultados
│   ├── json-uploader.tsx     # Upload de arquivos
│   ├── theme-selector.tsx    # Seletor de temas
│   └── ui/                   # Componentes UI reutilizáveis
├── lib/
│   ├── storage.ts            # IndexedDB wrapper
│   └── ...
├── auto-start.sh             # Script de inicialização (Linux/macOS)
├── auto-start.bat            # Script de inicialização (Windows)
└── package.json              # Dependências
```

## 🔐 Privacidade

- ✅ Todos os dados são armazenados **localmente** no seu navegador
- ✅ Nenhum dado é enviado para servidores
- ✅ Busca acontece **100% no cliente**
- ✅ Arquivos JSON não são expostos

## 📝 Licença

Este projeto é de código aberto. Use livremente.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou PRs.

## 📞 Suporte

Encontrou um bug? Abra uma issue no GitHub!

---

**Desenvolvido com ❤️ para Hydra Launcher**

Versão: 1.0.0 | Última atualização: Dezembro 2025
