# Módulo Relatórios — referência pública

Este repositório contém um snapshot de referência do módulo Relatórios e um prompt para orientar a implementação de uma opção semelhante no MeuGestorInteligente.

## Acesso
O repositório é público e pode ser lido sem autenticação. Qualquer pessoa com o link pode ver ou baixar os arquivos.

## Conteúdo
- Consultas, formulários, construtor de relatórios e seus componentes de filtros, fontes, joins, layout, gráficos, agrupamentos, sub-relatórios, prévia e exportação.
- Rotas e controles de segurança do construtor, das consultas e dos modelos de formulário.
- Migração da tabela de modelos de relatório e testes de consulta/segurança.
- PROMPT_REPLIT_MEUGESTORINTELIGENTE.md: instruções para o Replit Agent analisar o projeto de destino e adaptar o módulo.
- reference/INTEGRATION_GUIDE.md: dependências e limites da referência.
- reference/: código-fonte do snapshot, preservando a estrutura original.

## Reutilização
O código pertence a uma aplicação específica. Ele depende de autenticação, tipos, hooks, componentes, middleware, menu, permissões e esquema de dados que não estão todos incluídos. Use-o para entender e adaptar os fluxos; não é um pacote plug-and-play.

As consultas e os modelos podem conter nomes e SQL dependentes do banco de origem. Confirme tabelas, campos, permissões e isolamento por usuário/unidade no projeto de destino antes de adaptar ou executar. O acesso público a este material não abre a interface autenticada nem os dados da aplicação de origem.

Este repositório não inclui dados reais, exportações, credenciais nem segredos de ambiente. Não foi adicionada uma licença open source; a visibilidade pública permite leitura, não concede por si só uma licença ampla de redistribuição.
