import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createReportQueriesRoutes } from '../server/routes/reportQueries.js';

async function requestQuery(t, { type, search = '', params = {}, user, permissions = [], resultRows = [], failDataQuery = false }) {
  const statements = [];
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('FROM user_group_permissions')) {
        return { rows: permissions.map(permission => ({ permission })) };
      }
      statements.push({ sql, values });
      if (failDataQuery) throw new Error('database offline');
      return { rows: resultRows };
    },
  };

  const app = express();
  app.use((req, _res, next) => {
    req.currentUser = user;
    next();
  });
  app.use('/queries', createReportQueriesRoutes(pool));
  const server = app.listen(0);
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  const address = server.address();
  const query = new URLSearchParams({ type, ...params });
  if (search) query.set('search', search);
  const response = await fetch(`http://127.0.0.1:${address.port}/queries?${query}`);
  return { response, body: await response.json(), statements };
}

const regularUser = {
  id: '11111111-1111-4111-8111-111111111111',
  isAdmin: false,
  groupIds: ['22222222-2222-4222-8222-222222222222'],
  currentUnitId: 'unit-4',
};

test('consulta de clientes valida permissão e mantém a query somente leitura', async t => {
  const { response, body, statements } = await requestQuery(t, {
    type: 'clients',
    search: 'Ana',
    params: { dateFrom: '2025-01-01', dateTo: '2025-12-31', sortBy: 'name', order: 'ASC', limit: '20' },
    user: regularUser,
    permissions: ['cad_clientes:VISUALIZAR'],
    resultRows: [{ name: 'Ana' }],
  });

  assert.equal(response.status, 200);
  assert.equal(body.rows[0].name, 'Ana');
  assert.match(statements[0].sql, /^SELECT name, type, document/);
  assert.match(statements[0].sql, /ILIKE/);
  assert.match(statements[0].sql, /created_at::date >=/);
  assert.match(statements[0].sql, /ORDER BY "name" ASC NULLS LAST LIMIT 21$/);
  assert.ok(!/\b(INSERT|UPDATE|DELETE|DROP)\b/i.test(statements[0].sql));
  assert.ok(statements[0].values.includes('%Ana%'));
});

test('consulta de movimentações restringe unidade e allowlist de ordenação', async t => {
  const { response, body, statements } = await requestQuery(t, {
    type: 'bankMovements',
    params: { sortBy: 'date; DROP TABLE users', order: 'ASC', limit: '9999' },
    user: regularUser,
    permissions: ['fin_cc_movimento:VISUALIZAR'],
    resultRows: Array.from({ length: 101 }, (_, index) => ({ date: index })),
  });

  assert.equal(response.status, 200);
  assert.equal(body.rows.length, 100);
  assert.equal(body.truncated, true);
  assert.match(statements[0].sql, /unit_id::text =/);
  assert.match(statements[0].sql, /source AS origin/);
  assert.match(statements[0].sql, /ORDER BY "date" ASC NULLS LAST LIMIT 101$/);
  assert.ok(statements[0].values.includes('unit-4'));
});

test('consulta de títulos impede escopo financeiro sem permissão própria', async t => {
  const { response, body, statements } = await requestQuery(t, {
    type: 'titles',
    params: { scope: 'PAGAR' },
    user: regularUser,
    permissions: ['fin_receber:VISUALIZAR'],
  });

  assert.equal(response.status, 403);
  assert.match(body.error, /não tem permissão/i);
  assert.equal(statements.length, 0);
});

test('consulta sem permissão e falha de banco têm respostas claras', async t => {
  const denied = await requestQuery(t, { type: 'admissions', user: regularUser });
  assert.equal(denied.response.status, 403);
  assert.equal(denied.statements.length, 0);

  const failed = await requestQuery(t, {
    type: 'collaborators',
    user: regularUser,
    permissions: ['cad_colaboradores:VISUALIZAR'],
    failDataQuery: true,
  });
  assert.equal(failed.response.status, 500);
  assert.match(failed.body.error, /Erro ao carregar/);
});
