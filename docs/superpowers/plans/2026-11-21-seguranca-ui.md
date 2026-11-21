# Hardening de segurança, integridade e UI — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os oito achados confirmados da auditoria e melhorar acessibilidade/contraste/responsividade sem trocar a stack.

**Architecture:** Um módulo puro `js/validacao.js` valida toda entrada externa; storage/sync/main/histórico consomem o mesmo schema. Renderização usa DOM seguro. Modais usam `<dialog>` nativo.

**Tech Stack:** HTML, CSS, ESM nativo, Firebase RTDB 10.12.2, Node `node:test`, Chrome headless.

**Spec:** `docs/superpowers/specs/2026-11-21-seguranca-ui-design.md`

## Global Constraints

- Sem dependências de runtime, bundler ou framework.
- Sem push; commits locais apenas.
- Nenhum texto externo em `innerHTML`.
- Schema do cliente e regras RTDB com os mesmos campos obrigatórios.
- `prefers-reduced-motion` preservado.

## Review Focus

- Item externo com campo ausente, `NaN`, `Infinity`, id duplicado ou campo extra: deve ser rejeitado sem crash.
- Lista local não vazia + link compartilhado: nunca perder a lista sem confirmação/backup.
- Sala inexistente, vazia ou offline: não substituir estado local nem anunciar sucesso.
- Nome/unidade com HTML ou aspas: renderizar como texto, sobreviver a reload.
- Viewport 320–430 px e teclado: sem overflow, foco visível, alvos ≥ 44 px.

---

### Task 1: Módulo de validação puro

**Files:**
- Create: `js/validacao.js`
- Test: `tests/validacao.test.js`
- Create: `package.json`

**Interfaces:**
- Produces: `UNIDADES`, `TEMAS_VALIDOS`, `MAX_NOME`, `validarItem(item): boolean`, `normalizarEstado(obj, { itensOpcionais }): {itens, temaAtual}|null`, `normalizarHistorico(lista): entrada[]`, `proximoId(itens): number`, `codificarSnapshot(obj): string`, `decodificarSnapshot(texto): object|null`.

- [ ] **Step 1: Criar `package.json`** com `"private": true`, `"type": "module"`, `"scripts": { "test": "node --test" }`.
- [ ] **Step 2: Escrever testes falhando** cobrindo item válido, cada campo inválido, `Infinity`/`NaN`, id 0/negativo/fracionário/duplicado, campo extra, `itensOpcionais`, snapshot vazio, ida-e-volta base64url, payload legado e inválido.
- [ ] **Step 3: Rodar `npm test`** e confirmar falha por módulo ausente.
- [ ] **Step 4: Implementar `js/validacao.js`** com as assinaturas acima.
- [ ] **Step 5: `npm test`** passa.
- [ ] **Step 6: Commit** `feat: add strict state validation module`.

### Task 2: Storage com validação, backup e recuperação

