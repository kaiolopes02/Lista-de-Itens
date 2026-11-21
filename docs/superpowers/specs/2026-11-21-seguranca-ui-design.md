# Design — Hardening de segurança, integridade e UI

**Data:** 2026-11-21
**Abordagem aprovada:** A — hardening incremental + redesign acessível
**Base auditada:** commit `4844601`

## Objetivo

Corrigir os oito achados confirmados da auditoria sem trocar a stack (HTML/CSS/ESM nativo, Firebase RTDB, GitHub Pages) e melhorar acessibilidade, contraste e responsividade. Nenhum push sem autorização.

## Não objetivos

- Autenticação de usuários, service worker, bundler, framework ou dependências de runtime.
- Sincronização por item / resolução de conflitos (permanece last-write-wins).
- Migração destrutiva de salas antigas.

## Arquitetura

Um módulo puro novo, `js/validacao.js`, concentra schema, normalização e decodificação de snapshots. Não importa DOM nem Firebase, portanto é testável no Node. `storage.js`, `sync.js`, `historico.js` e `main.js` consomem esse módulo. Toda fonte não confiável (URL, Firebase, `localStorage`, histórico) passa pelo mesmo schema antes de virar estado ou markup.

Renderização dinâmica usa `textContent`/`createElement`. Dados numéricos validados podem ser formatados em template, mas nenhum texto vindo de fora entra em `innerHTML`.

## Modelo de dados

Item válido, sem campos extras:

| Campo | Regra |
|---|---|
| `id` | inteiro seguro > 0, único no snapshot |
| `nome` | string não vazia, ≤ 120 caracteres |
| `preco` | número finito ≥ 0 |
| `quantidade` | número finito > 0 |
| `unidade` | `un` ou `kg` |
| `incluido` | booleano |

Estado: `{ itens: Item[], temaAtual: string }`. `temaAtual` é normalizado para um dos nove ids conhecidos; desconhecido vira `azul`.

Snapshots Firebase podem omitir `itens` (o RTDB não armazena array vazio); isso significa lista vazia, não sala inexistente. Sala inexistente é `snapshot.val() === null`.

## Regras de fluxo

1. **Inicialização:** carregar e renderizar o estado local antes de qualquer URL. Nunca substituir estado local por causa de listener registrado.
2. **Sala:** `entrarSala` resolve `true` somente após o primeiro snapshot válido; `null` ou inválido resolve `false` após no máximo 8 s e desconecta. Falha não altera a lista local.
3. **Snapshot `?data=`:** decodificar, validar atomicamente; inválido é rejeitado por inteiro com aviso. Válido só substitui a lista local após confirmação quando a lista local não estiver vazia.
4. **Backup:** antes de substituir uma lista não vazia, gravar `listaCompras_backup` (uma entrada). `localStorage` corrompido também é preservado nessa chave e ignorado com segurança.
5. **Publicação:** `publicarEstado` devolve `false` em falha; `criarSala` só devolve id depois de `set` aceito; a UI nunca anuncia sucesso sem escrita confirmada.
6. **IDs:** novo id é `max(Date.now(), maiorId + 1)`, inteiro positivo. Handlers usam `Number.isSafeInteger`, não truthiness.
7. **Salas:** id novo = 16 bytes de `crypto.getRandomValues` em base64url (22 caracteres). Links novos usam `#sala=`/`#data=` (fragmento não vai em logs/referrer). Leitura aceita `?sala=`/`?data=` legados.
8. **Multi-aba:** evento `storage` em `listaCompras_v2` recarrega estado e re-renderiza.

## UI e acessibilidade

- Dois modais viram `<dialog>` nativo com `showModal()`: foco contido, `Escape` e fundo inerte sem código manual.
- Marcar item vira `<button aria-pressed>`; cada linha recebe `role="listitem"`.
- Botões de ícone recebem `aria-label`; estado marcado do histórico recebe texto para leitor de tela.
- Alvos de toque mínimo 44×44 px; `:focus-visible` com contorno de 3 px.
- Contraste: cores primárias escuras o suficiente para texto branco a ≥ 4.5:1; tema escuro usa `--cor-sobre-primaria` escuro nos botões.
- Mobile: sem overflow horizontal em 320–430 px; métricas empilham sem recorte.
- Desktop: `max-width: 900px` e grid de duas colunas (formulário à esquerda, lista à direita) a partir de 900 px.
- `prefers-reduced-motion` permanece respeitado.

## Testes

- `node --test` com `package.json` sem dependências (`"type": "module"`).
- Unitários de `js/validacao.js`: todos os campos, `Infinity`/`NaN`, id duplicado/zero, campos extras, snapshot vazio, decodificação base64url/legada/inválida.
- Unitários de `js/storage.js` com `localStorage` falso: estado corrompido não derruba o app, snapshot inválido é rejeitado, substituição cria backup.
- E2E headless (Chrome via `--dump-dom`): render vazio, payload XSS aparece como texto e sobrevive a reload, snapshot incompleto é rejeitado sem crash.
- Verificação manual documentada no README para Firebase e responsividade.

## Riscos residuais

- Last-write-wins entre clientes permanece.
- Regras RTDB precisam de `firebase deploy` para valer em produção.
- Links antigos de 6 caracteres continuam válidos e fracos até serem recriados.
- Sem CSP; GitHub Pages não permite headers customizados.
