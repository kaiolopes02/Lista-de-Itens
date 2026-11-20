# README and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documentar integralmente o aplicativo, tornar as regras do Firebase publicáveis de forma reproduzível e comprovar o estado do site e da sincronização em produção.

**Architecture:** O runtime permanece como PWA estática em JavaScript ESM nativo. A única configuração nova será `firebase.json`, que faz o CLI reconhecer `database.rules.json` como alvo RTDB; o `README.md` explicará o sistema existente sem alterar seu comportamento. Depois das revisões locais e da revisão final do branch, as regras serão publicadas no Firebase e o branch validado será enviado por fast-forward ao `master` remoto do GitHub Pages.

**Tech Stack:** HTML5, CSS3, JavaScript ESM nativo, Firebase Realtime Database 10.12.2 via CDN, Firebase CLI/MCP, GitHub Pages, Node.js para checagem sintática, Python HTTP Server e Chrome headless.

**Spec:** `docs/superpowers/specs/2026-11-20-readme-deploy-design.md`

## Global Constraints

- Preservar o comportamento atual do aplicativo e a arquitetura JavaScript modular nativa.
- Não adicionar funcionalidades ao produto.
- Não migrar GitHub Pages, Firebase ou o modelo de salas.
- Não introduzir bundler, framework, gerenciador de pacotes ou pipeline de build.
- Não implementar Firebase Authentication, lock/transações, service worker ou CI/CD nesta entrega.
- Não alterar `js/`, `css/`, `index.html` ou `site.webmanifest`, salvo se o deploy revelar um bloqueador comprovado; nesse caso, a correção será mínima, testada e registrada.
- O app é uma PWA estática em ESM nativo, servida sob o subcaminho `/Lista-de-Itens/`.
- O SDK Firebase Web 10.12.2 é carregado pela CDN; a configuração do app Web é pública por natureza e a proteção depende das Security Rules.
- `firebase.json` deve conter somente a configuração RTDB mínima, com `database.rules` igual a `database.rules.json`.
- Nenhum segredo ou token pode ser gravado no repositório ou em relatórios.
- As alterações ficam no branch isolado `chore/readme-deploy`; a publicação no `master` remoto ocorre somente após revisão e verificação local.
- O conteúdo publicado no Firebase deve ser exatamente `database.rules.json`.

## Review Focus

1. **Afirmações sem implementação:** o README não pode chamar o app de offline-ready, instalado, autenticado, testado automaticamente ou seguro contra adulteração de salas sem que o código/infraestrutura comprove isso.
2. **Escopo do banco:** leitura/escrita na raiz do RTDB ou fora de `listas/$salaId` deve continuar bloqueada.
3. **Schema de sala:** preço negativo, quantidade zero, unidade inválida, `incluido` não booleano e campos extras devem ser rejeitados pelas regras ativas.
4. **Entradas externas:** payload `?data=` e dados recebidos do Firebase devem continuar passando pela validação de `aplicarEstadoExterno` antes de renderizar ou persistir.
5. **Caminho publicado:** módulos, CSS, manifesto, ícones e README devem continuar acessíveis sob `/Lista-de-Itens/` depois do deploy.

## Mapa de arquivos

- Create: `firebase.json` — manifesto mínimo do Firebase CLI, responsável apenas pelo target RTDB.
- Create: `README.md` — documentação completa do produto, arquitetura, operação, segurança, limitações e roadmap.
- Reference only: `database.rules.json` — regras RTDB existentes que serão publicadas sem alteração.
- Reference only: `index.html`, `site.webmanifest`, `js/*.js`, `css/*.css` — contrato funcional e visual que o README deve descrever sem modificar.

---

### Task 1: Configuração de publicação do Realtime Database

**Files:**
- Create: `firebase.json`
- Reference: `database.rules.json`

**Interfaces:**
- Consumes: `database.rules.json`, arquivo JSON já existente com as regras RTDB.
- Produces: `firebase.json` com a entrada `database.rules = "database.rules.json"`, consumida pelo Firebase CLI/MCP no Release Gate.

