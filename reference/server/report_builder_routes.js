function buildParameterizedQueryServer(sql, filters, filterValues) {
  const params = [];
  let paramIndex = 1;
  let processedSql = sql;
  const vals = (filterValues && typeof filterValues === 'object') ? filterValues : {};
  for (const f of (Array.isArray(filters) ? filters : [])) {
    if (!f || typeof f.placeholder !== 'string') continue;
    const val = vals[f.id] !== undefined ? vals[f.id] : (f.defaultValue || '');
    const escapedName = f.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doubleBrace = new RegExp('\\{\\{' + escapedName + '\\}\\}', 'g');
    const colonStyle = new RegExp(':' + escapedName + '\\b', 'g');
    const matchesBrace = doubleBrace.test(processedSql);
    doubleBrace.lastIndex = 0;
    const matchesColon = !matchesBrace && colonStyle.test(processedSql);
    colonStyle.lastIndex = 0;
    if (matchesBrace) {
      const token = `$${paramIndex}`;
      processedSql = processedSql.replace(doubleBrace, () => token);
      params.push(val);
      paramIndex++;
    } else if (matchesColon) {
      const token = `$${paramIndex}`;
      processedSql = processedSql.replace(colonStyle, () => token);
      params.push(val);
      paramIndex++;
    }
  }
  return { sql: processedSql, params };
}

