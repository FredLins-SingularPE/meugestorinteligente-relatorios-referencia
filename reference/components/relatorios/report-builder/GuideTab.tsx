import React, { useState } from 'react';

type Section = 'visao_geral' | 'fonte_dados' | 'layout' | 'graficos' | 'subreports' | 'preview' | 'modelos' | 'tabelas' | 'sql_ref' | 'dicas';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'visao_geral', label: 'Visao Geral' },
  { id: 'fonte_dados', label: 'Fonte de Dados' },
  { id: 'layout', label: 'Layout' },
  { id: 'graficos', label: 'Graficos' },
  { id: 'subreports', label: 'Sub-relatorios' },
  { id: 'preview', label: 'Preview e Exportacao' },
  { id: 'modelos', label: 'Modelos de Relatorios' },
  { id: 'tabelas', label: 'Tabelas do Banco' },
  { id: 'sql_ref', label: 'Referencia SQL' },
  { id: 'dicas', label: 'Dicas e Solucoes' },
];

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-xs border-collapse border border-gray-200">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border border-gray-200 px-3 py-2 bg-moss-50 text-left font-bold text-moss-800 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? 'bg-gray-50' : ''}>
              {row.map((cell, ci) => (
                <td key={ci} className="border border-gray-200 px-3 py-1.5 text-gray-700">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 text-green-400 text-[11px] p-3 rounded-lg overflow-x-auto mb-4 whitespace-pre-wrap">{code}</pre>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-moss-800 mb-2 mt-4 border-b border-moss-200 pb-1">{children}</h3>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-bold text-gray-700 mb-1.5 mt-3">{children}</h4>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-600 mb-2 leading-relaxed">{children}</p>;
}

function VisaoGeral() {
  return (
    <div>
      <SectionTitle>Visao Geral do Gerador de Relatorios</SectionTitle>
      <Para>O Gerador de Relatorios permite criar relatorios personalizados utilizando consultas SQL no banco de dados PostgreSQL. Ele esta acessivel no menu Relatorios &gt; Relatorios Gerais.</Para>

      <SubTitle>Recursos Disponiveis</SubTitle>
      <Table
        headers={['Recurso', 'Descricao']}
        rows={[
          ['Fonte de Dados Visual', 'Construcao de consultas SQL sem escrever codigo, com selecao de tabelas, colunas e joins'],
          ['Fonte de Dados SQL', 'Escrita direta de SQL para consultas avancadas (CTE, subqueries, UNION)'],
          ['Layout Personalizavel', 'Cabecalho, colunas com formatacao, agrupamento com subtotais, rodape'],
          ['Graficos', 'Barras (vertical/horizontal/empilhada), Pizza/Rosca, Linhas/Area, Misto (Barras+Linhas)'],
          ['Sub-relatorios', 'Resumo automatico ou query independente exibida abaixo do relatorio principal'],
          ['Filtros Dinamicos', 'Parametros que o usuario preenche ao executar o relatorio'],
          ['Exportacao', 'PDF, Excel (.xlsx), Word (.doc), CSV, HTML e impressao direta'],
          ['Controle de Acesso', 'Restricao por usuario e/ou grupo de usuarios'],
        ]}
      />

      <SubTitle>Barra de Ferramentas</SubTitle>
      <Table
        headers={['Botao', 'Funcao']}
        rows={[
          ['Novo', 'Cria um novo relatorio em branco'],
          ['Salvar', 'Abre o modal de salvamento (nome, categoria, permissoes)'],
          ['Excluir', 'Remove o relatorio selecionado'],
          ['Conteudo', 'Alterna: Dados / Graficos / Ambos'],
          ['Layout', 'Define: Responsivo / Web / Mobile'],
        ]}
      />

      <SubTitle>Categorias</SubTitle>
      <Table
        headers={['Categoria', 'Uso Recomendado']}
        rows={[
          ['Cadastrais', 'Listagem de clientes, colaboradores, bancos'],
          ['Financeiro', 'Contas a receber/pagar, movimentacoes, titulos'],
          ['Comercial', 'Admissoes, fichas comerciais, movimentacao de clientes'],
          ['Juridico', 'Processos juridicos, prazos, audiencias'],
          ['Negociacao', 'Negociacoes de dividas, propostas'],
          ['Cobranca', 'Titulos em atraso, aging, inadimplencia'],
          ['Administrativo', 'Colaboradores, departamentos, escalas'],
          ['Outros', 'Relatorios diversos'],
        ]}
      />

      <SubTitle>Abas do Report Builder</SubTitle>
      <Table
        headers={['Aba', 'Funcao', 'Quando Usar']}
        rows={[
          ['Fonte de Dados', 'Define a consulta SQL', 'Primeiro passo: definir de onde vem os dados'],
          ['Layout', 'Configura aparencia visual', 'Segundo passo: formatar colunas, cabecalho, rodape'],
          ['Graficos', 'Adiciona visualizacoes graficas', 'Opcional: adicionar graficos de barras, pizza, etc.'],
          ['Sub-relatorios', 'Adiciona secoes complementares', 'Opcional: resumos ou queries adicionais'],
          ['Preview', 'Executa e exporta o relatorio', 'Passo final: gerar, visualizar e exportar'],
          ['Guia', 'Manual de instrucoes', 'Consulta: como montar cada tipo de relatorio'],
        ]}
      />
    </div>
  );
}

function FonteDados() {
  return (
    <div>
      <SectionTitle>Aba Fonte de Dados</SectionTitle>
      <Para>Define de onde vem os dados do relatorio. Possui dois modos: Visual e SQL.</Para>

      <SubTitle>Modo Visual - Schema Explorer</SubTitle>
      <Table
        headers={['Componente', 'Funcao', 'Como Usar']}
        rows={[
          ['Busca de tabelas', 'Filtrar tabelas por nome', 'Digite o nome da tabela no campo de busca'],
          ['Selecao de tabelas', 'Escolher tabelas do banco', 'Clique na tabela para expandir e ver colunas'],
          ['Selecao de colunas', 'Marcar campos desejados', 'Marque os checkboxes das colunas que quer incluir'],
          ['Badges de tipo', 'Mostra tipo de dados', 'varchar, integer, uuid, numeric, date, boolean, etc.'],
        ]}
      />

      <SubTitle>Modo Visual - Construtor de JOINs</SubTitle>
      <Para>Aparece automaticamente quando duas ou mais tabelas sao selecionadas.</Para>
      <Table
        headers={['Campo', 'Descricao', 'Opcoes']}
        rows={[
          ['Tabela esquerda', 'Primeira tabela da juncao', 'Selecionar entre tabelas ativas'],
          ['Coluna esquerda', 'Campo de ligacao da tabela esquerda', 'Nome da coluna (ex: id, client_id)'],
          ['Tipo de JOIN', 'Como as tabelas se relacionam', 'INNER JOIN / LEFT JOIN / RIGHT JOIN'],
          ['Tabela direita', 'Segunda tabela da juncao', 'Selecionar entre tabelas ativas'],
          ['Coluna direita', 'Campo de ligacao da tabela direita', 'Nome da coluna'],
        ]}
      />

      <SubTitle>Tipos de JOIN</SubTitle>
      <Table
        headers={['Tipo', 'Descricao', 'Quando Usar']}
        rows={[
          ['INNER JOIN', 'Retorna apenas registros que existem em ambas as tabelas', 'Somente dados com correspondencia nas duas tabelas'],
          ['LEFT JOIN', 'Retorna todos da esquerda, mesmo sem correspondencia', 'Todos os registros da primeira tabela, com ou sem dados na segunda'],
          ['RIGHT JOIN', 'Retorna todos da direita, mesmo sem correspondencia', 'Inverso do LEFT JOIN'],
        ]}
      />

      <SubTitle>Modo Visual - Filtros WHERE</SubTitle>
      <Table
        headers={['Campo', 'Descricao']}
        rows={[
          ['Campo', 'Coluna selecionada no Schema Explorer'],
          ['Operador', '=, !=, >, <, >=, <=, LIKE, IN, BETWEEN, IS NULL, IS NOT NULL'],
          ['Valor', 'Valor fixo ou parametro dinamico {{nome_do_parametro}}'],
          ['Conector logico', 'AND (E) ou OR (OU) entre multiplas condicoes'],
        ]}
      />

      <SubTitle>Operadores Disponiveis no WHERE</SubTitle>
      <Table
        headers={['Operador', 'Significado', 'Exemplo']}
        rows={[
          ['=', 'Igual', "status = 'ABERTO'"],
          ['!=', 'Diferente', "status != 'CANCELADO'"],
          ['>', 'Maior que', 'value > 1000'],
          ['<', 'Menor que', 'value < 5000'],
          ['>=', 'Maior ou igual', "due_date >= '2026-01-01'"],
          ['<=', 'Menor ou igual', "due_date <= '2026-12-31'"],
          ['LIKE', 'Contem texto (% = coringa)', "name LIKE '%Silva%'"],
          ['IN', 'Esta na lista', "status IN ('ABERTO', 'PARCIAL')"],
          ['BETWEEN', 'Entre dois valores', "due_date BETWEEN '2026-01-01' AND '2026-06-30'"],
          ['IS NULL', 'E nulo/vazio', 'email IS NULL'],
          ['IS NOT NULL', 'Nao e nulo', 'phone IS NOT NULL'],
        ]}
      />

      <SubTitle>Modo Visual - Ordenacao e Agrupamento</SubTitle>
      <Table
        headers={['Campo', 'Funcao']}
        rows={[
          ['ORDER BY', 'Adicione colunas para definir a ordenacao dos resultados'],
          ['GROUP BY', 'Adicione colunas para agrupar (necessario com SUM, COUNT, AVG)'],
        ]}
      />

      <SubTitle>Modo SQL</SubTitle>
      <Table
        headers={['Recurso', 'Descricao']}
        rows={[
          ['Editor de texto', 'Area ampla para escrever SQL diretamente'],
          ['Historico', 'Ultimas 10 consultas executadas com sucesso (clique para restaurar)'],
          ['Executar Preview', 'Valida a query e mostra os primeiros 50 registros'],
          ['Seguranca', 'Apenas SELECT e WITH (CTE) sao permitidos'],
        ]}
      />

      <SubTitle>Preview de Dados</SubTitle>
      <Table
        headers={['Elemento', 'Descricao']}
        rows={[
          ['Tabela de resultados', 'Grade rolavel com os dados retornados (limite: 50 registros)'],
          ['Contagem', 'Numero de registros retornados'],
          ['Tempo de execucao', 'Duracao em milissegundos'],
          ['Valores NULL', 'Exibidos em italico'],
          ['Deteccao de colunas', 'Ao executar, colunas sao automaticamente detectadas para as abas Layout e Graficos'],
        ]}
      />
    </div>
  );
}

function LayoutSection() {
  return (
    <div>
      <SectionTitle>Aba Layout</SectionTitle>
      <Para>Configura toda a aparencia visual do relatorio: cabecalho, colunas, agrupamento, rodape e configuracoes gerais.</Para>

      <SubTitle>Cabecalho</SubTitle>
      <Table
        headers={['Campo', 'Descricao', 'Exemplo']}
        rows={[
          ['Titulo', 'Texto principal do relatorio', 'Relatorio de Colaboradores'],
          ['Subtitulo', 'Descricao complementar (opcional)', 'Todos os colaboradores ativos'],
          ['Logotipo', 'Upload de imagem (URL ou Base64)', 'Logo da empresa'],
          ['Mostrar Logo', 'Liga/desliga exibicao do logotipo', 'Ativado automaticamente no upload'],
          ['Alinhamento', 'Posicao do cabecalho', 'Esquerda / Centro / Direita'],
          ['Mostrar Data', 'Data de geracao do relatorio', 'Sim/Nao'],
        ]}
      />

      <SubTitle>Formatos de Coluna</SubTitle>
      <Table
        headers={['Formato', 'Codigo', 'Descricao', 'Exemplo de Saida']}
        rows={[
          ['Texto', 'text', 'Texto simples sem formatacao', 'Joao da Silva'],
          ['Numero', 'number', 'Separadores de milhar, 2 casas', '1.234,56'],
          ['Moeda BRL', 'currency_brl', 'Formato monetario brasileiro', 'R$ 1.500,00'],
          ['Data', 'date', 'Data formato brasileiro', '07/03/2026'],
          ['CPF/CNPJ', 'cpf_cnpj', 'Detecta CPF (11 dig) ou CNPJ (14 dig)', '123.456.789-00'],
          ['Percentual', 'percent', 'Com simbolo % e 2 casas', '85,50%'],
        ]}
      />

      <SubTitle>Configuracao de Cada Coluna</SubTitle>
      <Table
        headers={['Campo', 'Descricao', 'Opcoes']}
        rows={[
          ['Visivel', 'Se a coluna aparece no relatorio', 'Liga/Desliga'],
          ['Rotulo (Label)', 'Nome exibido no cabecalho da tabela', 'Texto livre'],
          ['Largura', 'Largura da coluna', 'Percentual (ex: 15%) ou "auto"'],
          ['Alinhamento', 'Posicao horizontal do conteudo', 'Esquerda / Centro / Direita'],
          ['Formato', 'Formatacao aplicada aos valores', 'text, number, currency_brl, date, cpf_cnpj, percent'],
          ['Ordem', 'Posicao da coluna no relatorio', 'Botoes de seta para mover'],
        ]}
      />

      <SubTitle>Agrupamento e Quebras</SubTitle>
      <Table
        headers={['Campo', 'Descricao']}
        rows={[
          ['Campos para agrupar', 'Campo(s) que definem o grupo (cada valor distinto cria uma secao)'],
          ['Template do cabecalho', 'Texto dinamico com {campo}. Ex: Cliente: {Nome}'],
          ['Exibir subtotais', 'Liga/desliga totais por grupo'],
          ['Totalizadores', 'Operacoes por coluna numerica no grupo'],
        ]}
      />

      <SubTitle>Operacoes de Totalizacao</SubTitle>
      <Table
        headers={['Operacao', 'Codigo', 'Descricao']}
        rows={[
          ['Nenhum', 'nenhum', 'Sem totalizacao'],
          ['Soma', 'soma', 'Soma de todos os valores'],
          ['Contagem', 'contagem', 'Quantidade de registros'],
          ['Media', 'media', 'Media aritmetica dos valores'],
          ['Minimo', 'min', 'Menor valor'],
          ['Maximo', 'max', 'Maior valor'],
        ]}
      />

      <SubTitle>Rodape</SubTitle>
      <Table
        headers={['Campo', 'Descricao']}
        rows={[
          ['Exibir totalizadores gerais', 'Totais de todo o relatorio (soma, contagem, etc.)'],
          ['Totalizadores', 'Mesmas operacoes do agrupamento, aplicadas ao total'],
          ['Pagina X de Y', 'Paginacao no rodape'],
          ['Data/hora', 'Data e hora da geracao'],
          ['Texto personalizado', 'Texto livre. Ex: Documento confidencial'],
        ]}
      />

      <SubTitle>Configuracoes Gerais</SubTitle>
      <Table
        headers={['Campo', 'Opcoes', 'Descricao']}
        rows={[
          ['Orientacao', 'Retrato / Paisagem', 'Paisagem para muitas colunas'],
          ['Tamanho do papel', 'A4 / Carta / Oficio', 'Dimensoes para impressao e PDF'],
          ['Margens', 'Superior/Inferior/Esquerda/Direita (mm)', 'Espacamento das bordas'],
          ['Tamanho da fonte', '8, 9, 10, 11, 12, 14 pt', 'Fontes menores = mais dados por pagina'],
          ['Linhas zebradas', 'Liga/Desliga', 'Alternancia de cor (cinza/branco) nas linhas'],
          ['Layout de destino', 'Responsivo / Web / Mobile', 'Responsivo = auto-adapta; Mobile = cards empilhados'],
        ]}
      />
    </div>
  );
}

function GraficosSection() {
  return (
    <div>
      <SectionTitle>Aba Graficos</SectionTitle>
      <Para>Permite adicionar uma ou mais visualizacoes graficas ao relatorio. Cada grafico e configurado individualmente.</Para>

      <SubTitle>Tipos de Grafico Disponiveis</SubTitle>
      <Table
        headers={['Tipo', 'Subtipo', 'Descricao', 'Melhor Para']}
        rows={[
          ['Barra (bar)', 'Vertical', 'Barras verticais lado a lado', 'Comparacao entre categorias'],
          ['Barra (bar)', 'Horizontal', 'Barras horizontais', 'Rankings, nomes longos'],
          ['Barra (bar)', 'Empilhada (Stacked)', 'Barras empilhadas', 'Composicao de categorias'],
          ['Pizza (pie)', 'Pizza', 'Circulo completo em fatias', 'Distribuicao percentual (3-6 itens)'],
          ['Pizza (pie)', 'Rosca (Donut)', 'Pizza com furo no centro', 'Distribuicao com visual moderno'],
          ['Linhas (line)', 'Linha', 'Pontos conectados por linhas', 'Tendencias ao longo do tempo'],
          ['Linhas (line)', 'Area', 'Linha com preenchimento', 'Volume/acumulado temporal'],
          ['Misto (mixed)', '-', 'Combina barras e linhas', 'Comparar metricas de escalas diferentes'],
        ]}
      />

      <SubTitle>Configuracao dos Eixos</SubTitle>
      <Table
        headers={['Configuracao', 'Descricao', 'Exemplo']}
        rows={[
          ['Eixo X (Campo X)', 'Coluna das categorias ou periodos', 'Mes, Status, Cliente'],
          ['Eixo Y (Series)', 'Campos numericos a serem plotados', 'Valor, Quantidade, Media'],
          ['Operacao Y', 'Como agregar valores por categoria X', 'Direto, Soma, Contagem, Media'],
          ['Cor da serie', 'Cor hexadecimal individual', '#3B82F6 (azul)'],
          ['Tipo de serie (Misto)', 'Forcar como Barra ou Linha', 'Barras para volume, Linha para tendencia'],
          ['Eixo secundario (Misto)', 'Usar eixo Y da direita', 'Para escalas muito diferentes'],
        ]}
      />

      <SubTitle>Operacoes do Eixo Y</SubTitle>
      <Table
        headers={['Operacao', 'Codigo', 'Descricao']}
        rows={[
          ['Direto', 'direto', 'Usa o valor como esta, sem agregacao'],
          ['Soma', 'soma', 'Soma os valores por categoria do eixo X'],
          ['Contagem', 'contagem', 'Conta os registros por categoria'],
          ['Media', 'media', 'Calcula a media por categoria'],
        ]}
      />

      <SubTitle>Opcoes Visuais</SubTitle>
      <Table
        headers={['Opcao', 'Descricao']}
        rows={[
          ['Titulo', 'Texto exibido acima do grafico'],
          ['Exibir legenda', 'Mostra/oculta a legenda na parte inferior'],
          ['Exibir valores', 'Mostra numeros sobre as barras/fatias/pontos'],
          ['Exibir grade', 'Linhas de fundo (para graficos com eixos)'],
        ]}
      />

      <SubTitle>Paletas de Cores</SubTitle>
      <Table
        headers={['Paleta', 'Descricao', 'Recomendacao']}
        rows={[
          ['Padrao', 'Azul, vermelho, verde, amarelo, roxo, rosa, ciano, laranja', 'Uso geral, boa distincao'],
          ['Pastel', 'Tons suaves das cores padrao', 'Relatorios impressos'],
          ['Escuro', 'Tons escuros e profundos', 'Alto contraste, apresentacoes'],
          ['Monocromatico', 'Gradiente de tons de azul', 'Foco em uma dimensao'],
        ]}
      />

      <SubTitle>Posicionamento e Tamanho</SubTitle>
      <Table
        headers={['Campo', 'Opcoes', 'Descricao']}
        rows={[
          ['Posicao', 'Antes / Depois', 'Onde o grafico aparece em relacao a tabela'],
          ['Largura', '100% / 50%', 'Tela cheia ou meia tela (2 graficos lado a lado com 50%)'],
        ]}
      />
    </div>
  );
}

function SubreportsSection() {
  return (
    <div>
      <SectionTitle>Aba Sub-relatorios</SectionTitle>
      <Para>Sub-relatorios sao secoes adicionais exibidas abaixo do relatorio principal. Podem ser de dois tipos.</Para>

      <SubTitle>Tipos de Sub-relatorio</SubTitle>
      <Table
        headers={['Tipo', 'Descricao', 'Quando Usar']}
        rows={[
          ['Resumo Automatico (summary)', 'Agrupamento automatico dos dados do relatorio principal', 'Totalizar dados ja existentes por categoria/status'],
          ['Query Independente (query)', 'Consulta SQL separada e independente', 'Perspectiva complementar com dados diferentes'],
        ]}
      />

      <SubTitle>Configuracao do Resumo Automatico</SubTitle>
      <Table
        headers={['Campo', 'Descricao']}
        rows={[
          ['Campo de agrupamento', 'Coluna para agrupar os dados do relatorio principal'],
          ['Operacoes', 'Para cada coluna numerica: Soma, Contagem, Media, Min, Max'],
        ]}
      />

      <SubTitle>Configuracao da Query Independente</SubTitle>
      <Table
        headers={['Campo', 'Descricao']}
        rows={[
          ['SQL', 'Editor de texto para a consulta SELECT independente'],
          ['Testar Query', 'Botao que executa e mostra os primeiros 10 resultados'],
          ['Parametros', 'Suporta placeholders {{nome}} conectados aos filtros do relatorio principal'],
        ]}
      />

      <SubTitle>Configuracao de Colunas do Sub-relatorio</SubTitle>
      <Table
        headers={['Campo', 'Descricao', 'Opcoes']}
        rows={[
          ['Campo (Field)', 'Nome da coluna no resultado da query', 'Nome exato do campo SQL'],
          ['Rotulo (Label)', 'Nome exibido no cabecalho', 'Texto livre'],
          ['Formato', 'Formatacao aplicada', 'Nenhum, Texto, Numero, Moeda (R$), Percentual (%), Data, Data/Hora'],
          ['Alinhamento', 'Posicao do conteudo', 'Esquerda / Centro / Direita'],
          ['Largura', 'Percentual da largura total', 'Ex: 15'],
        ]}
      />

      <SubTitle>Formatos de Sub-relatorio</SubTitle>
      <Table
        headers={['Formato', 'Codigo']}
        rows={[
          ['Nenhum', '(vazio)'],
          ['Texto', 'text'],
          ['Numero', 'number'],
          ['Moeda (R$)', 'currency'],
          ['Percentual (%)', 'percent'],
          ['Data', 'date'],
          ['Data/Hora', 'datetime'],
        ]}
      />
    </div>
  );
}

function PreviewSection() {
  return (
    <div>
      <SectionTitle>Aba Preview e Exportacao</SectionTitle>

      <SubTitle>Filtros Dinamicos</SubTitle>
      <Table
        headers={['Tipo de Filtro', 'Uso', 'Exemplo no SQL']}
        rows={[
          ['text', 'Busca parcial por texto', "name ILIKE '%' || {{busca}} || '%'"],
          ['date', 'Selecao de data/periodo', 'due_date >= {{data_inicio}}'],
          ['number', 'Valor numerico', 'value >= {{valor_minimo}}'],
          ['select', 'Lista fechada de opcoes', 'status = {{status}}'],
        ]}
      />
      <Para>Use placeholders {'{{nome}}'} ou :nome no SQL. O sistema gera automaticamente os campos de entrada no Preview.</Para>

      <SubTitle>Fluxo de Geracao</SubTitle>
      <Table
        headers={['Passo', 'Acao']}
        rows={[
          ['1', 'Preencha os filtros dinamicos (se houver)'],
          ['2', 'Clique em "Gerar Relatorio"'],
          ['3', 'O sistema executa a consulta principal e todas as queries de sub-relatorios'],
          ['4', 'O resultado e renderizado: Cabecalho > Graficos (antes) > Tabela > Graficos (depois) > Sub-relatorios > Rodape'],
        ]}
      />

      <SubTitle>Formatos de Exportacao</SubTitle>
      <Table
        headers={['Formato', 'Descricao', 'Inclui']}
        rows={[
          ['Imprimir', 'Abre janela de impressao do navegador', 'Cabecalho + dados + sub-relatorios'],
          ['PDF', 'Arquivo PDF formatado (via pdfmake)', 'Cabecalho + tabela + sub-relatorios + rodape'],
          ['Excel', 'Planilha .xlsx (via exceljs)', 'Dados na aba principal + sub-relatorios em ABAS SEPARADAS'],
          ['Word', 'Documento .doc', 'Cabecalho + tabela + sub-relatorios em HTML'],
          ['CSV', 'Texto separado por ponto-e-virgula', 'APENAS dados da tabela principal (sem graficos)'],
          ['HTML', 'Pagina HTML standalone', 'Tudo (cabecalho, dados, sub-relatorios, estilos)'],
        ]}
      />

      <SubTitle>Detalhes dos Formatos</SubTitle>
      <Table
        headers={['Formato', 'Detalhe Tecnico']}
        rows={[
          ['PDF', 'Respeita orientacao (retrato/paisagem), tamanho do papel, cores zebradas'],
          ['Excel', 'Sub-relatorios viram planilhas separadas. Dados numericos mantidos para calculos'],
          ['Word', 'Gera HTML com namespaces XML do Word para compatibilidade'],
          ['CSV', 'Usa ponto-e-virgula (;) como separador + BOM UTF-8 para Excel em portugues'],
          ['HTML', 'Arquivo autossuficiente com estilos inline'],
        ]}
      />
    </div>
  );
}

function ModelosSection() {
  return (
    <div>
      <SectionTitle>Modelos de Relatorios Possiveis</SectionTitle>
      <Para>Tabela completa com todos os modelos de relatorios que podem ser criados, com instrucoes e exemplos SQL.</Para>

      <Table
        headers={['#', 'Modelo', 'Descricao', 'Modo Conteudo', 'Recursos Usados']}
        rows={[
          ['1', 'Tabela Simples (Cadastro)', 'SELECT direto em uma unica tabela', 'Dados', 'Layout basico, formatacao de colunas'],
          ['2', 'JOIN entre Tabelas', 'Combina duas ou mais tabelas relacionadas', 'Dados', 'INNER/LEFT JOIN, agrupamento'],
          ['3', 'Agrupamento (GROUP BY)', 'Consolida e totaliza dados com funcoes de agregacao', 'Dados', 'SUM, COUNT, AVG, HAVING, CASE WHEN'],
          ['4', 'Grafico de Barras', 'Comparacao de valores entre categorias', 'Ambos', 'Grafico vertical/horizontal/empilhado'],
          ['5', 'Grafico de Pizza/Rosca', 'Distribuicao percentual', 'Ambos', 'Pizza ou Donut, ate 6 categorias'],
          ['6', 'Grafico de Linhas/Area', 'Evolucao temporal e tendencias', 'Ambos', 'Linha ou area preenchida'],
          ['7', 'Grafico Misto (Barras+Linhas)', 'Comparar metricas de escalas diferentes', 'Ambos', 'Dual Y-axis, series mistas'],
          ['8', 'Barras Empilhadas (Stacked)', 'Composicao de cada periodo/categoria', 'Ambos', 'Barras empilhadas por dimensao'],
          ['9', 'Somente Graficos', 'Apenas visualizacoes sem tabela', 'Graficos', 'Dashboards, paineis gerenciais'],
          ['10', 'Sub-relatorio de Resumo', 'Relatorio principal + resumo automatico', 'Dados', 'Summary groupField, operacoes'],
          ['11', 'Sub-relatorio de Query', 'Relatorio principal + consulta SQL independente', 'Ambos', 'SQL adicional, colunas proprias'],
          ['12', 'Misto Completo', 'Tabela + graficos + sub-relatorio', 'Ambos', 'Todos os recursos combinados'],
          ['13', 'CTE (WITH)', 'Common Table Expressions para consultas complexas', 'Dados', 'WITH ... AS, subqueries legíveis'],
          ['14', 'Comparativo Periodo x Periodo', 'Compara valores entre periodos diferentes', 'Ambos', 'CASE WHEN por periodo, dual columns'],
          ['15', 'Ranking (TOP N)', 'Lista os N maiores/menores registros', 'Dados', 'ROW_NUMBER() OVER, LIMIT'],
          ['16', 'Aging (Vencimentos por Faixa)', 'Classifica titulos por faixas de atraso', 'Dados', 'CASE WHEN por faixa, COUNT'],
          ['17', 'Multiplos Graficos', 'Dois ou mais graficos diferentes', 'Ambos', 'Varios graficos, largura 50% lado a lado'],
          ['18', 'Multiplos Sub-relatorios', 'Varias secoes complementares', 'Ambos', 'Cada sub-relatorio vira aba no Excel'],
          ['19', 'Filtros Parametrizados', 'Parametros informados na execucao', 'Dados', 'Placeholders {{nome}}, inputs dinamicos'],
          ['20', 'Mobile', 'Otimizado para smartphones', 'Dados', 'Cards empilhados, fontes maiores'],
        ]}
      />

      <SubTitle>Modelo 1 - Tabela Simples (Cadastro)</SubTitle>
      <Para>Passo a passo: Fonte de Dados (Visual: selecione tabela e colunas) &gt; Layout (formatar colunas) &gt; Preview (executar).</Para>
      <CodeBlock code={`SELECT
  name AS "Nome", document AS "CPF/CNPJ", phone AS "Telefone",
  email AS "E-mail", city AS "Cidade", state AS "UF"
FROM clients ORDER BY name`} />

      <SubTitle>Modelo 2 - JOIN entre Tabelas</SubTitle>
      <Para>Visual: selecione 2 tabelas, configure JOIN no builder. SQL: escreva SELECT com INNER/LEFT JOIN.</Para>
      <CodeBlock code={`SELECT c.name AS "Cliente", ft.description AS "Titulo",
  ft.value AS "Valor", ft.status AS "Status",
  TO_CHAR(ft.due_date, 'DD/MM/YYYY') AS "Vencimento"
FROM clients c
INNER JOIN financial_titles ft ON ft.client_id = c.id
ORDER BY c.name`} />

      <SubTitle>Modelo 3 - Agrupamento (GROUP BY)</SubTitle>
      <Para>Use funcoes de agregacao (SUM, COUNT, AVG) com GROUP BY. Use HAVING para filtrar grupos.</Para>
      <CodeBlock code={`SELECT c.name AS "Cliente",
  COUNT(DISTINCT a.id) AS "Admissoes",
  COALESCE(SUM(ft.value), 0) AS "Total a Receber"
FROM clients c
LEFT JOIN admissions a ON a.client_id = c.id
LEFT JOIN financial_titles ft ON ft.client_id = c.id AND ft.title_scope = 'RECEBER'
GROUP BY c.id, c.name
ORDER BY c.name`} />

      <SubTitle>Modelo 4 - Grafico de Barras</SubTitle>
      <Para>Graficos &gt; Adicionar &gt; Tipo: Barra &gt; Eixo X: categoria &gt; Eixo Y: valor numerico + operacao.</Para>
      <CodeBlock code={`SELECT TO_CHAR(a.date, 'YYYY-MM') AS "Periodo",
  COUNT(*) AS "Quantidade"
FROM admissions a
GROUP BY TO_CHAR(a.date, 'YYYY-MM')
ORDER BY "Periodo"`} />

      <SubTitle>Modelo 5 - Grafico de Pizza/Rosca</SubTitle>
      <Para>Graficos &gt; Tipo: Pizza &gt; Subtipo: Pizza ou Donut &gt; Eixo X: categoria &gt; Eixo Y: valor.</Para>
      <CodeBlock code={`SELECT status AS "Status", COUNT(*) AS "Quantidade"
FROM admissions GROUP BY status ORDER BY "Quantidade" DESC`} />

      <SubTitle>Modelo 6 - Grafico de Linhas/Area</SubTitle>
      <Para>Graficos &gt; Tipo: Linhas &gt; Subtipo: Linha ou Area &gt; Eixo X: periodo temporal &gt; Eixo Y: valor.</Para>
      <CodeBlock code={`SELECT TO_CHAR(ft.due_date, 'YYYY-MM') AS "Mes",
  SUM(ft.value) AS "Valor Total"
FROM financial_titles ft
WHERE ft.title_scope = 'RECEBER' AND ft.due_date IS NOT NULL
GROUP BY TO_CHAR(ft.due_date, 'YYYY-MM') ORDER BY "Mes"`} />

      <SubTitle>Modelo 7 - Grafico Misto (Barras + Linhas)</SubTitle>
      <Para>Tipo: Misto &gt; Serie 1 como Barra &gt; Serie 2 como Linha com eixo secundario ativado.</Para>
      <CodeBlock code={`SELECT TO_CHAR(ft.due_date, 'YYYY-MM') AS "Periodo",
  SUM(ft.value) AS "Valor Total",
  ROUND(AVG(ft.value), 2) AS "Ticket Medio"
FROM financial_titles ft
WHERE ft.due_date IS NOT NULL GROUP BY TO_CHAR(ft.due_date, 'YYYY-MM')
ORDER BY "Periodo"`} />

      <SubTitle>Modelo 13 - CTE (WITH)</SubTitle>
      <Para>Use WITH para dividir consultas complexas em etapas legiveis. Disponivel apenas no Modo SQL.</Para>
      <CodeBlock code={`WITH clientes_ativos AS (
  SELECT c.id, c.name FROM clients c
  WHERE EXISTS (SELECT 1 FROM admissions a WHERE a.client_id = c.id)
)
SELECT ca.name AS "Cliente",
  COALESCE(SUM(ft.value), 0) AS "Valor Total"
FROM clientes_ativos ca
LEFT JOIN financial_titles ft ON ft.client_id = ca.id
GROUP BY ca.id, ca.name ORDER BY ca.name`} />

      <SubTitle>Modelo 15 - Ranking (TOP N)</SubTitle>
      <CodeBlock code={`SELECT ROW_NUMBER() OVER (ORDER BY SUM(ft.value) DESC) AS "Ranking",
  c.name AS "Cliente", COALESCE(SUM(ft.value), 0) AS "Valor Total"
FROM clients c
LEFT JOIN financial_titles ft ON ft.client_id = c.id AND ft.title_scope = 'RECEBER'
GROUP BY c.id, c.name ORDER BY "Valor Total" DESC LIMIT 20`} />

      <SubTitle>Modelo - Admissoes com Responsavel e Titular</SubTitle>
      <Para>JOIN duplo na tabela clients usando aliases: resp (Responsavel) e tit (Titular). Use LEFT JOIN para incluir admissoes mesmo quando o titular nao esta preenchido.</Para>
      <CodeBlock code={`SELECT
  a.contract_number AS "Contrato",
  TO_CHAR(a.date, 'DD/MM/YYYY') AS "Data",
  a.status AS "Status",
  resp.name AS "Responsavel",
  resp.document AS "CPF/CNPJ Resp.",
  resp.phone AS "Tel. Resp.",
  tit.name AS "Titular",
  tit.document AS "CPF/CNPJ Titular",
  tit.phone AS "Tel. Titular"
FROM admissions a
LEFT JOIN clients resp ON resp.id = a.client_id
LEFT JOIN clients tit ON tit.id = a.titular_client_id
ORDER BY a.date DESC`} />

      <SubTitle>Modelo 16 - Aging (Vencimentos por Faixa)</SubTitle>
      <CodeBlock code={`SELECT c.name AS "Cliente",
  COUNT(CASE WHEN ft.due_date >= CURRENT_DATE THEN 1 END) AS "A Vencer",
  COUNT(CASE WHEN ft.due_date < CURRENT_DATE
    AND ft.due_date >= CURRENT_DATE - 30 THEN 1 END) AS "1-30 dias",
  COUNT(CASE WHEN ft.due_date < CURRENT_DATE - 60 THEN 1 END) AS "60+ dias",
  SUM(ft.value) AS "Total em Aberto"
FROM clients c INNER JOIN financial_titles ft ON ft.client_id = c.id
WHERE ft.title_scope = 'RECEBER' AND ft.status = 'ABERTO'
GROUP BY c.id, c.name ORDER BY "Total em Aberto" DESC`} />
    </div>
  );
}

function TabelasSection() {
  return (
    <div>
      <SectionTitle>Tabelas do Banco de Dados</SectionTitle>
      <Para>Referencia completa das tabelas disponiveis para consultas no Report Builder.</Para>

      <SubTitle>clients (Clientes)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador unico'],
          ['name', 'VARCHAR(255)', 'Nome completo'],
          ['type', 'VARCHAR(10)', 'FISICA ou JURIDICA'],
          ['document', 'VARCHAR(20)', 'CPF ou CNPJ'],
          ['phone / phone2', 'VARCHAR(30)', 'Telefones'],
          ['email', 'VARCHAR(255)', 'E-mail'],
          ['profession', 'VARCHAR(100)', 'Profissao'],
          ['city / state', 'VARCHAR', 'Cidade / UF'],
          ['created_at', 'TIMESTAMPTZ', 'Data de criacao'],
        ]}
      />

      <SubTitle>collaborators (Colaboradores)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador unico'],
          ['name', 'VARCHAR(200)', 'Nome completo'],
          ['job_title', 'VARCHAR(100)', 'Cargo'],
          ['phone', 'VARCHAR(30)', 'Telefone'],
          ['email', 'VARCHAR(255)', 'E-mail'],
          ['city / state', 'VARCHAR', 'Cidade / UF'],
          ['birth_date', 'DATE', 'Data de nascimento'],
          ['created_at', 'TIMESTAMPTZ', 'Data de criacao'],
        ]}
      />

      <SubTitle>admissions (Admissoes/Comercial)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador unico'],
          ['date', 'TIMESTAMPTZ', 'Data da admissao'],
          ['client_id', 'UUID', 'FK para clients (Responsavel)'],
          ['titular_client_id', 'UUID', 'FK para clients (Titular do contrato)'],
          ['bank_id', 'UUID', 'FK para banks'],
          ['collaborator_id', 'UUID', 'FK para collaborators'],
          ['contract_number', 'VARCHAR(50)', 'Numero do contrato'],
          ['financed_amount', 'VARCHAR(30)', 'Valor financiado'],
          ['status', 'VARCHAR(30)', 'PENDENTE, NEGOCIACAO, APROVADA, etc.'],
        ]}
      />

      <SubTitle>financial_titles (Titulos Financeiros)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador unico'],
          ['title_scope', 'VARCHAR(10)', 'RECEBER ou PAGAR'],
          ['description', 'VARCHAR(255)', 'Descricao do titulo'],
          ['value', 'NUMERIC(18,2)', 'Valor do titulo'],
          ['status', 'VARCHAR(30)', 'ABERTO, PAGO, PARCIAL, CANCELADO, etc.'],
          ['client_id', 'UUID', 'FK para clients'],
          ['seller_id', 'UUID', 'FK para collaborators (vendedor)'],
          ['assigned_collaborator_id', 'UUID', 'FK para collaborators (colaborador atribuido)'],
          ['issue_date', 'DATE', 'Data de emissao'],
          ['due_date', 'DATE', 'Data de vencimento'],
          ['installment_number', 'INTEGER', 'Numero da parcela'],
          ['total_installments', 'INTEGER', 'Total de parcelas'],
        ]}
      />

      <SubTitle>units (Unidades)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador unico'],
          ['razao_social', 'VARCHAR(255)', 'Razao social'],
          ['cnpj', 'VARCHAR(20)', 'CNPJ'],
          ['email', 'VARCHAR(255)', 'E-mail'],
          ['telefone', 'VARCHAR(30)', 'Telefone'],
          ['cep', 'VARCHAR(15)', 'CEP'],
          ['endereco', 'VARCHAR(255)', 'Endereco'],
          ['numero', 'VARCHAR(20)', 'Numero'],
          ['complemento', 'VARCHAR(100)', 'Complemento'],
          ['bairro', 'VARCHAR(100)', 'Bairro'],
          ['cidade', 'VARCHAR(100)', 'Cidade'],
          ['estado', 'VARCHAR(5)', 'UF'],
        ]}
      />

      <SubTitle>banks (Bancos)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador'],
          ['name', 'VARCHAR(200)', 'Nome do banco'],
          ['febraban_code', 'VARCHAR(10)', 'Codigo FEBRABAN'],
          ['status', 'VARCHAR(10)', 'ATIVO ou INATIVO'],
        ]}
      />

      <SubTitle>bank_accounts (Contas Bancarias)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador'],
          ['description', 'VARCHAR(200)', 'Descricao'],
          ['bank_name', 'VARCHAR(200)', 'Nome do banco'],
          ['current_balance', 'NUMERIC(18,2)', 'Saldo atual'],
          ['status', 'VARCHAR(10)', 'ATIVA ou INATIVA'],
        ]}
      />

      <SubTitle>title_settlements (Baixas/Liquidacoes)</SubTitle>
      <Table
        headers={['Campo', 'Tipo', 'Descricao']}
        rows={[
          ['id', 'UUID', 'Identificador'],
          ['title_id', 'UUID', 'FK para financial_titles'],
          ['date', 'DATE', 'Data da baixa'],
          ['amount', 'NUMERIC(18,2)', 'Valor liquidado'],
        ]}
      />

      <SubTitle>Relacionamentos para JOINs</SubTitle>
      <Table
        headers={['Tabela Esquerda', 'Campo', 'Tabela Direita', 'Campo']}
        rows={[
          ['clients', 'id', 'admissions', 'client_id (Responsavel)'],
          ['clients', 'id', 'admissions', 'titular_client_id (Titular)'],
          ['clients', 'id', 'financial_titles', 'client_id'],
          ['admissions', 'bank_id', 'banks', 'id'],
          ['admissions', 'collaborator_id', 'collaborators', 'id'],
          ['admissions', 'modality_id', 'modalities', 'id'],
          ['financial_titles', 'seller_id', 'collaborators', 'id'],
          ['financial_titles', 'assigned_collaborator_id', 'collaborators', 'id'],
          ['financial_titles', 'bearer_id', 'bearers', 'id'],
          ['financial_titles', 'department_id', 'departments', 'id'],
          ['financial_titles', 'bank_account_id', 'bank_accounts', 'id'],
          ['title_settlements', 'title_id', 'financial_titles', 'id'],
          ['bank_accounts', 'bank_id', 'banks', 'id'],
        ]}
      />

      <SubTitle>JOIN Duplo: Responsavel e Titular</SubTitle>
      <Para>A tabela admissions possui dois campos que referenciam clients: client_id (Responsavel) e titular_client_id (Titular do contrato). Para trazer dados de ambos no mesmo relatorio, use aliases com JOIN duplo na tabela clients.</Para>
      <CodeBlock code={`SELECT
  a.contract_number AS "Contrato",
  TO_CHAR(a.date, 'DD/MM/YYYY') AS "Data Admissao",
  a.status AS "Status",
  -- Dados do Responsavel
  resp.name AS "Responsavel - Nome",
  resp.document AS "Responsavel - CPF/CNPJ",
  resp.phone AS "Responsavel - Telefone",
  resp.email AS "Responsavel - Email",
  resp.city AS "Responsavel - Cidade",
  resp.state AS "Responsavel - UF",
  -- Dados do Titular
  tit.name AS "Titular - Nome",
  tit.document AS "Titular - CPF/CNPJ",
  tit.phone AS "Titular - Telefone",
  tit.email AS "Titular - Email",
  tit.city AS "Titular - Cidade",
  tit.state AS "Titular - UF"
FROM admissions a
LEFT JOIN clients resp ON resp.id = a.client_id
LEFT JOIN clients tit ON tit.id = a.titular_client_id
ORDER BY a.date DESC`} />
    </div>
  );
}

