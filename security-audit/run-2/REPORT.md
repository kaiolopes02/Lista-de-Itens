# Relatório de Segurança — Lista de Itens (Run-2, foco Firebase)

**Data:** 2026-07-12 | **Run:** 2 | **Loop:** observe → escolher → agir → verificar → registrar
**Foco:** segurança/fiabilidade da sincronização Firebase + caminhos de entrada relacionados (?sala / ?data)

---

## Sumário

Run-2 retém as 3 correções da run-1 e adiciona 3 novas. Mudanças mínimas: 2 diffs de 1 linha em código existente (js/main.js, js/sync.js) + 1 arquivo novo de regras (database.rules.json). Nenhum arquivo JS de produção novo.

| ID | Severidade | Arquivo | Problema | Correção |
|---|---|---|---|---|
| RUN2-001 | HIGH/BUG | js/main.js:208 | Path ?data= injetava itens sem validar, burlava o filtro que existia só no path Firebase | Rotear payload ?data= por aplicarEstadoExterno(obj) |
| RUN2-002 | MEDIUM | js/sync.js:79 | entrarSala aceitava qualquer salaId e montava a ref Firebase (listas/${salaId}) sem validar → injeção de caminho/chave | Validar ^[A-Za-z0-9_-]{2,64}$ antes de montar a ref |
| RUN2-003 | HIGH | database.rules.json (novo) | Nenhum arquivo de regras do Realtime Database existia no repo; segurança 100% em regras não-versionadas no console (provavelmente abertas) | Regras: escopo listas/$salaId, validação de schema por item, $other proibido, resto bloqueado |

---

## Finding RUN2-001 [HIGH/BUG] — Path ?data= da URL burlava a validação de itens

**Arquivo:** js/main.js (carregarDadosUrl)

**Descrição:** A run-1 criou aplicarEstadoExterno() com filtro de itens em storage.js, mas o report da run-1 afirmava erradamente que ele cobria a URL ?data=. Na verdade o branch ?data= fazia state.itens = obj.itens sem validar campos. Um atacante podia forjar um link (base64+URIenc) com itens malformados; a vítima que abre o link recebe itens sem nome string -> escHtml() em lista.js lança erro dentro de atualizarLista -> UI quebra; preco/quantidade não-numéricos geram totais NaN; e o estado corrompido é persistido em localStorage.

**Correção:** Substituir o setter manual por aplicarEstadoExterno(obj) (mesma função do path Firebase). 1 linha.

    if (Array.isArray(obj.itens)) {
      aplicarEstadoExterno(obj); // valida itens via storage.js, fecha bypass do filtro RUN1-003
      mostrarNotificacao('Lista carregada do link!', 'sucesso');
      return true;
    }

**Verificação:** node --check js/main.js = 0; setter antigo removido (grep negativo); compartilhamento legítimo ainda funciona (codifica itens válidos que passam no filtro).

---

## Finding RUN2-002 [MEDIUM] — Injeção de caminho/chave em entrarSala (ref Firebase)

**Arquivo:** js/sync.js (entrarSala)

**Descrição:** entrarSala(salaId) setava _salaId = salaId e _conectarSala montava ref(_db, listas/<salaId>) sem validar formato. ?sala=a%2Fb -> _salaId=a/b -> ref listas/a/b (caminho aninhado sob outra sala); ?sala=.. -> ref listas/... A run-1 tratou só a exibição XSS em mostrarIndicadorSala (escape), não a chave do path. Com regras abertas isso permite ler/gravar numa sala diferente da pretendida.

**Correção:** Rejeitar antes de montar a ref com ^[A-Za-z0-9_-]{2,64}$ (aceita o formato legítimo de 6 chars, ex.: x7k2m9). 1 linha.

    if (typeof salaId !== 'string' || !/^[A-Za-z0-9_-]{2,64}$/.test(salaId)) return false;

**Verificação:** harness da regex (10 casos) aceita x7k2m9, ab, x_y-z, sala e rejeita vazio, a/b, foo.bar, ..<x>, x*65, ..; node --check = 0.

---

## Finding RUN2-003 [HIGH] — Ausência total de Realtime Database Security Rules no repositório

**Arquivo (novo):** database.rules.json

**Descrição:** O app usa Firebase Realtime DB sem autenticação e grava o estado inteiro em listas/$salaId. A segurança depende 100% das regras no console Firebase — mas nenhum arquivo de regras (database.rules.json / firebase.json) existia no repositório. Se as regras do console estão abertas (.read: true, .write: true) — caso comum para o app funcionar — qualquer um com as credenciais públicas em js/sync.js pode ler/sobrescrever/apagar qualquer sala e injetar itens malformados que quebram clientes das vítimas.

**Correção:** Criado database.rules.json:
- leitura/escrita em listas/$salaId por design (sala compartilhável por link, acesso anônimo);
- validação de schema por item: id number, nome string 1-120, preco/quantidade numbers >=0 >0, unidade em {un,kg}, incluido boolean;
- proibição de campos desconhecidos via $other: .validate=false (raiz e item);
- bloqueio de tudo o resto ($other raiz: .read/.write=false).
Não exige hasChildren nos itens, então itens legados sem campos opcionais continuam publicando; o filtro de recepção (aplicarEstadoExterno) descarta itens sem id/nome do lado do receptor.

**Verificação:** node JSON.parse OK; harness de validação (9 casos) confirma itens válidos (un/kg) aceitos e malformados (nome>120, preco<0, qtd<=0, unidade inválida, incluido não-bool, chave extra) rejeitados.

### Deploy das regras (ação do usuário)

Colar o conteúdo de database.rules.json em Firebase console -> Realtime Database -> Rules, ou via Firebase CLI:

    firebase deploy --only database --rules database.rules.json

---

## Residual / Hardening (não corrigidos — fora do escopo mínimo)

- **IDOR anônima sem Auth:** O app não usa Firebase Auth, então as regras não distinguem o dono de uma sala de outro cliente anônimo; qualquer um com um salaId (6 chars, ~31 bits) pode enumerar/sobrescrever salas. Isolar salas por dono exige Firebase Auth (mudança grande, fora do mínimo). As regras RUN2-003 reduzem o raio de explosão (sem escrita fora de listas/, sem schema inválido, sem chaves arbitrárias) mas não fecham o overwrite anônimo.
- **Credenciais Firebase no client (js/sync.js):** padrão do Firebase Web SDK; segurança via regras + domínios autorizados no console.
- **Last-write-wins (Firebase set()):** dois usuários editando itens distintos podem se sobrescrever; aceitável p/ lista de compras (run-1). Exigiria update() por item/transações — fora do mínimo.
- **salaId via Math.random() ~31 bits** não foi alterado de propósito: endurecer o gerador client NÃO ajuda (atacante ataca o path Firebase diretamente); só Auth + regras fecham o IDOR.

## Verificação final
- node --check em todos os 8 módulos JS: RC=0.
- Bypass antigo (state.itens = obj.itens) removido.
- Run-1 retida: filtro aplicarEstadoExterno (storage.js:51-52) e escape safeId (main.js:90,109).
- database.rules.json válido, estrutura confirmada (sala .read/.write=true, $other raiz=false).
