export function isReadOnlyQuery(sql) {
  if (typeof sql !== 'string' || sql.length > 100_000) return false;
  const withoutComments = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const normalized = withoutComments.replace(/;\s*$/, '').trim().toUpperCase();
  if (!normalized || normalized.includes(';')) return false;
  const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'COPY'];
  for (const keyword of forbidden) {
    if (new RegExp(`\\b${keyword}\\b`).test(normalized)) return false;
  }
  if (/\bSELECT\b[\s\S]*?\bINTO\b|\bFOR\s+(UPDATE|SHARE|NO\s+KEY\s+UPDATE|KEY\s+SHARE)\b/.test(normalized)) return false;
  if (/\b(NEXTVAL|SETVAL|PG_ADVISORY_[A-Z_]+|PG_SLEEP|PG_READ_FILE|PG_WRITE_FILE|DBLINK)\s*\(/.test(normalized)) return false;
  return normalized.startsWith('SELECT') || normalized.startsWith('WITH');
}

export function wrapReadOnlyQueryWithLimit(sql, limit) {
  return `SELECT * FROM (${sql.trim().replace(/;\s*$/, '')}) AS _report_result LIMIT ${limit}`;
}

export async function getVisibleReportTemplate(pool, user, templateId) {
  const groupIds = Array.isArray(user.groupIds) ? user.groupIds : [];
  const result = await pool.query(`
    SELECT id, sql_query, filters, subreports FROM report_templates
    WHERE id = $1 AND is_active = true
      AND (
        allowed_users IS NULL AND allowed_groups IS NULL
        OR allowed_users @> ARRAY[$2]::uuid[]
        OR allowed_groups && $3::uuid[]
      )
  `, [templateId, user.id, groupIds]);
  return result.rows[0] || null;
}

export function validateReportSql(sqlQuery) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    return 'sql_query é obrigatório e deve ser uma string.';
  }
  if (!isReadOnlyQuery(sqlQuery)) {
    return 'A query contém comandos não permitidos. Apenas consultas SELECT (ou WITH ... SELECT) são aceitas. ' +
      'Comandos como INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, REVOKE e COPY são proibidos.';
  }
  return null;
}

export function validateReportDefinition(body = {}) {
  const filters = body.filters === undefined ? [] : body.filters;
  const subreports = body.subreports === undefined ? [] : body.subreports;
  if (!Array.isArray(filters) || filters.length > 50) return 'A lista de filtros é inválida.';
  if (!Array.isArray(subreports) || subreports.length > 25) return 'A lista de subrelatórios é inválida.';
  const filterIds = new Set();
  for (const filter of filters) {
    if (!filter || typeof filter.id !== 'string' || !filter.id || typeof filter.placeholder !== 'string' ||
        !filter.placeholder.split('.').every(part => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) ||
        !['text', 'date', 'number', 'select'].includes(filter.type) ||
        filterIds.has(filter.id)) {
      return 'Um ou mais filtros são inválidos.';
    }
    filterIds.add(filter.id);
  }
  for (const subreport of subreports) {
    if (!subreport || typeof subreport.id !== 'string' || !subreport.id ||
        !['query', 'summary'].includes(subreport.type)) {
      return 'Um ou mais subrelatórios são inválidos.';
    }
    if (subreport.type === 'query') {
      const sqlError = validateReportSql(subreport.sql_query);
      if (sqlError) return `Subrelatório "${subreport.title || ''}": ${sqlError}`;
    }
    if (subreport.type === 'summary' && !subreport.summary_config) {
      return `Subrelatório "${subreport.title || ''}": configuração de resumo inválida.`;
    }
  }
  if (body.target_layout !== undefined && !['responsive', 'web', 'mobile'].includes(body.target_layout)) {
    return 'Layout de destino inválido.';
  }
  if (body.content_mode !== undefined && !['data', 'charts', 'both'].includes(body.content_mode)) {
    return 'Modo de conteúdo inválido.';
  }
  return null;
}