import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVisibleReportTemplate,
  isReadOnlyQuery,
  validateReportDefinition,
  validateReportSql,
  wrapReadOnlyQueryWithLimit,
} from '../server/lib/reportSecurity.js';

test('report SQL accepts one read-only SELECT and blocks mutations and multiple statements', () => {
  assert.equal(isReadOnlyQuery('/* report */ SELECT id FROM clients;'), true);
  assert.equal(isReadOnlyQuery('WITH recent AS (SELECT id FROM clients) SELECT id FROM recent'), true);
  assert.equal(isReadOnlyQuery('SELECT id INTO copied_clients FROM clients'), false);
  assert.equal(isReadOnlyQuery('SELECT id FROM clients FOR UPDATE'), false);
  assert.equal(isReadOnlyQuery('WITH x AS (DELETE FROM clients RETURNING id) SELECT id FROM x'), false);
  assert.equal(isReadOnlyQuery('SELECT 1; DELETE FROM clients'), false);
  assert.equal(isReadOnlyQuery('SELECT pg_sleep(30)'), false);
  assert.ok(validateReportSql('UPDATE clients SET name = \'x\''));
  assert.equal(wrapReadOnlyQueryWithLimit('SELECT id FROM clients;', 501), 'SELECT * FROM (SELECT id FROM clients) AS _report_result LIMIT 501');
});

test('report definitions validate filter operators, parameter names, and subreport SQL', () => {
  assert.equal(validateReportDefinition({
    filters: [{ id: 'filter-1', placeholder: 'client.name', type: 'text' }],
    subreports: [{ id: 'summary-1', type: 'summary', summary_config: { groupField: 'city', operations: [] } }],
    target_layout: 'responsive',
    content_mode: 'both',
  }), null);
  assert.ok(validateReportDefinition({
    filters: [{ id: 'same', placeholder: 'name', type: 'text' }, { id: 'same', placeholder: 'name', type: 'text' }],
  }));
  assert.ok(validateReportDefinition({ filters: [{ id: 'bad', placeholder: 'name);DROP', type: 'text' }] }));
  assert.ok(validateReportDefinition({
    subreports: [{ id: 'query-1', type: 'query', sql_query: 'DELETE FROM clients' }],
  }));
});

test('template execution lookup binds the caller and their groups and hides unavailable models', async () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    groupIds: ['22222222-2222-4222-8222-222222222222'],
  };
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ id: 'template-1', sql_query: 'SELECT 1' }] };
    },
  };
  assert.equal((await getVisibleReportTemplate(pool, user, 'template-1')).id, 'template-1');
  assert.deepEqual(calls[0].params, ['template-1', user.id, user.groupIds]);
  assert.match(calls[0].sql, /allowed_users @> ARRAY\[\$2\]::uuid\[\]/);
  assert.match(calls[0].sql, /allowed_groups && \$3::uuid\[\]/);

  pool.query = async () => ({ rows: [] });
  assert.equal(await getVisibleReportTemplate(pool, user, 'private-template'), null);
});
