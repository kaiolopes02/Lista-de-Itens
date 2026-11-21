# Lista de Compras

Aplicação web estática para organizar compras por item, preço unitário, quantidade e unidade. A lista funciona localmente no navegador e pode ser compartilhada por uma sala do Firebase Realtime Database, identificada por um link secreto de 128 bits, ou, como alternativa sem backend, por um link com snapshot em `#data=`.

- **Produção:** [https://kaiolopes02.github.io/Lista-de-Itens/](https://kaiolopes02.github.io/Lista-de-Itens/)
- **Projeto Firebase:** `lista-de-itens-2a16b`
- **Status:** publicado no GitHub Pages, com o Realtime Database usado no modo de salas compartilhadas.

> O manifesto habilita a instalação da aplicação em navegadores compatíveis, mas o projeto **não possui service worker**. Portanto, não há garantia de funcionamento offline completo. O SDK Web do Firebase é carregado por CDN, e a configuração da aplicação está em `js/sync.js`.

## Índice

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Fluxos principais](#fluxos-principais)
- [Persistência e modelo de dados](#persistência-e-modelo-de-dados)
- [Firebase](#firebase)
- [Execução local](#execução-local)
- [Deploy](#deploy)
- [Verificação](#verificação)
- [Segurança](#segurança)
- [Limitações](#limitações)
- [Próximos passos](#próximos-passos)

## Funcionalidades

- **Gerenciamento de itens:** adicionar, editar e excluir itens; nomes duplicados são recusados, sem diferenciar maiúsculas de minúsculas.
- **Unidades:** `un` para unidades e `kg` para peso. Na tela, pesos menores que 1 kg são exibidos em gramas.
- **Conclusão de itens:** marcar ou desmarcar um item individualmente e marcar ou desmarcar todos em massa.
- **Ordenação:** por nome em ordem alfabética ou pelos itens mais recentes. A ordem por data usa o `id` numérico, gerado por `proximoId()` — maior que `Date.now()` e que todos os ids já existentes, o que evita colisões.
- **Totais:** quantidade incluída, separada entre `un` e `kg`, contagem de itens marcados, valor total da compra e barra de progresso. O progresso representa a proporção de **itens** incluídos, não a soma das quantidades.
- **Histórico local:** até 5 compras finalizadas, com data, itens, tema e totais; cada compra pode ser removida individualmente.
- **Temas:** 9 paletas — Azul, Verde, Violeta, Vermelho, Laranja, Amarelo, Anil, Rosa e Escuro.
- **Compartilhamento:** criação de sala no Firebase com identificador de 128 bits ou, quando o Firebase não está configurado, fallback de snapshot no parâmetro `#data=`. Os links usam o fragmento da URL, que não é enviado ao servidor.
- **Instalação:** `site.webmanifest` define nome, modo `standalone` e ícones de 192 e 512 pixels. Não há cache de aplicação ou suporte offline completo.

### Onde os dados ficam

| Cenário | Dados compartilhados | Persistência |
|---|---|---|
| Uso local | Lista atual e tema | `localStorage`, por navegador e origem |
| Sala Firebase | Lista atual e tema | `listas/$salaId` no Realtime Database; quem conhece o identificador de 128 bits pode ler e alterar |
| Link `#data=` | Snapshot da lista e do tema | Dentro do fragmento da URL; não é enviado ao servidor, mas o conteúdo fica visível para quem recebe o link |

O histórico de compras não é enviado ao Firebase e não acompanha o link `#data=`; ele permanece local no dispositivo. Uma cópia da lista anterior é mantida em `listaCompras_backup` antes de qualquer substituição.

## Arquitetura

### Stack

| Camada | Tecnologia |
|---|---|
| Interface | HTML5 semântico e CSS3 responsivo |
| Aplicação | JavaScript com módulos ESM nativos, sem framework |
| APIs do navegador | DOM, `localStorage`, `URLSearchParams`, `Intl`, Web Share API e Clipboard API, quando disponíveis |
| Persistência local | `localStorage` |
| Sincronização | Firebase Realtime Database Web SDK 10.12.2, carregado da CDN oficial |
| Testes | `node --test` com testes unitários e um teste end-to-end em Chrome headless |
| Hospedagem | GitHub Pages, no subcaminho `/Lista-de-Itens/` |

Não há bundler, etapa de build nem dependências instaladas. O `package.json` existe apenas para declarar `"type": "module"` e o script `test`, permitindo que o Node.js execute os testes sem instalar nada. Os módulos JavaScript e CSS são carregados diretamente pelo navegador. O SDK do Firebase e a fonte Outfit são recursos externos da CDN.

### Visão geral

```mermaid
flowchart LR
    U[Usuário] --> UI[Interface HTML e CSS]
    UI --> M[main.js e módulos ESM]
    M --> L[(localStorage)]
    M --> F[Firebase Realtime Database]
    F --> M
    M --> UI
    Q[Link #data=] --> M
```

O navegador carrega `index.html`, que carrega `js/main.js`; `js/main.js` importa os módulos ESM e registra os eventos. O estado em memória é atualizado pelos módulos, salvo em `localStorage` e, quando existe uma sala ativa, publicado no Firebase. As alterações remotas retornam ao mesmo estado e são renderizadas novamente na interface.

## Estrutura do projeto

```text
.
├── index.html
├── site.webmanifest
├── firebase.json
├── database.rules.json
├── package.json
├── assets/
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   ├── style.css
│   ├── base.css
│   ├── layout.css
│   ├── components.css
│   ├── notificacao.css
│   └── tema.css
├── js/
│   ├── main.js
│   ├── itens.js
│   ├── lista.js
│   ├── storage.js
│   ├── validacao.js
│   ├── sync.js
│   ├── historico.js
│   ├── tema.js
│   ├── notificacao.js
│   └── icones.js
├── tests/
│   ├── validacao.test.js
│   ├── storage.test.js
│   └── e2e.test.js
├── docs/superpowers/
├── security-audit/
│   ├── run-1/REPORT.md
│   ├── run-2/REPORT.md
│   └── run-3/REPORT.md
└── README.md
```

### Módulos JavaScript

| Módulo | Responsabilidade |
|---|---|
| `js/main.js` | Inicialização, registro de eventos, edição, compartilhamento, carregamento de `#sala=` ou `#data=`, confirmação de substituição e interface entre os demais módulos |
| `js/itens.js` | CRUD, validação do formulário, alternância individual e em massa, limpeza e modo de edição |
| `js/lista.js` | Renderização dos itens com `createElement` e `textContent`, formatação de valores, totais, progresso e ordenações |
| `js/storage.js` | Estado em memória, persistência local, validação atômica de estado externo, backup e histórico de compras |
| `js/validacao.js` | Schema único de itens e estado, normalização de histórico, geração de ids e codificação/decodificação de snapshots |
| `js/sync.js` | Configuração do Firebase, criação de salas de 128 bits, entrada somente após o primeiro snapshot válido, publicação com retorno de sucesso e observação de atualizações remotas |
| `js/historico.js` | Modal de histórico, formatação de datas e totais e remoção de compras salvas |
| `js/tema.js` | Definição das 9 paletas, seleção, aplicação e persistência do tema |
| `js/notificacao.js` | Toast temporário com variantes de sucesso, erro e informação |
| `js/icones.js` | Ícones SVG inline e injeção dos elementos gráficos na interface |

### Módulos CSS

| Módulo | Responsabilidade |
|---|---|
| `css/style.css` | Entrada do estilo; importa a fonte e os módulos CSS na ordem correta |
| `css/base.css` | Reset, variáveis, tipografia, fundo global e suporte à redução de movimento |
| `css/layout.css` | Container principal, cards, cabeçalho, totais, barra de progresso e lista de itens |
| `css/components.css` | Botões, formulário, diálogos de tema, histórico e confirmação, e ajustes de ícones |
| `css/notificacao.css` | Toast flutuante e seus estados visuais |
| `css/tema.css` | Variáveis das 9 paletas e regras de responsividade |

## Fluxos principais

### Inicialização

1. Em `DOMContentLoaded`, os ícones SVG são injetados no HTML.
2. Se o Firebase estiver configurado, o SDK e o Realtime Database são inicializados.
3. O estado local é carregado **primeiro**, com validação e backup de dados corrompidos; o tema salvo é aplicado, a lista é renderizada e os totais são calculados.
4. Só então a URL é verificada: `#sala=` tenta entrar na sala; `#data=` tenta aplicar um snapshot. Se a lista local não estiver vazia, uma confirmação em `<dialog>` decide se ela será substituída; recusar mantém a lista local intacta.
5. Os controles do cabeçalho, formulário, lista, modais e notificações registram seus eventos.

### CRUD e alterações locais

1. O formulário valida nome, preço, quantidade e unidade.
2. A criação usa `proximoId()`, que retorna um inteiro maior que `Date.now()` e que todos os ids existentes; a edição preserva o `id`.
3. A lista e os totais são re-renderizados.
4. O estado completo é salvo em `localStorage`.
5. Se houver uma sala ativa, o estado completo é publicado no Firebase.

Excluir um item remove-o imediatamente do estado; a animação de saída é apenas visual. A conclusão de compra limpa a lista e a sincroniza quando existe uma sala.

### Histórico

1. “Finalizar compra” exige confirmação e uma lista não vazia.
2. Uma cópia da lista atual, com data e tema, é inserida no início do histórico.
3. O histórico é limitado a 5 registros; o mais antigo é removido.
4. A lista atual fica vazia e é salva e sincronizada.
5. O modal permite consultar e excluir cada entrada.

### Tema

A seleção altera `data-tema` no elemento raiz, atualiza o estado e persiste em `localStorage`. O tema integra o payload de estado usado pelo Firebase e pelo fallback `#data=`. A seleção de tema, isoladamente, não dispara uma publicação imediata no Firebase; a propagação para uma sala pode ocorrer em uma publicação posterior da lista.

### Compartilhamento

1. A aplicação gera um resumo textual com itens, quantidades, subtotais e total.
2. Com Firebase configurado, cria uma sala com identificador aleatório de 128 bits (22 caracteres em base64url) ou reutiliza a sala ativa e gera um link `#sala=<id>`. O id só é exibido depois que a escrita inicial é aceita pelo Firebase.
3. Sem Firebase configurado, serializa lista e tema em Base64url e gera um link `#data=<payload>`.
4. Usa a Web Share API quando disponível; caso contrário, tenta copiar o resumo e o link pela Clipboard API.

### Atualização remota

Ao entrar em uma sala, `onValue` observa `listas/$salaId`. O primeiro snapshot precisa ser válido e, se houver lista local, a substituição é confirmada pelo usuário; uma sala inexistente, um snapshot malformado ou um tempo limite de 8 segundos mantêm a lista local. Depois da entrada, o cliente ignora o eco de sua própria publicação quando lista e tema são idênticos. Uma alteração remota passa por `aplicarEstadoExterno`, é salva localmente e provoca nova renderização; snapshots inválidos são ignorados com aviso no console.

A publicação usa `set` no caminho da sala com `itens`, `temaAtual` e `ts`. Como cada cliente publica o estado inteiro, a última escrita prevalece (**last-write-wins**). O campo `ts` é registrado, mas não é usado para mesclar nem para resolver conflitos. Uma falha de publicação retorna `false` e o usuário recebe um aviso de que a alteração ficou apenas no dispositivo.

## Persistência e modelo de dados

### Chaves locais

| Chave | Conteúdo | Limite |
|---|---|---|
| `listaCompras_v2` | Lista atual e tema | Uma entrada por navegador/origem |
| `listaCompras_backup` | Cópia da última lista válida antes de uma substituição, ou do conteúdo corrompido encontrado | Uma entrada |
| `listaCompras_historico` | Compras finalizadas | 5 entradas |

Na inicialização, o código ainda lê a chave legada `listaCompras` se `listaCompras_v2` não existir; as novas gravações usam `listaCompras_v2`. JSON inválido ou item fora do schema não derruba o app: o conteúdo original é preservado em `listaCompras_backup` e a lista começa vazia.

### Item da lista

| Campo | Tipo | Regras no cliente e nas regras do Firebase |
|---|---|---|
| `id` | Número | Inteiro positivo e seguro, gerado por `proximoId()` |
| `nome` | Texto | Texto não vazio, até 120 caracteres |
| `preco` | Número | Preço por unidade, maior ou igual a zero |
| `quantidade` | Número | Quantidade maior que zero |
| `unidade` | Texto | `un` ou `kg` |
| `incluido` | Booleano | Indica se o item está marcado na compra |

O estado completo em `localStorage` tem a forma `{ "itens": [], "temaAtual": "azul" }`. Uma entrada do histórico acrescenta `id`, `data`, `itens` e `temaAtual`.

### Entradas externas

`aplicarEstadoExterno` é o ponto comum para dados do Firebase e de `#data=`. A validação é **atômica**: se qualquer item estiver fora do schema, o snapshot inteiro é rejeitado e a lista atual permanece. São exigidos `id` inteiro positivo, `nome` textual não vazio de até 120 caracteres, `preco` finito e maior ou igual a zero, `quantidade` finita e maior que zero, `unidade` em `un`/`kg` e `incluido` booleano. Campos extras, ids duplicados e `temaAtual` desconhecido também reprovam o snapshot (o tema cai para o padrão). As mesmas restrições são aplicadas pelas Security Rules do RTDB.

## Firebase

O app Web está configurado em `js/sync.js` para o projeto `lista-de-itens-2a16b`, com banco em `https://lista-de-itens-2a16b-default-rtdb.firebaseio.com`.

A `apiKey` do Firebase Web não é um segredo: ela identifica o projeto e não concede acesso sozinha. A proteção dos dados depende das Realtime Database Security Rules e das permissões do projeto. O código atual **não usa Firebase Authentication**.

### Regras do Realtime Database

`database.rules.json` define:

- leitura e escrita anônimas apenas em `listas/$salaId`;
- exigência de todos os campos de cada item com `hasChildren` — item incompleto é rejeitado;
- `id` inteiro positivo, `nome` entre 1 e 120 caracteres sem ser só espaços, `preco` maior ou igual a zero, `quantidade` maior que zero, `unidade` em `un` ou `kg` e `incluido` booleano;
- `temaAtual` restrito às 9 paletas e `ts` numérico;
- rejeição de campos desconhecidos com `$other`;
- bloqueio de leitura e escrita no restante da raiz.

### Configuração de publicação

`firebase.json` contém somente o target do Realtime Database:

```json
{
  "database": {
    "rules": "database.rules.json"
  }
}
```

Esse arquivo permite que o Firebase CLI encontre as regras versionadas; ele não configura Hosting, Storage ou Functions.

### Acesso às salas

Uma sala é identificada por 128 bits aleatórios, codificados em 22 caracteres base64url. O parâmetro `#sala=` aceita de 2 a 64 caracteres alfanuméricos, `_` e `-`, mas os ids gerados pelo app têm sempre 22 caracteres. O link funciona como um segredo compartilhado (capability): não há como adivinhar o id por força bruta viável, mas **quem tiver o link pode ler e alterar a sala**. Não existe propriedade de sala, autenticação ou segregação por usuário.

## Execução local

Pré-requisitos: Python 3 para servir os arquivos e um navegador moderno. Para rodar os testes, Node.js 20 ou superior. Não é necessário instalar dependências do projeto.

Na raiz do repositório, execute:

```powershell
python -m http.server 8765
```

Abra `http://127.0.0.1:8765/` no navegador.

> Não abra `index.html` diretamente por `file://`. Os módulos ESM e as importações do Firebase exigem um contexto HTTP. Como o SDK do Firebase é importado estaticamente por CDN, uma rede indisponível pode impedir o carregamento do grafo de módulos.

O `localStorage` usado no teste local é separado do `localStorage` da origem de produção. O manifesto aponta `start_url` para `/Lista-de-Itens/`, caminho usado pelo GitHub Pages; a execução em `127.0.0.1` é destinada ao desenvolvimento, não à simulação completa da hospedagem pública.

## Deploy

### Publicar as regras do Firebase

Com o Firebase CLI autenticado e o projeto correto selecionado, publique apenas o target RTDB:

```powershell
firebase deploy --only database --project lista-de-itens-2a16b
```

O comando usa `firebase.json` e publica o conteúdo de `database.rules.json`. Não há build do site para essa etapa.

### Publicar o site no GitHub Pages

O repositório publica a raiz do branch `master` no subcaminho `/Lista-de-Itens/`. Depois da revisão e das verificações do branch, o fluxo de publicação usa um push explícito para esse branch:

```powershell
git push origin fix/security-ui-hardening:master
```

O push é um fast-forward a partir de `origin/master` e publica diretamente os arquivos versionados em `index.html`, `css/`, `js/`, `assets/` e `site.webmanifest`. Não há bundler nem artefato de build.

## Verificação

Os comandos abaixo reproduzem as verificações locais usadas antes de uma publicação.

### Testes automatizados

O `package.json` declara `"type": "module"` e o script `test`. Na raiz do repositório, execute:

```powershell
node --test
```

A suíte cobre:

- schema de itens e estado, ids duplicados, números não finitos, temas inválidos e histórico;
- codificação/decodificação de snapshots, incluindo unicode e links legados em `?data=`;
- persistência local, backup de conteúdo corrompido e rejeição atômica de estado externo;
- renderização real em Chrome headless: estado vazio, nome malicioso exibido como texto, snapshot inválido recusado, persistência após reload e confirmação antes de substituir uma lista local.

O teste E2E procura o Chrome em caminhos padrão do Windows, Linux e macOS. Para indicar outro binário, defina `CHROME_PATH`. Se o Chrome não for encontrado, apenas esse teste é marcado como ignorado.

### Sintaxe dos módulos ESM

Com o `package.json` presente, o Node.js trata os arquivos como módulos. A verificação pode ser feita diretamente:

```powershell
Get-ChildItem js -Filter '*.js' | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Falha sintática em $($_.Name)" }
}
Write-Output 'Módulos ESM válidos.'
```

### JSON

```powershell
'firebase.json', 'database.rules.json', 'site.webmanifest' |
  ForEach-Object { Get-Content $_ -Raw | ConvertFrom-Json -ErrorAction Stop | Out-Null }
```

### HTTP local

Inicie o servidor em um processo:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Em outro processo, confirme HTTP 200 para:

| Rota | Conteúdo esperado |
|---|---|
| `/` | `index.html` |
| `/js/main.js` | módulo de entrada ESM |
| `/css/style.css` | entrada dos estilos |
| `/site.webmanifest` | manifesto da aplicação |
| `/assets/icon-192.png` | ícone de 192 pixels |
| `/assets/icon-512.png` | ícone de 512 pixels |

### Renderização em Chrome headless

O redirecionamento por `cmd.exe` evita captura inconsistente da saída do Chrome pelo PowerShell:

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

O resultado esperado é título, estado vazio e SVG injetado no DOM.

### Payload externo malformado

Gere o snapshot Base64 abaixo e abra-o em um perfil Chrome headless separado:

```powershell
$json = '{"itens":[{"nome":"ItemInvalido999"}]}'
$payload = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
$url = "http://127.0.0.1:8765/#data=$payload"
```

O item não possui `id` numérico e o snapshot inteiro deve ser recusado de forma atômica. O DOM esperado continua contendo `Lista vazia!`, não contém `ItemInvalido999`, não apresenta erro fatal de renderização e exibe o aviso “Link inválido: a lista não foi alterada.”.

### Sala descartável do Release Gate

Use a URL do banco e um identificador aleatório no formato `verify-<timestamp>-<random>`. O script abaixo executa as quatro verificações e mantém o `DELETE` no `finally`, portanto a limpeza é tentada mesmo quando uma asserção falha. A API REST do Firebase Realtime Database responde HTTP 401 (Unauthorized) quando as Security Rules negam a operação:

```powershell
$base = 'https://lista-de-itens-2a16b-default-rtdb.firebaseio.com'
$id = "verify-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())-$([guid]::NewGuid().ToString('N').Substring(0,8))"
$room = "$base/listas/$id.json"

function Invoke-Rtdb([string]$Method, [string]$Uri, [string]$Body = '') {
  $params = @{ Method = $Method; Uri = $Uri; UseBasicParsing = $true }
  if ($Body) { $params.Body = $Body; $params.ContentType = 'application/json' }
  try {
    $response = Invoke-WebRequest @params
    return [pscustomobject]@{ Status = [int]$response.StatusCode; Body = $response.Content }
  } catch {
    if (-not $_.Exception.Response) { throw }
    return [pscustomobject]@{ Status = [int]$_.Exception.Response.StatusCode; Body = $_.ErrorDetails.Message }
  }
}

function Assert-Status($Response, [int[]]$Expected, [string]$Step) {
  if ($Response.Status -notin $Expected) {
    throw "${Step}: HTTP $($Response.Status), esperado $($Expected -join '/')"
  }
}

$valid = @{ itens = @(@{ id = 1; nome = 'Item de verificação'; preco = 1; quantidade = 1; unidade = 'un'; incluido = $true }); temaAtual = 'azul'; ts = 1 } | ConvertTo-Json -Depth 5 -Compress
$invalid = @{ itens = @(@{ id = 2; nome = 'Item inválido'; preco = -1; quantidade = 1; unidade = 'un'; incluido = $true; extra = 'bloqueado' }); temaAtual = 'azul'; ts = 2 } | ConvertTo-Json -Depth 5 -Compress
$incomplete = @{ itens = @(@{ id = 3; nome = 'Item incompleto' }); temaAtual = 'azul'; ts = 3 } | ConvertTo-Json -Depth 5 -Compress

try {
  $response = Invoke-Rtdb PUT $room $valid
  Assert-Status $response @(200) 'PUT válido'
  $response = Invoke-Rtdb GET $room
  Assert-Status $response @(200) 'GET da sala'
  if ($response.Body -notmatch 'Item de verificação') { throw 'GET da sala: payload não persistido' }
  $response = Invoke-Rtdb PUT $room $invalid
  Assert-Status $response @(401) 'PUT inválido'
  $response = Invoke-Rtdb PUT $room $incomplete
  Assert-Status $response @(401) 'PUT com item incompleto'
  $response = Invoke-Rtdb GET "$base/.json"
  Assert-Status $response @(401) 'GET da raiz'
} finally {
  $cleanup = Invoke-Rtdb DELETE $room
  Assert-Status $cleanup @(200) 'DELETE de limpeza'
}

$response = Invoke-Rtdb GET $room
Assert-Status $response @(200) 'GET após limpeza'
if ($response.Body.Trim() -ne 'null') { throw 'Sala descartável ainda contém dados' }
```

O teste valida as regras ativas, não apenas o arquivo local. Se o `DELETE` de limpeza falhar, o comando termina com erro e a sala deve ser removida manualmente.

## Segurança

Os relatórios das auditorias executadas estão em `security-audit/run-1/REPORT.md`, `security-audit/run-2/REPORT.md` e `security-audit/run-3/REPORT.md`. A run-3 confirmou 8 achados (XSS persistente, snapshot malformado, regras permissivas, perda de lista local, falha de publicação silenciosa, IDs inválidos e entropia insuficiente do id de sala); todos foram corrigidos neste ciclo e cobertos por `tests/`. Os relatórios registram correções e riscos residuais; não são uma garantia absoluta de segurança.

### Controles presentes

- **Renderização sem HTML injetado:** lista e histórico são construídos com `createElement` e `textContent`; nomes de itens, unidades e o identificador da sala nunca viram marcação.
- **Validação atômica de estado externo:** `normalizarEstado` exige todos os campos, tipos e limites, rejeita ids duplicados e descarta o snapshot inteiro em caso de erro, tanto no caminho Firebase quanto em `#data=`.
- **Backup antes de substituir:** a lista anterior é preservada em `listaCompras_backup`; conteúdo local corrompido também é guardado antes de ser ignorado.
- **Entrada em sala segura:** o primeiro snapshot precisa ser válido e a substituição da lista local é confirmada; sala inexistente, snapshot inválido ou timeout mantêm a lista local.
- **IDs de sala de 128 bits:** o identificador tem 22 caracteres base64url, inviabilizando adivinhação por força bruta viável.
- **Falha de publicação visível:** `publicarEstado` retorna `false` e o usuário é avisado de que a alteração ficou apenas no dispositivo.
- **Schema no RTDB:** as regras exigem todos os campos, validam tipos e limites, restringem o tema e rejeitam chaves extras.
- **Acessibilidade:** diálogos nativos com foco gerenciado, rótulos `aria-label`, `aria-pressed` nos itens, foco visível, alvos de toque de 44 px, contraste mínimo de 4,5:1 nas nove paletas e suporte a `prefers-reduced-motion`.

### Riscos residuais

- **Acesso por link secreto:** quem descobrir ou receber um `salaId` pode ler, alterar ou apagar aquela sala. Não há proprietário, autenticação nem segregação por participante.
- **Conflitos:** `set` substitui o estado inteiro. Edições simultâneas podem sobrescrever trabalho anterior; o modelo é **last-write-wins**, sem lock, transação ou merge por item.
- **Chave pública do Firebase:** a `apiKey` é pública por natureza e não deve ser tratada como credencial secreta. As regras e as permissões do projeto são o controle relevante.
- **Link contém dados:** um snapshot `#data=` pode ser registrado no histórico do navegador ou em capturas de tela. O fragmento não é enviado ao servidor, mas não oferece sigilo.
- **Sem Content Security Policy:** `index.html` não define CSP. Também não há observabilidade, alertas ou registro central de tentativas de acesso.
- **Dependências externas:** SDK do Firebase e Google Fonts são carregados por CDN, o que amplia a superfície de dependências e exige política de atualização e CSP compatível.

## Limitações

As limitações abaixo são lacunas conhecidas; cada uma corresponde a uma melhoria listada em [Próximos passos](#próximos-passos).

- **Sem Firebase Authentication:** salas e participantes não têm identidade; o acesso anônimo por posse do link é intencional no desenho atual.
- **Sem suporte offline:** não há service worker, fila de alterações nem cache da aplicação; o manifesto cobre apenas a instalação.
- **Sem resolução de conflitos:** alterações simultâneas na mesma sala podem perder dados, porque cada cliente publica o estado inteiro (last-write-wins).
- **Sem CI/CD:** validação e publicação são passos manuais. Os testes rodam localmente com `node --test`.
- **Sem analytics:** não há métricas de uso, erros ou auditoria de eventos.
- **Sem página 404 customizada:** rotas inexistentes dependem do comportamento padrão do GitHub Pages.
- **Histórico local por dispositivo:** compras finalizadas não são sincronizadas e podem ser perdidas ao limpar dados do navegador ou trocar de dispositivo.
- **Sem licença definida:** não há arquivo de licença ou termos de uso explícitos no repositório.
- **Firebase Web SDK dependente de CDN:** o SDK 10.12.2 e a fonte externa são resolvidos em tempo de execução.
- **Tema não publica imediatamente:** trocar o tema não dispara, por si só, uma escrita no Firebase.

## Próximos passos

A ordem abaixo prioriza primeiro a redução de risco e a qualidade de manutenção; recursos de produto vêm depois das garantias básicas.

| Prioridade | Tipo | Melhoria | Motivo |
|---|---|---|---|
| 1 | Corrigir risco de segurança | Adotar Firebase Authentication e vincular salas a um proprietário ou aos participantes autorizados | Elimina o acesso anônimo por posse do link e permite regras por identidade |
| 2 | Evoluir resiliência | Implementar service worker com estratégia de cache e invalidação explícita | Oferece carregamento offline controlado, sem prometer sincronização offline que o backend não suporta |
| 3 | Corrigir operação | Adicionar CI/CD para sintaxe, JSON, testes, smoke test, regras e publicação | Torna o Release Gate repetível e reduz publicação manual |
| 4 | Evoluir concorrência | Migrar de `set` integral para atualizações por item ou transações com lock | Reduz perda de dados em edições simultâneas |
| 5 | Corrigir hardening | Definir CSP compatível com as CDNs e adicionar observabilidade, alertas e auditoria | Melhora defesa e resposta a incidentes |
| 6 | Corrigir publicação e jurídico | Criar página 404 customizada e definir licença/termos de uso | Completa a experiência pública e esclarece uso do código |

### Corrigir ou evoluir?

- **Corrigir** Authentication, CI/CD, CSP, observabilidade, 404 e licenciamento fecham riscos ou lacunas operacionais existentes.
- **Evoluir** service worker/offline e transações ou lock ampliam as capacidades, mas exigem um modelo explícito de cache e resolução de conflitos para não contradizer as limitações atuais.
