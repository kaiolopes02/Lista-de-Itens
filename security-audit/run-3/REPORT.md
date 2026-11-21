# Relatório de Segurança — Lista de Compras (Run 3)

**Data:** 2026-11-21  
**Commit auditado:** `4844601`  
**Escopo:** aplicação web, snapshots `?data=`, Firebase Realtime Database, `localStorage`, histórico, interface e responsividade.

## Resumo executivo

A aplicação já possui-schema no servidor, validação inicial de estado, escape do nome do item, escape do ID de sala exibido e uso de JSON para evitar execução direta de HTML em vários campos. A auditoria Nevertheless encontrou **8 questões confirmadas**: duas vulnerabilidades de script/integidade no caminho de import, três disponibilidade/corrupção remotely reachable, duas falhas de fluxo de negócio e uma entropia insuficiente do segredo de sala. O achado específico sobre `Infinity` no formulário foi **rejeitado** após reprodução no Chrome; a variante por `?data=` é real e está coberta por outro achado.

O risco mais urgente é a combinação de validação parcial com `innerHTML`: um snapshot forjado pode executar JavaScript na origem ou persistir um estado que deixa o aplicativo inutilizável. O segundo risco prioritário é perda silenciosa: abrir sala inexistente ou snapshot vazio substitui a lista local persistida.

## Baseline

Aplicações de lista de compras geralmente aceitam dados locais e collaboration por link. O padrão anônimo do Firebase é adequado quando o caminho funciona como **capability secreta de alta entropia** e quando cliente e servidor exigem o mesmo schema. A implementação atual usa apenas cerca de 31 bits (`Math.random` com seis caracteres base-36), abaixo do modelo de link secreto escolhido.

## Achados confirmados

| ID | Severidade | Tipo | Título | Local principal |
|---|---|---|---|---|
| RUN3-001 | MEDIUM | Segurança | DOM XSS persistente por campos de `?data=` | `js/storage.js`, `js/lista.js` |
| RUN3-002 | MEDIUM | Segurança/disponibilidade | Snapshot externo malformado deixa o cliente inutilizável | `js/storage.js`, `js/lista.js` |
| RUN3-003 | MEDIUM | Segurança/integridade | Regras RTDB aceitam itens incompletos e envenenam peers | `database.rules.json` |
| RUN3-004 | MEDIUM BUG | Perda de dados | Abrir sala inexistente apaga a lista local | `js/sync.js`, `js/main.js` |
| RUN3-005 | MEDIUM BUG | Perda de dados | Snapshot `?data=` vazio apaga a lista local sem confirmação | `js/main.js`, `js/storage.js` |
| RUN3-006 | MEDIUM BUG | Fluxo de negócio | Falha de publicação Firebase é informada como sucesso | `js/sync.js`, `js/main.js` |
| RUN3-007 | MEDIUM BUG | Perda de dados | IDs duplicados/zero causam exclusão múltipla e item inacessível | `js/storage.js`, `js/itens.js` |
| RUN3-008 | MEDIUM | Segurança por modelo | ID de sala possui apenas ~31 bits de entropia | `js/sync.js` |

## Detalhes e recomendações

### RUN3-001 — DOM XSS persistente por campos de `?data=`

**Fluxo:** `js/main.js:203-209` → `js/storage.js:48-56` → `js/lista.js:66-81`.

`aplicarEstadoExterno` exige apenas `id` numérico e `nome` string não vazia. `preco` ou `quantidade` podem ser strings com HTML; `String.prototype.toLocaleString()` preserva a string e o resultado entra em `innerHTML`. `unidade` também entra sem escape no histórico. O estado é persistido, portanto a execução sobrevive a reload.

**Reprodução validada:** payload com `preco: '<img src=x onerror=alert(document.domain)>'` executou em Chrome; a persistência foi observada após reload.

**Correção:** schema único e atômico para URL, Firebase, `localStorage` e histórico; exigir todos os campos, números finitos, unidade permitida, booleano e IDs únicos; rejeitar snapshot inválido inteiro; renderizar valores externos com `textContent`.

### RUN3-002 — Snapshot externo malformado deixa o cliente inutilizável

**Fluxo:** `js/main.js:203-209` → `js/storage.js:48-56` → `js/lista.js:73-77`.

Item sem `preco` é aceito e persistido; `undefined.toLocaleString()` lança na renderização antes de os handlers serem registrados. Payload com `1e309` vira `Infinity` por `JSON.parse`, é aceito e `JSON.stringify` o converte em `null`; o próximo startup carrega `null` e falha em `null.toLocaleString()`.

**Correção:** `Number.isFinite` para todo número; validação antes de substituir/persistir; recuperação segura de `localStorage` corrompido.

### RUN3-003 — Regras RTDB aceitam itens incompletos

**Fluxo:** `database.rules.json:5-30` → `js/storage.js:48-56` → `js/lista.js:73-77`.

As regras verificam campos presentes, mas não exigem sua presença. Um participante que conhece a sala pode gravar `{id, nome}`; o cliente aceita e quebra ao formatar o preço ausente. A semântica da regra e o crash foram confirmados; esta run não gravou no Firebase de produção.

**Correção:** `.validate` no nível do item exigindo `['id','nome','preco','quantidade','unidade','incluido']`, alinhado ao validador do cliente.

### RUN3-004 — Sala inexistente apaga a lista local

**Fluxo:** `js/main.js:195-201` → `js/sync.js:77-82` → `js/main.js:221-223` → `js/tema.js:24-27`.

`entrarSala` retorna `true` apenas por registrar o listener. Startup pula `carregarEstado`; `carregarTema` persiste o estado inicial vazio. O snapshot Firebase `null` posterior é ignorado.

