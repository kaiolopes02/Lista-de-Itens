# Arquitetura — Auditoria de Segurança Run 3

**Alvo:** Lista de Compras (`Lista-de-Itens`)
**Data:** 2026-11-21
**Escopo:** aplicação web estática, Firebase Realtime Database, snapshots `?data=`, persistência local, interface e histórico.

## 1. Aplicação e stack

Aplicação PWA estática de uma coluna para organizing compras. Não há servidor próprio, bundler, framework ou pipeline de build. O navegador executa JavaScript ESM nativo; o Firebase Web SDK 10.12.2 é carregado por CDN. O estado atual é persistido em `localStorage`; salas compartilhadas são gravadas no Realtime Database. A publicação é estática no GitHub Pages.

## 2. Atores e modelo de confiança

- **Visitante local:** controla o próprio navegador e o conteúdo inserido no formulário.
- **Participante de sala:** possui um link de sala e pode ler/gravar o snapshot remoto correspondente; não há identidade Firebase Authentication.
- **Atacante sem posse do segredo:** pode criar links, tentar ler/escrever caminhos RTDB e abrir snapshots `?data=` em uma vítima.
- **Firebase/console:**Hosts de dados e regras; as regras versionadas em `database.rules.json` constituem a barreira do servidor.

Decisão vigente do produto: manter salas anônimas, mas migrar para IDs de 128 bits em fragmentos de URL, de modo que o link funcione como capability secreta sem exigir Authentication.

## 3. Superfícies de entrada e sinks

| Entrada | Origem | Sink/efeito |
|---|---|---|
| `?sala=` | URL | chave RTDB, indicador de sala, listener remoto |
| `?data=` | URL | JSON decodificado → estado em memória → `localStorage` → `innerHTML` |
| Sala RTDB | Firebase | `onValue` → `aplicarEstadoExterno` → estado/DOM/histórico |
| Formulário | usuário | `parseFloat` → item → `localStorage` → Firebase/DOM |
| `localStorage` | dados persistidos/localStorage adulterado | carregamento sem validação → DOM |
| Histórico | `localStorage` | renderização por `innerHTML` |
| Parâmetros Firebase | `js/sync.js` | `ref(_db, listas/${salaId})` |

Sinks relevantes: `innerHTML` em `js/lista.js`, `js/historico.js`, `js/tema.js` e `js/main.js`; `localStorage.setItem`; `set(_salaRef, ...)`; parâmetros de URL usados para montar paths Firebase.

## 4. Persistência, sincronização e ciclo de vida

1. `DOMContentLoaded` inicializa ícones e Firebase.
2. `carregarDadosUrl()` tenta entrar em uma sala ou importar `?data=`.
3. Se a URL não carregou dados, `carregarEstado()` lê `listaCompras_v2` (fallback `listaCompras`).
4. `carregarTema()` aplica/persiste o tema.
5. A lista é renderizada por `atualizarLista()` e os totais por `calcularTotais()`.
6. Alterações locais persistem o estado inteiro e, quando em sala, republicam o snapshot inteiro via `set()`.
7. `onValue` recebe o snapshot remoto e substitui o estado local.
8. Finalizar uma compra move itens para `listaCompras_historico` (até cinco entradas).

## 5. Validação existente

- `aplicarEstadoExterno` exige apenas `id` numérico e `nome` string não vazio.
- `database.rules.json` valida valores presentes, mas não exige a presença de todos os campos do item.
- O formulário valida nome, preço e quantidade, mas aceita valores não finitos.
- Há escape de `nome` no DOM; outros campos externos não são validados/escapados de modo compatível.
- IDs de sala aceitam `[A-Za-z0-9_-]{2,64}`; IDs novos ainda usam seis caracteres de `Math.random()`.

## 6. Acessibilidade e UX observadas

- Métricas usam `flex-wrap`, mas no viewport de 390 px podem exceder a largura útil; em telas estreitas mudam para coluna.
- Botões de ícone caem para 34×34 px no mobile, abaixo do alvo recomendado de 44×44 px.
- Diálogos têm `role="dialog"`/`aria-modal`, mas não têm `aria-labelledby`, foco inicial, contenção/restauro de foco ou `inert` no fundo.
- Itens da lista usam `role="list"` sem `role="listitem"`.
- O controle de marcação é um `div` não focalizável, activado apenas por clique.
- Botões dependem de `title`, sem `aria-label` consistente.
- Estado marcado/desmarcado do histórico depende visualmente de opacidade/risco, sem equivalente textual.
- `prefers-reduced-motion` já é respeitado globalmente.

## 7. Baseline e auditorias anteriores

Aplicações comparáveis de lista de compras geralmente aceitam dados locais e collaboration por link; o risco principal é tratar o link como segredo sem entropia suficiente e aceitar snapshots sem schema completo. RTDB anônimo com escrita pública é adequado apenas quando o caminho funciona como capability de alta entropia e a validação é estrita no cliente e no servidor.

Auditorias anteriores no repositório:
- Run 1: corrigiu XSS de `?sala=`, race de publicação e filtro inicial de estado externo.
- Run 2: corrigiu bypass de validação `?data=`, injeção de path de sala e adicionou `database.rules.json`.

Esta run procura lacunas restantes: payload completo malformado, perda destrutiva de estado local, falhas de publicação mascaradas, IDs não únicos, números não finitos, sincronização entre abas, semântica e responsividade.

## 8. Caminhos prioritários

- `js/main.js`: startup, URL, compartilhamento, callbacks e wiring.
- `js/storage.js`: schema, persistência, estado externo e histórico.
- `js/sync.js`: geração/entrada de sala, publicação e recepção RTDB.
- `js/itens.js`: validação do formulário e CRUD.
- `js/lista.js`: renderização e totais.
- `js/historico.js`: renderização de entradas anteriores.
- `js/tema.js`: nove temas e modal.
- `database.rules.json`: schema e autorização no RTDB.
- `index.html`, `css/base.css`, `css/layout.css`, `css/components.css`, `css/tema.css`: estrutura, tokens, componentes e responsividade.