- [ ] **Step 1: Executar a verificação inicial e confirmar que a configuração ainda falta**

Run:

```powershell
$config = Get-Content firebase.json -Raw | ConvertFrom-Json
if ($config.database.rules -ne 'database.rules.json') { throw 'database.rules incorreto' }
```

Expected: FAIL porque `firebase.json` ainda não existe.

- [ ] **Step 2: Criar `firebase.json` com exatamente o alvo RTDB**

Create `firebase.json`:

```json
{
  "database": {
    "rules": "database.rules.json"
  }
}
```

- [ ] **Step 3: Validar o JSON e a referência às regras**

Run:

```powershell
$config = Get-Content firebase.json -Raw | ConvertFrom-Json
if ($config.database.rules -ne 'database.rules.json') { throw 'database.rules incorreto' }
Get-Content database.rules.json -Raw | ConvertFrom-Json | Out-Null
```

Expected: exit code 0, sem saída de erro.

- [ ] **Step 4: Confirmar que nenhum outro target foi adicionado**

Run:

```powershell
$config = Get-Content firebase.json -Raw | ConvertFrom-Json
$topLevel = @($config.PSObject.Properties.Name)
if ($topLevel.Count -ne 1 -or $topLevel[0] -ne 'database') { throw 'firebase.json contém targets extras' }
```

Expected: exit code 0.

- [ ] **Step 5: Commit**

```bash
git add firebase.json
git commit -m "chore: add Firebase database deployment config"
```

### Task 2: README detalhado e verificação local do release

**Files:**
- Create: `README.md`
- Reference: `index.html`, `site.webmanifest`, `database.rules.json`, `js/*.js`, `css/*.css`, `security-audit/run-1/REPORT.md`, `security-audit/run-2/REPORT.md`

**Interfaces:**
- Consumes: a aplicação e as regras descritas no Task 1 e no spec.
- Produces: `README.md` como referência operacional para desenvolvedores, usuários e mantenedores.

- [ ] **Step 1: Executar a verificação inicial de cobertura documental**

Run uma verificação PowerShell que exija `README.md` e os títulos abaixo:

```text
Funcionalidades
Arquitetura
Estrutura do projeto
Fluxos principais
Persistência e modelo de dados
Firebase
Execução local
Deploy
Verificação
Segurança
Limitações
Próximos passos
```

Expected: FAIL porque `README.md` ainda não existe.

- [ ] **Step 2: Escrever o README em português com conteúdo verdadeiro e verificável**

O documento deve incluir:

1. Nome, descrição curta, status de produção e link `https://kaiolopes02.github.io/Lista-de-Itens/`.
2. Funcionalidades: adicionar/editar/excluir itens; unidades `un` e `kg`; marcar/desmarcar individual e em massa; ordenar por nome/data; totais, quantidade e progresso; histórico local de 5 compras; 9 temas; compartilhamento por Firebase e fallback `?data=`; instalação via manifesto, sem afirmar suporte offline completo.
3. Stack: HTML5, CSS3, JavaScript ESM nativo, Web APIs, Firebase RTDB 10.12.2 via CDN, GitHub Pages; declarar que não há bundler nem dependências de runtime empacotadas.
4. Diagrama Mermaid do fluxo navegador → módulos ESM → `localStorage`/Firebase → interface.
5. Tabela por módulo: `main.js`, `itens.js`, `lista.js`, `storage.js`, `sync.js`, `historico.js`, `tema.js`, `notificacao.js`, `icones.js`; e por CSS: `base.css`, `layout.css`, `components.css`, `notificacao.css`, `tema.css`, com `style.css` como entrada.
6. Fluxos de startup, CRUD, histórico, tema, compartilhamento e atualização remota; explicar que o Firebase usa `set` do estado inteiro e `last-write-wins`.
7. Modelo de item com `id`, `nome`, `preco`, `quantidade`, `unidade`, `incluido`; chaves `listaCompras_v2` e `listaCompras_historico`; limite de 5 registros.
8. Configuração do Firebase Web, explicando que a `apiKey` pública não é segredo e que a segurança depende das regras; documentar `database.rules.json` e `firebase.json`.
9. Execução local via `python -m http.server 8765` e aviso para não abrir `index.html` por `file://` porque ESM e Firebase exigem HTTP.
10. Deploy das regras com `firebase deploy --only database --project lista-de-itens-2a16b` e deploy do site por push ao branch de produção do GitHub Pages.
11. Verificações sintáticas/JSON/HTTP/headless e o teste de sala descartável descrito no Release Gate.
12. Segurança: escape de nomes, validação de payload externo, regex de `salaId`, schema RTDB, risco residual de acesso anônimo/IDOR, `last-write-wins`, ausência de Auth e necessidade de CSP/monitoramento.
13. Limitações: sem Auth, sem operações offline completas, sem testes automatizados, sem CI/CD, sem service worker, sem analytics, sem 404 customizado, histórico local por dispositivo, sem license definida e Firebase Web SDK dependente de CDN.
14. Próximos passos priorizados: Firebase Auth, testes automatizados, service worker, CI/CD, transações/lock, CSP/observabilidade, 404 e licenciamento; distinguir “corrigir” de “evolução”.

