# Guia de integração do snapshot

## Escopo incluído
- Consultas: interface e rotas de leitura; fontes específicas do aplicativo de origem.
- Formulários: editor de modelos com prévia e impressão; API de modelos. A definição completa da tabela de formulários não está copiada como migração isolada.
- Relatórios Gerais: fontes, exploração de schema, joins, filtros, colunas, layout, agrupamentos, gráficos, sub-relatórios, prévia, execução, modelos salvos e exportadores.
- Segurança: helper de validação de consultas, limites/parâmetros e testes relacionados.

## Dependências do host que precisam de adaptação
O editor de formulários importa tipos e configuração de menu do aplicativo, componentes Button/Input, contextos de segurança/auditoria/atalhos, hook CRUD, cliente HTTP e utilitário de impressão. O construtor usa PortalConfig/User e endpoints registrados no servidor principal. Esses adaptadores não foram publicados como uma cópia do aplicativo inteiro.

No projeto de destino, conecte as telas ao roteamento, autenticação, auditoria, componentes de UI, tipos e cliente de API já existentes. Preserve a autorização no servidor; esconder um botão na interface não substitui checagem de permissão.

## Banco e dados
A migração incluída cria a estrutura de modelos de relatório da aplicação de origem. Os leitores de consultas usam tabelas/campos do mesmo sistema. Não execute esse SQL sem revisar o esquema e a política de migrações do destino. Mapeie somente tabelas e campos existentes e autorizados, incluindo filtros obrigatórios de unidade/empresa quando aplicáveis.

## Segurança
Use parâmetros em valores, allowlists para identificadores SQL, somente leitura, limites de linhas e tempo, e autorização por rota. Não permita que o navegador defina papéis, unidade efetiva, SQL irrestrito ou acesso a outras contas. Adapte os testes de segurança à arquitetura e ao banco reais do destino.

## Arquivos
Os arquivos em reference/ preservam os caminhos relativos do aplicativo de origem, exceto o trecho de rotas do construtor, isolado em reference/server/report_builder_routes.js. Arquivos de infraestrutura compartilhada que não pertencem ao módulo foram omitidos intencionalmente.