**Files:**
- Modify: `js/storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `normalizarEstado`, `normalizarHistorico`, `proximoId`.
- Produces: `prepararEstadoExterno(dados, {itensOpcionais}): estado|null`, `substituirEstado(normalizado): void`, `carregarEstado(): boolean`, `aplicarEstadoExterno(dados): boolean`.

- [ ] **Step 1: Testes falhando** com `localStorage` falso: local corrompido não lança e preserva `listaCompras_backup`; externo inválido é rejeitado; externo válido substitui e faz backup do anterior; histórico inválido é filtrado.
- [ ] **Step 2: Implementar** carregamento validado, backup antes de substituir lista não vazia, `prepararEstadoExterno`/`aplicarEstadoExterno` atômicos.
- [ ] **Step 3: `npm test`** passa.
- [ ] **Step 4: Commit** `fix: validate and back up persisted state`.

### Task 3: Renderização segura

**Files:**
- Modify: `js/lista.js`, `js/historico.js`, `js/itens.js`

**Interfaces:**
- Consumes: `proximoId`, `normalizarHistorico`.
- Produces: `atualizarLista()` sem interpolação de texto externo; `excluirItem(id)` afeta um único id.

- [ ] **Step 1: Reescrever itens da lista** com `createElement`/`textContent`; botão de marcar com `aria-pressed`; `role="listitem"`.
- [ ] **Step 2: Histórico** usa `textContent` para nome, quantidade e unidade; valida entradas antes de renderizar.
- [ ] **Step 3: `manipularItem`** usa `proximoId(state.itens)`.
- [ ] **Step 4: Rodar `npm test`** e checagem sintática.
- [ ] **Step 5: Commit** `fix: render untrusted values as text`.

### Task 4: Sync Firebase seguro

**Files:**
- Modify: `js/sync.js`, `database.rules.json`

**Interfaces:**
- Consumes: `normalizarEstado`.
- Produces: `entrarSala(salaId, onUpdate): Promise<boolean>`, `publicarEstado(estado): Promise<boolean>`, `criarSala(estado, onUpdate): Promise<string|null>`, `gerarIdSala(): string`.

- [ ] **Step 1: `gerarIdSala`** com 16 bytes e base64url.
- [ ] **Step 2: `entrarSala`** resolve após primeiro snapshot válido, com timeout de 8 s e desconexão em falha.
- [ ] **Step 3: `publicarEstado`** devolve `false` em falha; `criarSala` só devolve id após `set` aceito.
- [ ] **Step 4: Regras** exigem todos os campos do item (`hasChildren`), id inteiro positivo e `temaAtual` na lista.
- [ ] **Step 5: Validar JSON** e commit `fix: harden room sync and RTDB rules`.

### Task 5: Startup, links e compartilhamento

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `carregarEstado`, `prepararEstadoExterno`, `substituirEstado`, `entrarSala`, `criarSala`, `publicarEstado`, `codificarSnapshot`, `decodificarSnapshot`.

- [ ] **Step 1:** carregar/renderizar local antes de ler URL; nunca pular `carregarEstado`.
- [ ] **Step 2:** ler `#sala`/`#data` e cair para `?sala`/`?data`.
- [ ] **Step 3:** confirmar substituição de lista não vazia; erro visível em payload inválido.
- [ ] **Step 4:** links novos em fragmento; falha de publicação visível e sem link de sucesso.
- [ ] **Step 5:** handlers com `Number.isSafeInteger`; evento `storage` para multi-aba; indicador de sala via `textContent`.
- [ ] **Step 6:** Checagem sintática e commit `fix: preserve local data and report sync failures`.

### Task 6: Acessibilidade e UI

**Files:**
- Modify: `index.html`, `css/base.css`, `css/layout.css`, `css/components.css`, `css/tema.css`
- Modify: `js/tema.js`, `js/historico.js`

- [ ] **Step 1:** `<dialog>` nativo para temas e histórico; `showModal`/`close`; remover overlays.
- [ ] **Step 2:** `aria-label` em botões de ícone; `sr-only`; `aria-pressed`; `role="listitem"`.
- [ ] **Step 3:** alvos ≥ 44 px, `:focus-visible`, contraste AA e `--cor-sobre-primaria`.
- [ ] **Step 4:** layout mobile sem overflow e grid desktop de duas colunas.
- [ ] **Step 5:** Chrome headless em 390 px e 1440 px sem overflow; commit `feat: improve accessibility and responsive layout`.

### Task 7: E2E headless

**Files:**
- Create: `tests/e2e.test.js`

- [ ] **Step 1:** servidor HTTP estático em porta efêmera e Chrome `--dump-dom` com perfil temporário.
- [ ] **Step 2:** casos: lista vazia; payload XSS renderizado como texto; persistência após reload; snapshot incompleto rejeitado sem crash.
- [ ] **Step 3:** `npm test` passa (ou E2E é ignorado com mensagem se Chrome ausente).
- [ ] **Step 4:** Commit `test: add headless render and XSS regression checks`.

### Task 8: README e relatório final

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** atualizar funcionalidades, modelo de dados, regras, links em fragmento, testes e limitações.
- [ ] **Step 2:** documentar comandos de verificação reais (`npm test`, Chrome, Firebase).
- [ ] **Step 3:** rodar todas as verificações e registrar resultados.
- [ ] **Step 4:** Commit `docs: document hardening and verification`.