- [ ] **Step 3: Validar cobertura, links internos e afirmações estruturais**

Run uma verificação PowerShell que:

- confirme todos os 12 títulos obrigatórios;
- confirme que o README contém `https://kaiolopes02.github.io/Lista-de-Itens/`, `lista-de-itens-2a16b`, `firebase.json`, `database.rules.json` e `last-write-wins`;
- confirme que todo caminho de arquivo local citado entre crases existe no repositório;
- confirme que a seção de limitações contém “Firebase Authentication”, “service worker”, “testes automatizados” e “CI/CD”.

Expected: exit code 0.

- [ ] **Step 4: Validar a sintaxe dos nove módulos ESM**

Copiar cada `js/*.js` para um diretório temporário com extensão `.mjs` e executar `node --check` em cada cópia.

Expected: 9 arquivos, exit code 0 para todos, zero erros.

- [ ] **Step 5: Validar os três JSON**

Executar `ConvertFrom-Json` em `firebase.json`, `database.rules.json` e `site.webmanifest`.

Expected: exit code 0, zero erros.

- [ ] **Step 6: Validar o servidor HTTP local**

Run:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Em outro processo, requisitar `http://127.0.0.1:8765/`.

Expected: HTTP 200 para `/`, `/js/main.js`, `/css/style.css`, `/site.webmanifest`, `/assets/icon-192.png` e `/assets/icon-512.png`.

- [ ] **Step 7: Validar a renderização no Chrome headless**

Usar `cmd.exe /d /c` para redirecionar a saída do Chrome para um arquivo temporário, evitando a captura inconsistente do PowerShell:

```powershell
$id = [guid]::NewGuid().ToString('N')
$profile = Join-Path $env:TEMP "opencode-chrome-$id"
$out = Join-Path $env:TEMP "opencode-chrome-$id.out"
$err = Join-Path $env:TEMP "opencode-chrome-$id.err"
$command = '"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless --disable-gpu --no-first-run --no-default-browser-check --user-data-dir="' + $profile + '" --dump-dom "http://127.0.0.1:8765/" > "' + $out + '" 2> "' + $err + '"'
cmd.exe /d /c $command
$html = Get-Content $out -Raw
if ($html -notmatch '<title>Lista de Compras</title>') { throw 'título ausente' }
if ($html -notmatch 'Lista vazia!') { throw 'estado vazio não renderizado' }
if ($html -notmatch '<svg[^>]+aria-hidden="true"') { throw 'ícones não injetados' }
```

Expected: exit code 0; DOM com título, estado vazio e SVG injetado.

- [ ] **Step 8: Verificar payload externo malformado**

Gerar um payload Base64 de `{"itens":[{"nome":"ItemInvalido999"}]}` e abrir `http://127.0.0.1:8765/?data=<payload>` em outro perfil Chrome headless. O item não possui `id` numérico e deve ser descartado por `aplicarEstadoExterno`.

