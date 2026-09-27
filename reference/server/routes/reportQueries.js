import { Router } from 'express';

const MAX_ROWS = 100;
const CONSULTATION_TYPES = {
  clients: {
    permissions: ['cad_clientes:VISUALIZAR'],
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'type', label: 'Tipo' },
      { key: 'document', label: 'Documento' },
      { key: 'phone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'UF' },
      { key: 'created_at', label: 'Cadastro' },
    ],
    sortFields: ['name', 'type', 'document', 'city', 'state', 'created_at'],
  },
  titles: {
    permissions: ['fin_receber:VISUALIZAR', 'fin_pagar:VISUALIZAR'],
    columns: [
      { key: 'title_scope', label: 'Tipo' },
      { key: 'description', label: 'Descrição' },
      { key: 'client_name', label: 'Cliente' },
      { key: 'document_number', label: 'Documento' },
      { key: 'value', label: 'Valor' },
      { key: 'current_balance', label: 'Saldo' },
      { key: 'status', label: 'Situação' },
      { key: 'due_date', label: 'Vencimento' },
      { key: 'unit_id', label: 'Unidade' },
    ],
    sortFields: ['title_scope', 'description', 'client_name', 'value', 'current_balance', 'status', 'due_date'],
  },
  admissions: {
    permissions: ['com_admissao:VISUALIZAR'],
    columns: [
      { key: 'contract_number', label: 'Contrato' },
      { key: 'client_name', label: 'Cliente' },
      { key: 'status', label: 'Situação' },
      { key: 'date', label: 'Data' },
      { key: 'bank_name', label: 'Banco' },
      { key: 'collaborator_name', label: 'Colaborador' },
      { key: 'financed_amount', label: 'Valor financiado' },
      { key: 'unit_id', label: 'Unidade' },
    ],
    sortFields: ['contract_number', 'client_name', 'status', 'date', 'bank_name', 'collaborator_name', 'financed_amount'],
  },
  bankMovements: {
    permissions: ['fin_cc_movimento:VISUALIZAR'],
    columns: [
      { key: 'date', label: 'Data' },
      { key: 'description', label: 'Descrição' },
      { key: 'document_number', label: 'Documento' },
      { key: 'type', label: 'Tipo' },
      { key: 'value', label: 'Valor' },
      { key: 'status', label: 'Situação' },
      { key: 'origin', label: 'Origem' },
      { key: 'unit_id', label: 'Unidade' },
    ],
    sortFields: ['date', 'description', 'document_number', 'type', 'value', 'status', 'origin'],
  },
  collaborators: {
    permissions: ['cad_colaboradores:VISUALIZAR'],
    columns: [
      { key: 'name', label: 'Nome' },
      { key: 'job_title', label: 'Cargo' },
      { key: 'phone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
      { key: 'city', label: 'Cidade' },
      { key: 'state', label: 'UF' },
      { key: 'active', label: 'Ativo' },
      { key: 'unit_id', label: 'Unidade' },
    ],
    sortFields: ['name', 'job_title', 'city', 'state', 'active'],
  },
};

async function getGrantedPermissions(pool, user) {
  if (user.isAdmin) return new Set(Object.values(CONSULTATION_TYPES).flatMap(source => source.permissions));
  if (!user.groupIds?.length) return new Set();
  const result = await pool.query(
    'SELECT permission FROM user_group_permissions WHERE group_id = ANY($1::uuid[]) AND permission = ANY($2::text[])',
    [user.groupIds, [...new Set(Object.values(CONSULTATION_TYPES).flatMap(source => source.permissions))]]
  );
  return new Set(result.rows.map(row => row.permission));
}

