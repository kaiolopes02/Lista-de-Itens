# Graph Report - .  (2026-07-08)

## Corpus Check
- Corpus is ~11,556 words - fits in a single context window. You may not need a graph.

## Summary
- 79 nodes · 212 edges · 6 communities
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Firebase Sync & Sharing|Firebase Sync & Sharing]]
- [[_COMMUNITY_Item CRUD & Lista|Item CRUD & Lista]]
- [[_COMMUNITY_UI & Icons|UI & Icons]]
- [[_COMMUNITY_Storage & History|Storage & History]]
- [[_COMMUNITY_App Shell & Assets|App Shell & Assets]]
- [[_COMMUNITY_Theme System|Theme System]]

## God Nodes (most connected - your core abstractions)
1. `salvarEstado()` - 15 edges
2. `icone()` - 12 edges
3. `atualizarLista()` - 12 edges
4. `calcularTotais()` - 12 edges
5. `mostrarNotificacao()` - 10 edges
6. `compartilhar()` - 8 edges
7. `Lista de Compras` - 8 edges
8. `aoReceberAtualizacaoRemota()` - 7 edges
9. `handleFinalizarCompra()` - 7 edges
10. `carregarDadosUrl()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Lista de Compras` ----> `App Icon 192x192`  [INFERRED]
  index.html → assets/icon-192.png
- `Lista de Compras` ----> `App Icon 512x512`  [INFERRED]
  index.html → assets/icon-512.png
- `PWA Manifest` ----> `App Icon 192x192`  [INFERRED]
  index.html → assets/icon-192.png
- `PWA Manifest` ----> `App Icon 512x512`  [INFERRED]
  index.html → assets/icon-512.png
- `renderizarHistorico()` --calls--> `icone()`  [EXTRACTED]
  js/historico.js → js/icones.js

## Import Cycles
- None detected.

## Communities (6 total, 0 thin omitted)

### Community 0 - "Firebase Sync & Sharing"
Cohesion: 0.17
Nodes (16): fmt(), aoReceberAtualizacaoRemota(), carregarDadosUrl(), compartilhar(), gerarTextoLista(), mostrarIndicadorSala(), sincronizarSeNecessario(), aplicarEstadoExterno() (+8 more)

### Community 1 - "Item CRUD & Lista"
Cohesion: 0.30
Nodes (14): limparTodos(), manipularItem(), toggleItem(), toggleTodos(), atualizarLista(), calcularTotais(), formatarMoeda(), formatarPrecoUn() (+6 more)

### Community 2 - "UI & Icons"
Cohesion: 0.23
Nodes (12): icone(), ICONES, atualizarLabelsUnidade(), entrarModoEdicao(), excluirItem(), sairModoEdicao(), atualizarBotaoForm(), cancelarEdicao() (+4 more)

### Community 3 - "Storage & History"
Cohesion: 0.31
Nodes (7): abrirHistorico(), fecharHistorico(), renderizarHistorico(), carregarEstado(), carregarHistorico(), finalizarCompra(), removerEntradaHistorico()

### Community 4 - "App Shell & Assets"
Cohesion: 0.28
Nodes (9): Lista de Compras, Formulário de Item, Modal de Histórico, Toast de Notificação, PWA Manifest, Modal de Temas, Painel de Totais, App Icon 192x192 (+1 more)

### Community 5 - "Theme System"
Cohesion: 0.38
Nodes (6): abrirModalTema(), aplicarTema(), carregarTema(), fecharModalTema(), renderTemaGrade(), TEMAS

## Knowledge Gaps
- **9 isolated node(s):** `ICONES`, `TIPOS`, `FIREBASE_CONFIG`, `TEMAS`, `Formulário de Item` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `icone()` connect `UI & Icons` to `Item CRUD & Lista`, `Storage & History`, `Theme System`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `salvarEstado()` connect `Item CRUD & Lista` to `Firebase Sync & Sharing`, `UI & Icons`, `Storage & History`, `Theme System`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `calcularTotais()` connect `Item CRUD & Lista` to `Firebase Sync & Sharing`, `UI & Icons`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `ICONES`, `TIPOS`, `FIREBASE_CONFIG` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._