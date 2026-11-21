# Detalhes dos Achados — Lista de Compras (Run 3)

> Os dados abaixo foram verificados contra o commit `4844601` e reproduzidos localmente quando possível. A aplicação é anônima por design; acesso por sala equivale a posse da capability da URL.

## RUN3-001 — DOM XSS persistente por campos de `?data=`

### Fluxo de dados

1. `js/main.js:203-209`, `carregarDadosUrl`: lê `?data=`, executa `atob`/`JSON.parse` e chama `aplicarEstadoExterno`.
2. `js/storage.js:48-56`, `aplicarEstadoExterno`: aceita item com `id` numérico e `nome` string; não valida `preco`, `quantidade`, `unidade`, `incluido` ou campos extras; persiste o resultado.
3. `js/lista.js:11-12`, `formatarMoeda`: `String.prototype.toLocaleString()` devolve a string recebida sem neutralizar HTML.
4. `js/lista.js:66-81`, `atualizarLista`: insere o resultado por `innerHTML`.
5. `js/historico.js:56-70`, `renderizarHistorico`: caminho equivalente para `unidade` após finalizar a compra.

### Payload

```js
const payload = {
  itens: [{
    id: 1,
    nome: 'x',
    preco: '<img src=x onerror=alert(document.domain)>',
    quantidade: 1,
    unidade: 'un',
    incluido: true,
  }],
  temaAtual: 'azul',
};
const data = btoa(encodeURIComponent(JSON.stringify(payload)));
// URL: ?data=<data>
```

### Impacto

Execução de JavaScript na origem da aplicação, com acesso às capacidades same-origin (`localStorage`, histórico, DOM e Firebase público configurado no cliente). O estado malicioso é persistido e sobrevive a reload.

### Mitigações verificadas

- O escape existente cobre apenas `nome`; não alcança `preco`, `quantidade` ou `unidade`.
- As regras RTDB não se aplicam ao caminho `?data=`.
- Não existe CSP que neutralize o HTML inline.

### Correção

Schema completo e atômico para todas as fontes; números finitos; IDs únicos; renderização de conteúdo externo por `textContent`.

---

## RUN3-002 — Snapshot externo malformado deixa o cliente inutilizável

### Fluxo de dados — item incompleto

1. `js/main.js:203-209` aceita `{itens:[{id:1,nome:'incomplete'}]}`.
2. `js/storage.js:51-53` aceita o item.
3. `js/storage.js:56` persiste o item.
4. `js/lista.js:73` chama `formatarMoeda(undefined)`.
5. `js/lista.js:11-12` lança em `undefined.toLocaleString()`.
6. `js/main.js:224` ocorre antes do wiring em `js/main.js:228-250`; os controles ficam inativos.

### Fluxo de dados — Infinity por JSON

1. `JSON.parse('{\"preco\":1e309}')` produz `Infinity`.
2. O filtro atual aceita o item.
3. `JSON.stringify` serializa `Infinity` como `null` em `localStorage`.
4. No startup seguinte, `js/storage.js:36` carrega o array sem revalidar.
5. `js/lista.js:12` lança em `null.toLocaleString()`.

### Impacto

Indisponibilidade persistente no navegador afetado. O estado corrompido permanece até reparação/limpeza manual.

### Correção

`Number.isFinite`, validação antes da persistência/substituição e recuperação segura do storage local.

---

## RUN3-003 — Regras RTDB aceitam itens incompletos

### Requisição

```http
PUT https://lista-de-itens-2a16b-default-rtdb.firebaseio.com/listas/<known-room>.json
Content-Type: application/json

{"itens":[{"id":1,"nome":"Item remoto"}],"temaAtual":"azul","ts":1}
```

### Fluxo de dados

1. `database.rules.json:5-6` concede `.write: true` no path da sala.
2. `database.rules.json:8-30` só executa `.validate` para filhos existentes; não exige todos os filhos.
3. O item `{id,nome}` satisfaz as validações presentes.
4. `js/storage.js:51-53` também o aceita.
5. `js/lista.js:73` tenta formatar o preço ausente e lança.

### Impacto

Qualquer participante que conheça a sala pode enviar estado que quebra os peers e persiste localmente neles. Limitado à sala conhecida.