function getSourceQuery(type, { params, conditions, isAdmin, unitId, grantedPermissions, query }) {
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  const unitCondition = (column) => {
    if (!isAdmin) conditions.push(`${column}::text = ${add(unitId)}`);
  };
  const search = typeof query.search === 'string' ? query.search.trim().slice(0, 100) : '';
  const dateFrom = typeof query.dateFrom === 'string' ? query.dateFrom : '';
  const dateTo = typeof query.dateTo === 'string' ? query.dateTo : '';
  const status = typeof query.status === 'string' ? query.status.trim().slice(0, 50) : '';
  let sql;
  let searchable = [];
  let dateColumn = null;
  let statusColumn = null;
  for (const [label, value] of [['inicial', dateFrom], ['final', dateTo]]) {
    const parsedDate = value ? new Date(`${value}T00:00:00Z`) : null;
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value)) {
      const error = new Error(`A data ${label} é inválida.`);
      error.status = 400;
      throw error;
    }
  }

  switch (type) {
    case 'clients':
      sql = `SELECT name, type, document, phone, email, city, state, created_at::date AS created_at FROM clients`;
      searchable = ['name', 'document', 'email', 'phone'];
      dateColumn = 'created_at::date';
      break;
    case 'titles': {
      const canReceivable = grantedPermissions.has('fin_receber:VISUALIZAR');
      const canPayable = grantedPermissions.has('fin_pagar:VISUALIZAR');
      const scopes = [
        ...(canReceivable ? ['RECEBER'] : []),
        ...(canPayable ? ['PAGAR'] : []),
      ];
      if (query.scope === 'RECEBER' || query.scope === 'PAGAR') {
        const requestedAllowed = query.scope === 'RECEBER' ? canReceivable : canPayable;
        if (!requestedAllowed) {
          const error = new Error('Você não tem permissão para consultar esse tipo de título.');
          error.status = 403;
          throw error;
        }
        conditions.push(`t.title_scope = ${add(query.scope)}`);
      } else {
        conditions.push(`t.title_scope = ANY(${add(scopes)}::text[])`);
      }
      sql = `SELECT t.title_scope, t.description, COALESCE(t.client_name, c.name) AS client_name,
                    t.document_number, t.value, t.current_balance, t.status, t.due_date::date AS due_date,
                    t.unit_id
             FROM financial_titles t LEFT JOIN clients c ON c.id = t.client_id`;
      searchable = ['t.description', 't.client_name', 't.document_number'];
      dateColumn = 't.due_date::date';
      statusColumn = 't.status';
      if (!isAdmin) conditions.push(`t.unit_id::text = ${add(unitId)}`);
      break;
    }
    case 'admissions':
      sql = `SELECT a.contract_number, a.client_name, a.status, a.date::date AS date,
                    b.name AS bank_name, co.name AS collaborator_name, a.financed_amount, a.unit_id
             FROM admissions a
             LEFT JOIN banks b ON b.id = a.bank_id
             LEFT JOIN collaborators co ON co.id = a.collaborator_id`;
      searchable = ['a.contract_number', 'a.client_name', 'b.name', 'co.name'];
      dateColumn = 'a.date::date';
      statusColumn = 'a.status';
      unitCondition('a.unit_id');
      break;
    case 'bankMovements':
      sql = `SELECT date, description, document_number, type, value, status, source AS origin, unit_id
             FROM bank_movements`;
      searchable = ['description', 'document_number'];
      dateColumn = 'date';
      statusColumn = 'status';
      unitCondition('unit_id');
      break;
    case 'collaborators':
      sql = `SELECT name, job_title, phone, email, city, state, active, unit_id FROM collaborators`;
      searchable = ['name', 'job_title', 'email', 'phone'];
      statusColumn = 'active::text';
      unitCondition('unit_id');
      break;
    default: {
      const error = new Error('Tipo de consulta inválido.');
      error.status = 400;
      throw error;
    }
  }

  if (search) {
    const placeholder = add(`%${search}%`);
    conditions.push(`(${searchable.map(column => `${column}::text ILIKE ${placeholder}`).join(' OR ')})`);
  }
  if (dateFrom && dateColumn) {
    conditions.push(`${dateColumn} >= ${add(dateFrom)}::date`);
  }
  if (dateTo && dateColumn) {
    conditions.push(`${dateColumn} <= ${add(dateTo)}::date`);
  }
  if (status && statusColumn) {
    if (type === 'collaborators') {
      if (status === 'true' || status === 'false') conditions.push(`${statusColumn} = ${add(status)}`);
    } else {
      conditions.push(`${statusColumn} = ${add(status)}`);
    }
  }

  return sql;
}

export function createReportQueriesRoutes(pool) {
  const router = Router();

  router.get('/', async (req, res) => {
    const user = req.currentUser;
    const type = String(req.query.type || '');
    const source = CONSULTATION_TYPES[type];
    if (!source) return res.status(400).json({ error: 'Tipo de consulta inválido.' });

    if (!user.isAdmin && !user.currentUnitId) {
      return res.status(403).json({ error: 'Nenhuma unidade ativa foi autorizada para esta sessão.' });
    }

    try {
      const grantedPermissions = await getGrantedPermissions(pool, user);
      if (!source.permissions.some(permission => grantedPermissions.has(permission))) {
        return res.status(403).json({ error: 'Você não tem permissão para consultar esses dados.' });
      }

      const params = [];
      const conditions = [];
      let sql = getSourceQuery(type, {
        params,
        conditions,
        isAdmin: user.isAdmin,
        unitId: user.currentUnitId,
        grantedPermissions,
        query: req.query,
      });

      const sortBy = source.sortFields.includes(String(req.query.sortBy || ''))
        ? String(req.query.sortBy)
        : source.sortFields[0];
      const order = String(req.query.order || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const limit = Math.max(1, Math.min(parseInt(String(req.query.limit || MAX_ROWS), 10) || MAX_ROWS, MAX_ROWS));
      const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
      // Sort keys and table/column identifiers are static allowlists above.
      const qualifiedSort = type === 'titles'
        ? (sortBy === 'client_name' ? 'COALESCE(t.client_name, c.name)' : `t."${sortBy}"`)
        : type === 'admissions'
          ? (sortBy === 'bank_name' ? 'b.name' : sortBy === 'collaborator_name' ? 'co.name' : `a."${sortBy}"`)
        : type === 'bankMovements' ? `"${sortBy}"` :
        type === 'collaborators' ? `"${sortBy}"` : `"${sortBy}"`;
      sql += `${where} ORDER BY ${qualifiedSort} ${order} NULLS LAST LIMIT ${limit + 1}`;

      const result = await pool.query(sql, params);
      const truncated = result.rows.length > limit;
      const rows = result.rows.slice(0, limit);
      res.json({
        columns: source.columns,
        rows,
        rowCount: rows.length,
        limit,
        truncated,
      });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      console.error('[reports/queries] erro:', error.message);
      res.status(500).json({ error: 'Erro ao carregar a consulta. Tente novamente.' });
    }
  });

  return router;
}