**Correção:** carregar o estado local primeiro; resolver entrada de sala somente após snapshot válido; sala vazia/nula deve falhar sem substituir a lista.

### RUN3-005 — Snapshot vazio apaga a lista local

**Fluxo:** `js/main.js:203-210` → `js/storage.js:49-56`.

Uma lista externa vazia é válida e substitui a atual. Não há confirmação nem backup.

**Correção:** preparar e validar o candidato antes da troca; confirmar quando a lista atual não estiver vazia; manter backup recuperável limitado.

### RUN3-006 — Falha Firebase apresentada como compartilhamento bem-sucedido

**Fluxo:** `js/main.js:149-153` → `js/sync.js:60-70` → `js/sync.js:99-111`.

`publicarEstado` captura e engole a rejeição. `criarSala` devolve o ID de qualquer forma e a interface mostra sucesso.

**Correção:** propagar erro ou retornar status explícito; `criarSala` só retorna ID após escrita aceita; mensagem de sucesso apenas após sucesso real.

### RUN3-007 — IDs duplicados/zero

**Fluxo:** `js/main.js:203-209` → `js/storage.js:48-56` → `js/main.js:270-278` → `js/itens.js:103-110`.

IDs externos não precisam ser únicos, positivos ou inteiros. O guard `!id` rejeita zero; `filter(i => i.id !== id)` remove todos os duplicados.

**Correção:** IDs únicos e inteiros positivos no schema; geração sem colisão; usar `Number.isSafeInteger` em vez de truthiness.

### RUN3-008 — Segredo de sala com ~31 bits

**Fluxo:** `js/sync.js:60-68` → `js/sync.js:116-123` → `js/main.js:140-153`.

`Math.random().toString(36).slice(2, 8)` gera seis caracteres base-36 (`36^6 ≈ 2,18 bilhões`) e não é CSPRNG. No modelo anônimo, o ID é a capability de acesso.

**Correção:** `crypto.getRandomValues` com pelo menos 128 bits, codificação URL-safe e capability no fragmento da URL para não vazar em logs/referrers HTTP.

## Achado rejeitado

### Formulário aceita `1e309` e persiste `Infinity`

**Rejeitado como descrito.** O Chrome impede que `1e309` permaneça em `input[type=number]`; o valor é esvaziado e o JavaScript existente rejeita `NaN`. A importação manual de `1e309` por `?data=` é válida e está registrada em RUN3-002.

## UX e acessibilidade confirmados

- Métricas causam overflow horizontal visual no viewport de 390 px e parecem visualmente estreitas no desktop.
- Botões mobile de ícone medem 34×34 px; Recommendation is minimum 44×44 px.
- Diálogos não têm `aria-labelledby`, foco inicial, contenção/restauro de foco ou `inert` no fundo.
- Itens usam `role="list"` sem `role="listitem"`.
- Marcação de item é um `div` não focalizável, operável apenas por clique.
- Botões de ícone dependem de `title`, sem `aria-label` consistente.
- Estado marcado/desmarcado do histórico depende de cor/opacidade/risco, sem equivalente textual.
- Vários pares primário/fundo não atingem 4.5:1 para texto normal; por exemplo, azul `#2196f3` sobre branco = 3.12:1, verde = 3.30:1, laranja = 2.37:1 e amarelo = 1.97:1.
- `prefers-reduced-motion` já está corretamente respeitado.

## Hardening notes (não são achados autônomos)

- **CSP:** GitHub Pages não permite headers customizados; uma meta CSP pode reduzir impacto de XSS, mas deve ser testada com Firebase/CDN.
- **Concorrência local/Firebase:** o modelo de snapshot inteiro é last-write-wins. Ele não preserva edições simultâneas de itens diferentes; uma melhoria exige operação por item ou resolução de conflito.
- **Regras em produção:** repetir `firebase deploy --only database` após alterar `database.rules.json` e verificar por comportamento anônimo.
- **Links antigos:** migração de IDs de seis caracteres deve considerar backward compatibility e URLs já compartilhadas.
- **Firebase/console:** regra restritiva deve listar explicitamente cada filho permitido.

## Positive patterns

- Estado não é interpolado diretamente a partir de `JSON.parse` sem passar por `aplicarEstadoExterno`.
- `nome` da lista e do histórico já é escapado.
- `salaId` é validado antes de compor path Firebase e escapado antes de exibição.
- Snapshot remoto idêntico ao local é ignorado, evitando rerender desnecessário.
- Regras limitam toda escrita à árvore `listas/$salaId` e bloqueiam a raiz.
- Histórico tem limite de cinco registros e cópia profunda da lista.
- `localStorage` usa `try/catch`, e o app respeita `prefers-reduced-motion`.

## Resultado da validação

- 3 exploradores de hunt Returns: DOM/client, lógica de negócio e validação de entrada.
- 3 validações adversariais independentes Returns para os grupos externos.
- 2 validações initially Received HTTP 429 e foram substituídas por uma nova validação agrupada.
- Reproduções em Chrome headless/CDP: XSS, estado incompleto, Infinity por URL, sala inexistente, snapshot vazio, IDs duplicados/zero, overflow e alvos de toque.
- `findings.json`: **PASS — 9 findings valid** no validador do skill.

## Limitações

- Nenhum dado real de usuário foi enviado ao Firebase de produção nesta run.
- A regra de produção foi verificada anteriormente por REST, mas esta run não repetiu escrita destrutiva.
- O comportamento multi-tab foi observado por modelagem da última gravação, não por uma suíte automatizada permanente.
- Cobertura de acessibilidade foi por semântica/foco/teclado/contraste medidos; não foi executado teste com leitor de tela real.
