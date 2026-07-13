# Relatório de Segurança — Lista de Itens

**Data:** 2026-07-12 | **Run:** 1 | **Severidade:** 1 HIGH, 1 MEDIUM, 1 BUG

---

## Finding 1 [HIGH] — XSS via parâmetro `?sala=` em `mostrarIndicadorSala`

**Arquivo:** `js/main.js:90-109`

**Descrição:** A função `mostrarIndicadorSala(salaId)` injeta o valor do parâmetro URL `?sala=` diretamente no DOM via `innerHTML` sem sanitização. Um atacante pode enviar um link malicioso contendo HTML/JS no parâmetro `sala`:

```
https://site.com/?sala=<img src=x onerror=alert(1)>
```

`entrarSala()` sempre retorna `true` (conecta ao path Firebase mesmo se vazio), então `mostrarIndicadorSala()` é chamada com o payload do atacante.

**Payload malicioso executado no contexto da vítima.** Acesso a cookies, localStorage, e manipulação do DOM.

**Correção aplicada:** Escape de `salaId` antes da injeção:
```javascript
const safeId = salaId.replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
```

---

## Finding 2 [BUG] — Race condition na flag `_ignorarProximaAtualizacao`

**Arquivo:** `js/sync.js`

**Descrição:** `publicarEstado()` setava `_ignorarProximaAtualizacao = true` e liberava via `setTimeout(..., 500)`. Duas publicações em <500ms faziam a segunda ser ignorada, perdendo dados. A flag booleana não escala com múltiplos publishes.

**Correção aplicada:** Substituída a flag por comparação JSON do estado recebido com o local:
```javascript
if (JSON.stringify(dados.itens) === JSON.stringify(state.itens) &&
    dados.temaAtual === state.temaAtual) return;
```
Echo da própria publicação é ignorado por identidade; publishes de outros peers sempre processados.

---

## Finding 3 [MEDIUM] — Dados externos sem validação em `aplicarEstadoExterno`

**Arquivo:** `js/storage.js:48-54`

**Descrição:** `aplicarEstadoExterno()` (chamada por Firebase e URL `?data=`) injetava `dados.itens` diretamente no `state.itens` sem verificar estrutura dos itens. Um item sem `id`, `nome`, ou com campos de tipo errado poderia quebrar `lista.js` (que acessa `item.nome`, `item.id` etc.). `escHtml` protege contra XSS no nome, mas campos ausentes causam JS errors.

**Correção aplicada:** Filtro de integridade:
```javascript
state.itens = dados.itens.filter(item =>
  item && typeof item.id === 'number' && typeof item.nome === 'string' && item.nome.trim()
);
```

---

## Notas de hardening (não corrigidos — defesa em profundidade)

- **Firebase config exposto** (`sync.js`): API key + project ID em client-side JS é padrão Firebase; segurança depende de regras no console. Verificar se Realtime Database tem regras restritivas.
- **Ordem de itens sem lock**: Firebase usa last-write-wins; edições simultâneas de dois usuários podem sobrescrever. Aceitável para app de lista de compras.

## Recomendação
Rodar uma segunda auditoria (run-2) focando em lógica de negócio e edge cases de sincronização que esta run não cobriu.