Expected: o DOM continua contendo “Lista vazia!” e não contém “ItemInvalido999”; nenhum erro fatal de renderização.

- [ ] **Step 9: Revisar o README contra o código, sem alterar o runtime**

Conferir cada afirmação técnica com `index.html`, `js/*.js`, `css/*.css`, `site.webmanifest` e `database.rules.json`. Remover qualquer afirmação não comprovada, especialmente “offline”, “autenticado”, “protegido contra adulteração” ou “totalmente seguro”.

Expected: revisão manual concluída e nenhum arquivo de runtime modificado.

- [ ] **Step 10: Commit**

```bash
git add README.md
git commit -m "docs: add detailed project README"
```

---

## Release Gate — somente após as revisões por tarefa e a revisão final do branch

- [ ] **RG-1: Confirmar o escopo do diff**

`git diff --name-only 6c63c33..HEAD` deve listar exatamente:

```text
README.md
firebase.json
docs/superpowers/plans/2026-11-20-readme-deploy.md
docs/superpowers/specs/2026-11-20-readme-deploy-design.md
```

`database.rules.json` não pode ter mudado.

`js/`, `css/`, `index.html`, `site.webmanifest` e assets não podem ter mudado.

- [ ] **RG-2: Publicar as regras no Firebase**

Configurar o ambiente Firebase para o projeto `lista-de-itens-2a16b` e o diretório atual, confirmar `firebase.json`, e publicar somente o target `database`.

Expected: deploy RTDB concluído sem erro; nenhum Hosting, Storage, Functions ou outro target alterado.

- [ ] **RG-3: Verificar as regras ativas**

Obter as regras RTDB ativas e comparar a semântica com `database.rules.json`: acesso apenas a `listas/$salaId`, validação do schema por item e bloqueio do restante da raiz.

Expected: regras equivalentes ao arquivo versionado.

- [ ] **RG-4: Testar uma sala descartável**

Usar um ID aleatório no formato `verify-<timestamp>-<random>`:

1. `PUT` em `/listas/<id>.json` com um estado mínimo válido; esperar HTTP 200.
2. `GET` no mesmo caminho; esperar HTTP 200 e o payload persistido.
3. `PUT` no mesmo caminho com `preco: -1` e um campo extra; esperar HTTP 401/Permission denied.
4. `GET` na raiz `/.json`; esperar HTTP 401/Permission denied.
5. `DELETE` em `/listas/<id>.json`; esperar HTTP 200.
6. `GET` no caminho descartável; esperar payload `null`.

Expected: todas as expectativas atendido e nenhum resíduo em produção.

- [ ] **RG-5: Publicar o branch validado no GitHub Pages**

Após a revisão final do branch estar limpa e a solicitação de deploy do usuário autorizar o push para o branch compartilhado:

```bash
git push origin chore/readme-deploy:master
git ls-remote origin refs/heads/master
```

Expected: `master` remoto aponta exatamente para `HEAD` do branch validado; o push é fast-forward.

- [ ] **RG-6: Verificar a publicação do GitHub Pages**

Consultar `https://kaiolopes02.github.io/Lista-de-Itens/` até que o HTML público contenha a versão atual. Verificar também a rota de README aceita pelo GitHub Pages (`/README.html` ou `/README.md`) e o conteúdo raw em `https://raw.githubusercontent.com/kaiolopes02/Lista-de-Itens/master/README.md`.

Expected: site e README públicos com HTTP 200; assets e módulos com HTTP 200.

- [ ] **RG-7: Repetir o smoke test contra produção**

Executar o comando Chrome headless do Task 2 apontando para `https://kaiolopes02.github.io/Lista-de-Itens/`.

Expected: título, estado vazio e ícone SVG presentes; nenhum erro relevante no stderr.

- [ ] **RG-8: Emitir relatório final**

Registrar: arquivos alterados, commits, URL pública, regras publicadas, comandos de verificação, resultados, qualquer aviso, limitações não corrigidas e riscos residuais. Não declarar sucesso para uma etapa cujo resultado não tenha sido observado.