app.get('/api/reports/schema/tables', extractUser, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({ tables: result.rows.map(r => r.table_name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/schema/columns', extractUser, requireAdmin, async (req, res) => {
  const { table } = req.query;
  if (!table) return res.status(400).json({ error: 'table parameter required' });
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default, ordinal_position,
             character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    res.json({ columns: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/schema/foreign-keys', extractUser, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tc.table_name AS source_table,
        kcu.column_name AS source_column,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);
    res.json({ foreignKeys: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports/preview-query', extractUser, requireAdmin, async (req, res) => {
  const { sql, params, limit } = req.body;
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'SQL query required' });
  if (!isReadOnlyQuery(sql)) return res.status(403).json({ error: 'Apenas consultas SELECT são permitidas.' });
  const requestedLimit = Number.parseInt(limit, 10);
  const maxLimit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 500)) : 50;
  const wrappedSql = wrapReadOnlyQueryWithLimit(sql, maxLimit + 1);
  const start = Date.now();
  try {
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '15s'");
      result = await client.query(wrappedSql, Array.isArray(params) ? params : []);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    const duration = Date.now() - start;
    const fields = (result.fields || []).map(f => ({ name: f.name, dataTypeID: f.dataTypeID }));
    const rows = result.rows.slice(0, maxLimit);
    res.json({ rows, fields, rowCount: rows.length, limit: maxLimit, truncated: result.rows.length > maxLimit, duration });
  } catch (err) {
    const duration = Date.now() - start;
    res.status(400).json({ error: err.message, duration });
  }
});

app.post('/api/reports/execute-query', extractUser, requireAuth, async (req, res) => {
  const { sql, params, templateId, subreportId, filterValues } = req.body;
  const { id: userId, isAdmin, groupIds } = req.currentUser;

  // 🔒 SEGURANÇA [VULN-2]: o SQL a executar é decidido pelo servidor, nunca pelo cliente.
  //  - Não-admin: SEMPRE executa o sql_query ARMAZENADO no template (ou subrelatório),
  //    reconstruindo os placeholders → $N no servidor. O cliente envia apenas filterValues.
  //  - Admin: pode executar SQL read-only arbitrário (necessário para o builder/preview).
  let sqlToRun;
  let paramsToRun;

  if (!isAdmin) {
    if (!templateId || typeof templateId !== 'string') {
      return res.status(403).json({ error: 'Apenas administradores podem executar consultas SQL arbitrárias. Informe o templateId do relatório.' });
    }
    let tplResult;
    try {
      const template = await getVisibleReportTemplate(pool, req.currentUser, templateId);
      tplResult = { rows: template ? [template] : [] };
    } catch (err) {
      logger.error('[execute-query] verificação de acesso:', err.message);
      return res.status(500).json({ error: 'Erro ao verificar acesso ao relatório.' });
    }
    if (tplResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso não autorizado a este relatório.' });
    }
    const template = tplResult.rows[0];
    const templateFilters = Array.isArray(template.filters) ? template.filters : [];

    // Resolve o SQL armazenado: principal ou de um subrelatório específico do template.
    let storedSql = template.sql_query;
    if (subreportId) {
      const subreports = Array.isArray(template.subreports) ? template.subreports : [];
      const sr = subreports.find(s => s.id === subreportId);
      if (!sr || sr.type !== 'query' || typeof sr.sql_query !== 'string') {
        return res.status(403).json({ error: 'Subrelatório não pertence ao template informado.' });
      }
      storedSql = sr.sql_query;
    }

    if (!storedSql || typeof storedSql !== 'string' || !isReadOnlyQuery(storedSql)) {
      return res.status(403).json({ error: 'SQL do template inválido.' });
    }

    // Reconstrói a query parametrizada a partir do SQL ARMAZENADO + filterValues do cliente.
    const built = buildParameterizedQueryServer(storedSql, templateFilters, filterValues);
    sqlToRun = built.sql;
    paramsToRun = built.params;
  } else {
    // Admin: SQL read-only arbitrário enviado pelo cliente (builder/preview).
    if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'SQL query required' });
    if (!isReadOnlyQuery(sql)) return res.status(403).json({ error: 'Apenas consultas SELECT são permitidas.' });
    sqlToRun = sql;
    paramsToRun = params || [];
  }

  const requestedLimit = Number.parseInt(req.body.limit, 10);
  const maxLimit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 500)) : 500;
  const wrappedSql = wrapReadOnlyQueryWithLimit(sqlToRun, maxLimit + 1);
  const start = Date.now();
  try {
    const client = await pool.connect();
    let result;
    try {
      await client.query('BEGIN READ ONLY');
      await client.query("SET LOCAL statement_timeout = '15s'");
      result = await client.query(wrappedSql, paramsToRun);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    const duration = Date.now() - start;
    const truncated = result.rows.length > maxLimit;
    const rows = result.rows.slice(0, maxLimit);
    const fields = (result.fields || []).map(f => ({ name: f.name, dataTypeID: f.dataTypeID }));
    res.json({ rows, fields, rowCount: rows.length, limit: maxLimit, truncated, duration });
  } catch (err) {
    const duration = Date.now() - start;
    // 🔒 SEGURANÇA [VULN-8]: logar internamente; mensagem genérica ao cliente.
    logger.error('[execute-query] erro:', err.message);
    res.status(400).json({ error: 'Erro ao executar consulta. Verifique os parâmetros.', duration });
  }
});