function SqlRefSection() {
  return (
    <div>
      <SectionTitle>Referencia SQL</SectionTitle>

      <SubTitle>Funcoes de Agregacao</SubTitle>
      <Table
        headers={['Funcao', 'Descricao', 'Exemplo']}
        rows={[
          ['COUNT(*)', 'Conta registros', 'COUNT(DISTINCT a.id)'],
          ['SUM(campo)', 'Soma valores', 'SUM(ft.value)'],
          ['AVG(campo)', 'Calcula media', 'AVG(ft.value)'],
          ['MIN(campo)', 'Menor valor', 'MIN(ft.due_date)'],
          ['MAX(campo)', 'Maior valor', 'MAX(ft.value)'],
          ['ROUND(valor, casas)', 'Arredonda', 'ROUND(AVG(ft.value), 2)'],
        ]}
      />

      <SubTitle>Funcoes Uteis</SubTitle>
      <Table
        headers={['Funcao', 'Uso', 'Exemplo']}
        rows={[
          ['TO_CHAR(data, fmt)', 'Formata data como texto', "TO_CHAR(created_at, 'DD/MM/YYYY')"],
          ['COALESCE(val, padrao)', 'Substitui NULL por padrao', "COALESCE(email, 'Nao informado')"],
          ['NULLIF(val, comp)', 'Retorna NULL se val = comp', "NULLIF(phone, '')"],
          ['CAST(val AS tipo)', 'Converte tipo', 'CAST(financed_amount AS NUMERIC)'],
          ['CASE WHEN...THEN...END', 'Condicional', "CASE WHEN status = 'PAGO' THEN 'Sim' ELSE 'Nao' END"],
          ['CURRENT_DATE', 'Data atual', 'due_date < CURRENT_DATE'],
          ['NOW()', 'Data e hora atual', "created_at >= NOW() - INTERVAL '30 days'"],
          ['ROW_NUMBER() OVER(...)', 'Numeracao sequencial', 'ROW_NUMBER() OVER (ORDER BY value DESC)'],
          ['EXTRACT(parte FROM data)', 'Extrai parte da data', 'EXTRACT(MONTH FROM due_date)'],
        ]}
      />

      <SubTitle>Formatos de TO_CHAR para Datas</SubTitle>
      <Table
        headers={['Formato', 'Exemplo de Saida']}
        rows={[
          ["'DD/MM/YYYY'", '07/03/2026'],
          ["'DD/MM/YYYY HH24:MI'", '07/03/2026 14:30'],
          ["'YYYY-MM'", '2026-03'],
          ["'YYYY'", '2026'],
          ["'Month'", 'March'],
          ["'Day'", 'Saturday'],
        ]}
      />
    </div>
  );
}

