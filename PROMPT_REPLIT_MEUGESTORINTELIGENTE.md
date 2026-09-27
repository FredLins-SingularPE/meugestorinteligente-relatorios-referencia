# Prompt para Replit — MeuGestorInteligente

Atue como engenheiro full-stack no projeto MeuGestorInteligente.

## Objetivo
Implemente neste aplicativo uma opção completa de Relatórios, com Consultas, Formulários e Relatórios Gerais. Integre-a à arquitetura, às permissões, ao menu lateral, ao banco de dados e às regras de acesso já existentes. Use os arquivos de referência deste Gist para compreender os fluxos, não como arquivos para copiar sem adaptação.

## Inspeção obrigatória antes de editar
1. Identifique a stack, navegação, autenticação, papéis, permissões, escopo por unidade/empresa e padrão de APIs do projeto.
2. Inspecione as tabelas e campos reais que podem alimentar relatórios. Verifique migrações e código; não adivinhe nomes nem crie dados fictícios.
3. Verifique se já existem telas, formulários, exportadores, APIs ou tabelas de relatórios para reutilizar.
4. Apresente um mapa curto de integração. Se uma regra de negócio não puder ser inferida do código, pergunte antes de assumi-la.

## Menu e permissões
Integre Relatórios ao menu lateral existente e use a convenção atual para módulos, opções, rotas e identificadores. Não duplique entradas. As opções devem respeitar as permissões reais do MeuGestorInteligente e ser verificadas tanto na interface quanto no servidor. Não reutilize IDs de permissões, papéis ou opções de menu deste aplicativo de referência.

Se compatível com a estrutura de destino, ofereça Consultas, Formulários e Relatórios Gerais; adapte os rótulos quando necessário.

## Consultas
- Consulte apenas tabelas e colunas reais e autorizadas.
- Ofereça busca, filtros, ordenação e paginação ou limites, além de estados de carregamento, vazio, erro e acesso negado.
- Respeite permissões do módulo de origem e o isolamento por usuário, grupo, unidade ou empresa utilizado no MeuGestorInteligente.
- As fontes no código de referência são exemplos específicos do sistema de origem; implemente apenas as que existirem no projeto de destino.

## Formulários
- Reutilize o modelo de formulários existente; crie uma estrutura nova apenas se não houver alternativa e se for necessária.
- Inclua operações autorizadas de listagem, criação e edição; exclusão ou arquivamento conforme o padrão atual.
- Preserve recursos compatíveis, como importação DOCX, variáveis associadas a campos reais, associação a módulos, prévia e impressão.

## Relatórios Gerais
- Permita compor relatórios usando fontes reais, campos, filtros, colunas, layout e, quando os dados permitirem, agrupamentos, gráficos e sub-relatórios.
- Permita salvar, executar, editar e remover modelos segundo as permissões existentes.
- A prévia deve refletir os filtros e parâmetros da execução e continuar utilizável em telas estreitas.
- A exportação dos resultados deve usar os formatos e dependências compatíveis com o projeto e manter os mesmos filtros e controles de acesso.

## Segurança e banco
- Não confie em permissões, escopo ou SQL fornecidos pelo navegador.
- Se houver SQL dinâmico, aceite somente leitura, use parâmetros, limite linhas e tempo de execução, e bloqueie comandos/funções com efeitos colaterais.
- Faça mudanças de banco somente quando necessárias. Use migrações aditivas, sem editar migrações já aplicadas, apagar dados ou alterar produção sem autorização.
- Nunca inclua credenciais, segredos, dados reais ou conteúdo de usuários em código de exemplo, logs ou arquivos exportados.

## Pacote reutilizável
Ao concluir, gere um ZIP versionado contendo somente os arquivos necessários ao módulo, um manifest com stack, dependências e pontos de integração, instruções de instalação em outro Repl e testes/verificações mínimas. Documente as adaptações exigidas para autenticação, permissões, menu, tabelas, campos e escopo de dados. Não inclua .env, segredos, dados reais ou configurações privadas. Diferencie esse ZIP da exportação de resultados (CSV, XLSX, PDF etc.).

## Validação e entrega
Teste perfis com permissões diferentes, bloqueios no servidor, isolamento de dados, filtros, resultados vazios, limites, falhas, exportações e visualização responsiva. Execute os testes e a compilação adequados. Ao final, liste as fontes e permissões realmente integradas, as adaptações feitas e onde encontrar o ZIP. Explique qualquer recurso bloqueado por uma decisão de negócio pendente.