app.get('/api/reports/templates', extractUser, requireAuth, async (req, res) => {
  // isAdmin, userId, groupIds MUST come from the verified JWT — never from req.query.
  // Reading these from query params allows any unauthenticated client to pass
  // ?isAdmin=true and bypass all per-user/per-group visibility controls.
  const { id: userId, isAdmin, groupIds } = req.currentUser;
  try {
    let query;
    let params;
    if (isAdmin) {
      query = `SELECT * FROM report_templates WHERE is_active = true ORDER BY category, name`;
      params = [];
    } else {
      query = `
        SELECT * FROM report_templates
        WHERE is_active = true
          AND (
            allowed_users IS NULL AND allowed_groups IS NULL
            OR allowed_users @> ARRAY[$1]::uuid[]
            OR allowed_groups && $2::uuid[]
          )
        ORDER BY category, name
      `;
      const groupIdArray = Array.isArray(groupIds) ? groupIds : [];
      params = [userId, groupIdArray];
    }
    const result = await pool.query(query, params);
    res.json({ templates: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/templates/:id', extractUser, requireAuth, async (req, res) => {
  try {
    let result;
    if (req.currentUser.isAdmin) {
      result = await pool.query('SELECT * FROM report_templates WHERE id = $1 AND is_active = true', [req.params.id]);
    } else {
      const groupIds = Array.isArray(req.currentUser.groupIds) ? req.currentUser.groupIds : [];
      result = await pool.query(`
        SELECT * FROM report_templates
        WHERE id = $1 AND is_active = true
          AND (
            allowed_users IS NULL AND allowed_groups IS NULL
            OR allowed_users @> ARRAY[$2]::uuid[]
            OR allowed_groups && $3::uuid[]
          )
      `, [req.params.id, req.currentUser.id, groupIds]);
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json({ template: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware: require ADMIN role for report template write operations
function requireAdminRole(req, res, next) {
  const role = req.jwtPayload?.userRole;
  if (!role || role !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem criar ou editar templates de relatório.' });
  }
  next();
}

app.post('/api/reports/templates', requireAdminRole, async (req, res) => {
  const { name, description, category, target_layout, content_mode, sql_query, layout, filters, subreports, charts, allowed_users, allowed_groups } = req.body;
  // 🔒 SEGURANÇA [VULN-7]: created_by derivado do JWT verificado, NUNCA de req.body —
  // previne falsificação de autoria no audit trail (mass assignment, CWE-915).
  const created_by = req.jwtPayload?.userId || null;
  if (!name || !sql_query) return res.status(400).json({ error: 'name and sql_query are required' });
  const sqlError = validateReportSql(sql_query);
  if (sqlError) return res.status(400).json({ error: sqlError });
  const definitionError = validateReportDefinition(req.body);
  if (definitionError) return res.status(400).json({ error: definitionError });
  try {
    const result = await pool.query(`
      INSERT INTO report_templates (name, description, category, target_layout, content_mode, sql_query, layout, filters, subreports, charts, allowed_users, allowed_groups, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      name, description || null, category || 'Outros', target_layout || 'responsive', content_mode || 'both',
      sql_query, JSON.stringify(layout || {}), JSON.stringify(filters || []), JSON.stringify(subreports || []),
      JSON.stringify(charts || []), allowed_users || null, allowed_groups || null, created_by
    ]);
    res.json({ template: result.rows[0] });
  } catch (err) {
    // 🔒 SEGURANÇA [VULN-8]: logar internamente; retornar mensagem genérica.
    logger.error('[reports/templates POST] erro:', err.message);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.put('/api/reports/templates/:id', requireAdminRole, async (req, res) => {
  const { name, description, category, target_layout, content_mode, sql_query, layout, filters, subreports, charts, allowed_users, allowed_groups } = req.body;
  if (sql_query !== undefined) {
    const sqlError = validateReportSql(sql_query);
    if (sqlError) return res.status(400).json({ error: sqlError });
  }
  const definitionError = validateReportDefinition(req.body);
  if (definitionError) return res.status(400).json({ error: definitionError });
  try {
    const result = await pool.query(`
      UPDATE report_templates
      SET name = COALESCE($1, name), description = $2, category = COALESCE($3, category),
          target_layout = COALESCE($4, target_layout), content_mode = COALESCE($5, content_mode),
          sql_query = COALESCE($6, sql_query), layout = COALESCE($7, layout),
          filters = COALESCE($8, filters), subreports = COALESCE($9, subreports),
          charts = COALESCE($10, charts), allowed_users = $11, allowed_groups = $12,
          updated_at = NOW()
      WHERE id = $13 AND is_active = true
      RETURNING *
    `, [
      name, description, category, target_layout, content_mode, sql_query,
      layout ? JSON.stringify(layout) : null, filters ? JSON.stringify(filters) : null,
      subreports ? JSON.stringify(subreports) : null, charts ? JSON.stringify(charts) : null,
      allowed_users || null, allowed_groups || null, req.params.id
    ]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json({ template: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/templates/:id', requireAdminRole, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE report_templates SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- END REPORT BUILDER API ---