function DicasSection() {
  return (
    <div>
      <SectionTitle>Dicas e Solucao de Problemas</SectionTitle>

      <SubTitle>Boas Praticas</SubTitle>
      <Table
        headers={['#', 'Dica']}
        rows={[
          ['1', 'Use aliases descritivos: AS "Nome Legivel" com aspas duplas para acentos/espacos'],
          ['2', 'Teste antes de salvar: use Preview para verificar os dados'],
          ['3', 'Evite SELECT *: selecione apenas colunas necessarias'],
          ['4', 'Use COALESCE para NULLs: COALESCE(campo, 0) evita espacos em branco'],
          ['5', 'Paisagem para muitas colunas: relatorios com 6+ colunas ficam melhor em paisagem'],
          ['6', 'Fonte menor para mais dados: fonte 9 ou 10 para relatorios extensos'],
          ['7', 'Combine graficos com tabelas: use conteudo "Ambos" para contexto visual'],
          ['8', 'Limite sub-relatorios: use LIMIT para evitar consultas pesadas'],
          ['9', 'Use filtros para relatorios grandes: filtros por periodo reduzem resultados'],
          ['10', 'Agrupe quando possivel: agrupamento organiza e facilita a leitura'],
        ]}
      />

      <SubTitle>Solucao de Problemas Comuns</SubTitle>
      <Table
        headers={['Problema', 'Causa', 'Solucao']}
        rows={[
          ['Apenas consultas SELECT permitidas', 'SQL contem comando de escrita', 'Use apenas SELECT ou WITH'],
          ['Valores NULL na tabela', 'Campo sem dados', "Use COALESCE: COALESCE(campo, 0) ou COALESCE(campo, '-')"],
          ['Dados duplicados no JOIN', 'JOIN multiplica registros', 'Use COUNT(DISTINCT) ou revise condicoes do JOIN'],
          ['Grafico nao renderiza', 'Campos X ou Y nao configurados', 'Verifique se selecionou campos para eixo X e adicionou serie Y'],
          ['Preview mostra 0 registros', 'Filtro restritivo ou dados inexistentes', 'Remova ou ajuste condicoes WHERE'],
          ['Coluna nao aparece', 'Visibilidade desligada', 'Na aba Layout, marque a coluna como visivel'],
          ['Formato nao aplicado', 'Formato errado selecionado', 'Verifique se o tipo de dado corresponde ao formato'],
          ['Erro de tipo no CAST', 'Texto nao-numerico', "Use NULLIF antes: CAST(NULLIF(campo, '') AS NUMERIC)"],
          ['Sub-relatorio vazio', 'Query retorna 0 registros', 'Teste a query isoladamente'],
          ['PDF com colunas cortadas', 'Muitas colunas para o papel', 'Use paisagem ou reduza colunas visiveis'],
        ]}
      />

      <SubTitle>Seguranca</SubTitle>
      <Table
        headers={['Aspecto', 'Descricao']}
        rows={[
          ['Bloqueio de escrita', 'INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE sao bloqueados'],
          ['Parametrizacao', 'Filtros sao enviados como parametros posicionais ($1, $2), prevenindo SQL injection'],
          ['Controle de acesso', 'Relatorios podem ser restritos por usuario/grupo'],
          ['Administradores', 'Perfil ADMIN sempre ve todos os relatorios'],
        ]}
      />
    </div>
  );
}

export default function GuideTab() {
  const [activeSection, setActiveSection] = useState<Section>('visao_geral');

  const renderSection = () => {
    switch (activeSection) {
      case 'visao_geral': return <VisaoGeral />;
      case 'fonte_dados': return <FonteDados />;
      case 'layout': return <LayoutSection />;
      case 'graficos': return <GraficosSection />;
      case 'subreports': return <SubreportsSection />;
      case 'preview': return <PreviewSection />;
      case 'modelos': return <ModelosSection />;
      case 'tabelas': return <TabelasSection />;
      case 'sql_ref': return <SqlRefSection />;
      case 'dicas': return <DicasSection />;
      default: return null;
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-48 border-r border-gray-200 bg-gray-50 flex-shrink-0 overflow-y-auto">
        <div className="p-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1.5">Manual</div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-2.5 py-1.5 text-[11px] rounded-md mb-0.5 transition-colors ${
                activeSection === s.id
                  ? 'bg-moss-100 text-moss-800 font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {renderSection()}
      </div>
    </div>
  );
}
