# Design — README, regras do Firebase e deploy

**Data:** 2026-11-20  
**Status:** proposto para aprovação  
**Escopo:** documentação e publicação do estado atual, sem refatoração funcional

## Intenção

Documentar de forma completa e utilizável o aplicativo de lista de compras, publicar a configuração versionada do Firebase Realtime Database e confirmar que o site e a sincronização funcionam nos endpoints de produção.

## Objetivos

1. Criar um `README.md` em português que explique propósito, funcionalidades, arquitetura, fluxos de dados, estrutura de arquivos, configuração, execução local, publicação, segurança, limitações e próximos passos.
2. Preservar o comportamento atual do aplicativo e a arquitetura JavaScript modular nativa.
3. Versionar a configuração mínima necessária para publicar as regras do Firebase.
4. Publicar `database.rules.json` no projeto `lista-de-itens-2a16b`.
5. Publicar o site no GitHub Pages existente (`https://kaiolopes02.github.io/Lista-de-Itens/`).
6. Verificar a publicação com evidência reproduzível: sintaxe/JSON, HTTP, navegador headless, regras ativas, leitura/escrita anônima em sala descartável e URL pública.

## Não objetivos

- Não adicionar funcionalidades ao produto.
- Não migrar GitHub Pages, Firebase ou o modelo de salas.
- Não introduzir bundler, framework, gerenciador de pacotes ou pipeline de build.
- Não implementar Firebase Authentication, lock/transações, service worker ou CI/CD nesta entrega.
- Não alterar `js/`, `css/`, `index.html` ou `site.webmanifest`, salvo se o deploy revelar um bloqueador comprovado; nesse caso, a correção será mínima, testada e registrada.

## Restrições e decisões

- O app é uma PWA estática em ESM nativo, servida sob o subcaminho `/Lista-de-Itens/`.
- O SDK Firebase Web 10.12.2 é carregado pela CDN; a configuração do app Web é pública por natureza e a proteção depende das Security Rules.
- O CLI oficial exige `firebase.json`; será adicionada apenas a configuração RTDB mínima:

```json
{
  "database": {
    "rules": "database.rules.json"
  }
}
```

- O acesso anônimo às salas é intencional no desenho atual. As regras limitam o caminho a `listas/$salaId` e validam o schema dos itens.
- Nenhum segredo ou token será gravado no repositório ou em relatórios.
- As alterações serão feitas no branch isolado `chore/readme-deploy`; a publicação no `master`_remote ocorrerá somente após revisão e verificação local.
- O deploy das regras é uma ação de produção autorizada pelo pedido de deploy; o conteúdo publicado será exatamente o arquivo versionado.

## Abordagens consideradas

1. **Plataformas atuais — escolhida.** Manter GitHub Pages e Firebase, documentar, adicionar a configuração RTDB mínima, publicar e verificar. Menor mudança e preserva a arquitetura existente.
2. **Automatizar primeiro — rejeitada.** GitHub Actions e CI exigiriam secrets e configuração adicional antes de resolver o mesmo deploy.
3. **Migrar hospedagem — rejeitada.** GitHub Pages já publica o app; migrar seria risco sem benefício.

## Implementação

### 1. Documentação e configuração

- Criar `README.md` com resumo visual, matriz de funcionalidades, stack, diagrama de arquitetura, mapa de módulos, modelo de dados, fluxos, persistência, Firebase, execução local, deploy, verificação, segurança, limitações e roadmap priorizado.
- Criar `firebase.json` com somente o alvo `database`.
- Não modificar o runtime do aplicativo.

### 2. Verificação local

- Validar os nove módulos ESM por cópias temporárias `.mjs` e `node --check` (o projeto não possui `package.json`).
- Validar `database.rules.json`, `site.webmanifest` e `firebase.json` como JSON.
- Servir a raiz por HTTP e exigir resposta 200.
- Executar smoke test em Chrome/Edge headless: título, estado vazio e ícones renderizados após o JavaScript.

### 3. Publicação do Firebase

- Inicializar/confirmar o alvo RTDB com `database.rules.json`.
- Publicar somente `database` no projeto `lista-de-itens-2a16b`.
- Confirmar as regras ativas.
- Em uma sala aleatória descartável: escrever um estado mínimo, relê-lo, tentar uma escrita com schema inválido e confirmar rejeição; remover a sala ao final.

### 4. Publicação do GitHub Pages

- Após a revisão de toda a mudança, enviar o branch validado ao `master` remoto por fast-forward, preservando o histórico.
- Verificar a URL pública até que o novo `README.md` e os demais assets estejam disponíveis com HTTP 200.
- Executar novamente o smoke test contra a URL pública.

### 5. Relatório final

Informar arquivos alterados, commits, URLs, regras publicadas, comandos/verificações e resultados. Separar claramente sucesso, avisos, limitações não corrigidas e qualquer etapa bloqueada.

## Critérios de aceite

- `README.md` explica o código existente sem afirmar capacidades ausentes.
- `firebase.json` contém apenas a configuração RTDB necessária.
- Todos os módulos ESM e JSON passam nas verificações locais.
- O site publicado responde 200 em `/Lista-de-Itens/` e `/Lista-de-Itens/README.md`.
- As regras do Firebase correspondem a `database.rules.json` e permitem apenas o schema documentado no caminho de salas.
- Uma sala descartável pode ser criada, relida e removida; uma escrita malformada é rejeitada.
- Nenhuma credencial é adicionada ao repositório.

## Decisões deixadas ao executor

- Editores e ordem final das seções do README podem variar, desde que todos os critérios acima permaneçam explícitos.
- O mecanismo exato do smoke test pode usar Chrome ou Edge headless disponível no ambiente, sem adicionar dependências ao projeto.