### Nota de implantação

A regra no repositório é a fonte versionada. Esta run não escreveu em produção; a configuração ativa deve ser verificada por `firebase deploy --only database` e teste REST anônimo.

### Correção

```json
".validate": "newData.hasChildren(['id','nome','preco','quantidade','unidade','incluido'])"
```

no nível de cada item, mantendo as validações individuais.

---

## RUN3-004 — Sala inexistente apaga a lista local

### Sequência

1. Vítima possui item em `listaCompras_v2`.
2. Abre `?sala=ffffffffffffffffffffffffffffffff`.
3. `js/sync.js:77-82` valida apenas a sintaxe, registra o listener e retorna `true`.
4. `js/main.js:221-223` não executa `carregarEstado`.
5. `js/tema.js:24-27` aplica e persiste o `state.itens` inicial vazio.
6. O callback Firebase recebe `null`; `js/sync.js:122-128` o ignora.

### Impacto

Perda irrecuperável da lista local atual, sem confirmação ou backup.

### Correção

Carregar local primeiro; confirmar existência e validade da sala antes de tratar a entrada como carregada; nunca persistir o estado vazio inicial como substituto.

---

## RUN3-005 — Snapshot `?data=` vazio apaga a lista local

### Payload

```js
const payload = { itens: [], temaAtual: 'azul' };
const data = btoa(encodeURIComponent(JSON.stringify(payload)));
```

### Fluxo

`js/main.js:203-210` → `js/storage.js:49-56` → `js/main.js:221-223`.

### Impacto

A lista atual é substituída por uma lista vazia e persistida; continua vazia após reload.

### Correção

Candidato externo preparado e validado; confirmação para substituir lista local não vazia; backup de recuperação limitado.

---

## RUN3-006 — Falha Firebase apresentada como sucesso

### Fluxo

1. `js/main.js:149` chama `criarSala`.
2. `js/sync.js:67` aguarda `publicarEstado`.
3. `js/sync.js:103-111` executa `set`, captura a rejeição e resolve normalmente.
4. `js/sync.js:69` retorna `_salaId`.
5. `js/main.js:153-170` compartilha o link e mostra sucesso.

### Impacto

O usuário recebe um link aparentemente válido para uma sala ausente/não gravada e pode agir sobre uma garantia falsa de backup remoto.

### Correção

Propagar a falha; `criarSala` só retorna ID após `set` aceito; erro visível e ausência de mensagem de sucesso.

---

## RUN3-007 — IDs duplicados/zero

### Payload

```js
const payload = {
  itens: [
    { id: 7, nome: 'A', preco: 1, quantidade: 1, unidade: 'un', incluido: true },
    { id: 7, nome: 'B', preco: 2, quantidade: 1, unidade: 'un', incluido: true },
    { id: 0, nome: 'C', preco: 3, quantidade: 1, unidade: 'un',incluido: true },
  ],
  temaAtual: 'azul',
};
```

### Fluxo

`js/main.js:203-209` → `js/storage.js:51-53` → `js/main.js:273-278` → `js/itens.js:103-110`.

- O clique no primeiro ID 7 executa `filter(i => i.id !== 7)`, removendo A e B.
- ID 0 falha em `if (!id || !acao)`.

### Impacto

Exclusão de múltiplos registros e impossibilidade de manipular individualmente o ID zero.

### Correção

Schema exige inteiro positivo seguro e único; gerador de ID sem colisão; dispatch valida `Number.isSafeInteger(id)`.

---

## RUN3-008 — ID de sala com ~31 bits

### Geração

```js
_salaId = Math.random().toString(36).slice(2, 8);
```

O espaço nominal é `36^6 = 2,176,782,336` (~30,99 bits) e `Math.random()` não é CSPRNG. O mesmo ID concede read/write anônimo na sala.

### Impacto

Permite tentativa direcionada de adivinhação de capabilities de salas. Não há listagem pública da raiz, portanto a attack exige candidatosrather que enumeração parent.

### Correção

`crypto.getRandomValues(new Uint8Array(16))`, codificação base64url/hex e fragmento de URL. Compatibilidade com salas antigas deve ser avaliada separadamente.
