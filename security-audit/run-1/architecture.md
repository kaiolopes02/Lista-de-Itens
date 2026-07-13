# Arquitetura — Lista de Itens

## Visão geral
PWA (Progressive Web App) de lista de compras colaborativa. Frontend puro (HTML + CSS + JS ES modules), sem build step.

## Superfície de entrada
| Entrada | Arquivo | Tipo |
|---------|---------|------|
| URL params (`?sala=`, `?data=`) | main.js | Dados externos |
| localStorage | storage.js | Dados persistidos |
| Firebase Realtime Database | sync.js | Dados remotos |
| Formulário HTML (nome, preço, qtd) | itens.js | Input usuário |
| Web Share / Clipboard API | main.js | Output |

## Trust boundaries
- **localStorage → state**: confiável (mesmo origin), mas validado contra JSON malformado
- **URL params → state**: NÃO confiável — atacante controla `?data=` (base64) e `?sala=`
- **Firebase → state**: semi-confiável — autenticação via regras Firebase (não verificável no source)
- **DOM rendering**: `escHtml()` presente em lista.js e historico.js para `item.nome`

## Módulos
| Módulo | Responsabilidade |
|--------|-----------------|
| main.js | Inicialização, eventos, sharing, URL parsing |
| storage.js | State (memória + localStorage), histórico |
| sync.js | Firebase Realtime Database sync |
| itens.js | CRUD de itens, formulário |
| lista.js | Renderização da lista, totais, ordenação |
| historico.js | Modal de histórico |
| tema.js | 9 temas de cor |
| notificacao.js | Toast notifications |
| icones.js | SVG icons inline |
