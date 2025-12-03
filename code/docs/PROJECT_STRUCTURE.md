# Estrutura do Projeto — Buscador-Json

Este documento descreve a estrutura principal do projeto, responsabilidades dos arquivos/pastas mais relevantes e um diagrama estrutural (Mermaid) para visualização rápida.

## Diagrama estrutural (Mermaid)

```mermaid
flowchart TD
  subgraph app_folder [app/]
    A1[layout.tsx]
    A2[page.tsx]
    A3[loading.tsx]
    A4[[locale]/page.tsx]
  end

  subgraph components_folder [components/]
    C1[search-bar.tsx]
    C2[advanced-filters.tsx]
    C3[download-card.tsx]
    C4[sources-manager.tsx]
    C5[search-stats.tsx]
    C6[file-uploader.tsx]
    C7[ui/*]-->|UI primitives|C7a[button.tsx/...]
  end

  subgraph lib_folder [lib/]
    L1[search.ts]
    L2[search-synonyms.ts] -->|merged into| L3[types.ts]
    L3[types.ts]
    L4[search-synonyms.ts]
    L5[idb.ts]
    L6[url-cache.ts]
    L7[utils.ts]
  end

  subgraph hooks_folder [hooks/]
    H1[use-data-state.ts]
    H2[use-app-state.tsx]
    H3[use-mobile.ts]
    H4[use-toast.ts]
  end

  subgraph dev_tools [dev/ & tools/]
    D1[generate_large_test.js]
    D2[large-test.json]
    T1[tools/recover.py]
    T2[tools/salvage_sqlite.py]
  end

  subgraph server [server files]
    S1[server.py]
    S2[server_api.py]
    S3[requirements.txt]
  end

  subgraph tests [tests/]
    TS1[search.test.ts]
  end

  subgraph public_and_styles [public/ & styles/]
    P1[public/]
    ST1[styles/globals.css]
    ST2[app/globals.css]
  end

  %% Relations
  A4 --> C1
  A2 --> C1
  A2 --> C3
  C1 --> L1
  C2 --> L1
  C3 --> L1
  C5 --> L1
  L1 --> L3
  L1 --> L6
  H1 --> L1
  H1 --> L5
  dev_tools --> server
  tests --> L1
  public_and_styles --> components_folder
  components_folder --> hooks_folder

  style L1 fill:#f9f,stroke:#333,stroke-width:1px
  style components_folder fill:#efe,stroke:#333,stroke-width:1px
  style app_folder fill:#eef,stroke:#333,stroke-width:1px
```

## Estrutura de Arquivos e Responsabilidades

### 1. Frontend (React/Next.js)

#### 1.1 App (`app/`)
- `layout.tsx`: Layout global e providers da aplicação
- `page.tsx`: Página raiz com redirecionamento para localidade
- `[locale]/page.tsx`: Página principal com interface de busca
- `loading.tsx`: Componente de loading para rotas

#### 1.2 Componentes (`components/`)
- `search-bar.tsx`: Barra de busca principal com debounce
- `advanced-filters.tsx`: Filtros avançados (data, tamanho, modo)
- `download-card.tsx`: Card de item de download
- `sources-manager.tsx`: Gerenciamento de fontes de dados
- `search-stats.tsx`: Estatísticas de busca
- `file-uploader.tsx`: Upload de arquivos de fonte
- `ui/`: Componentes UI base (buttons, inputs, etc)

#### 1.3 Biblioteca (`lib/`)
- `search.ts`: **Core da busca**
  - Normalização de texto
  - Cache (WeakMap + Map persistente)
  - Processamento de downloads
  - Sistema de pontuação (scoring)
  - Expansão de sinônimos
  - Debug helpers
- `types.ts`: Tipos TypeScript e utilitários
- `idb.ts`: Interface com IndexedDB
- `url-cache.ts`: Cache de URLs
- `utils.ts`: Funções utilitárias gerais

#### 1.4 Hooks (`hooks/`)
- `use-data-state.ts`: Estado global (gogData, sources)
- `use-app-state.tsx`: Estado da aplicação
- `use-mobile.ts`: Detecção mobile
- `use-toast.ts`: Sistema de notificações

### 2. Backend (Python/Flask)

#### 2.1 Servidor (`server/`)
- `server.py`: Servidor principal
- `server_api.py`: API REST
- `requirements.txt`: Dependências Python

#### 2.2 Ferramentas (`tools/`)
- `recover.py`: Recuperação de dados
- `salvage_sqlite.py`: Salvamento de SQLite

### 3. Desenvolvimento e Testes

#### 3.1 Dev (`dev/`)
- `generate_large_test.js`: Gerador de dados de teste
- `large-test.json`: Dados de teste

#### 3.2 Testes (`tests/`)
- `search.test.ts`: Testes unitários da busca

#### 3.3 Estilos (`styles/`)
- `globals.css`: Estilos globais
- `app/globals.css`: Estilos da aplicação

## Fluxo Principal de Dados

1. Usuário digita na barra de busca (`search-bar.tsx`)
2. Termo é normalizado e processado (`search.ts`)
3. Busca é executada nos dados em cache
4. Resultados são pontuados e ordenados
5. Interface atualiza com novos resultados

## Pontos de Atenção

1. **Performance**
   - Cache em dois níveis (WeakMap + Map)
   - Debounce na interface
   - Normalização de texto otimizada

2. **Internacionalização**
   - Suporte a múltiplas línguas
   - Normalização Unicode

3. **Manutenibilidade**
   - Testes unitários
   - Logs de debug
   - Tipagem TypeScript

## Sugestões de Melhorias

1. **Performance**
   - Implementar fuzzy matching
   - Otimizar cache para grandes datasets
   - Adicionar indexação de texto

2. **Features**
   - Expandir sistema de sinônimos
   - Adicionar filtros por categoria
   - Implementar histórico de busca

3. **Desenvolvimento**
   - Aumentar cobertura de testes
   - Documentação automática
   - Monitoramento de performance

## Como Iniciar o Desenvolvimento

```bash
# Frontend (na pasta code/)
npm install
npm run dev

# Backend (na pasta code/)
python -m venv .venv
source .venv/bin/activate  # ou .venv\Scripts\activate no Windows
pip install -r requirements.txt
python server_api.py
```