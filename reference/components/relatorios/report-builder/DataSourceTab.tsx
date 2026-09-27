import React, { useState, useCallback, useEffect } from 'react';
import SchemaExplorer from './SchemaExplorer';
import JoinBuilder, { type JoinConfig } from './JoinBuilder';
import WhereBuilder, { type WhereCondition } from './WhereBuilder';
import QueryPreview from './QueryPreview';

interface SelectedColumn {
  table: string;
  column: string;
  type: string;
}

interface QueryField {
  name: string;
  dataTypeID?: number;
}

interface HistoryEntry {
  sql: string;
  timestamp: number;
}

interface DataSourceTabProps {
  sqlQuery: string;
  onSqlChange: (sql: string) => void;
  onColumnsChange?: (columns: { field: string; label: string }[]) => void;
}

type Mode = 'visual' | 'sql';

const quoteIdentifier = (value: string) => {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) return null;
  return `"${value}"`;
};

const quoteField = (value: string) => {
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const table = quoteIdentifier(parts[0]);
  const column = quoteIdentifier(parts[1]);
  return table && column ? `${table}.${column}` : null;
};

const sqlLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;

function generateSql(
  selectedTables: string[],
  selectedColumns: SelectedColumn[],
  joins: JoinConfig[],
  conditions: WhereCondition[],
  orderBy: string[],
  groupBy: string[],
): string {
  if (selectedTables.length === 0 || selectedColumns.length === 0) return '';

  const selectFields = selectedColumns.map((c) => {
    const field = quoteField(`${c.table}.${c.column}`);
    const alias = quoteIdentifier(`${c.table}__${c.column}`);
    return field && alias ? `${field} AS ${alias}` : null;
  });
  if (selectFields.some(field => !field)) return '';

  const baseTable = quoteIdentifier(selectedTables[0]);
  if (!baseTable) return '';
  let fromClause = baseTable;
  for (const join of joins) {
    if (join.leftColumn && join.rightColumn) {
      const left = quoteField(`${join.leftTable}.${join.leftColumn}`);
      const right = quoteField(`${join.rightTable}.${join.rightColumn}`);
      const rightTable = quoteIdentifier(join.rightTable);
      const joinType = ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'].includes(join.joinType) ? join.joinType : null;
      if (!joinType || !rightTable || !left || !right || !selectedTables.includes(join.leftTable) || !selectedTables.includes(join.rightTable)) return '';
      fromClause += `\n${joinType} ${rightTable} ON ${left} = ${right}`;
    }
  }

  let sql = `SELECT\n  ${selectFields.join(',\n  ')}\nFROM ${fromClause}`;

  if (conditions.length > 0) {
    const whereParts: string[] = [];
    for (const cond of conditions) {
      if (!cond.field) return '';
      const field = quoteField(cond.field);
      const fieldTable = cond.field.split('.')[0];
      if (!field || !selectedTables.includes(fieldTable)) return '';
      const operator = String(cond.operator || '').toUpperCase();
      const value = String(cond.value ?? '').trim();
      const allowedOperators = ['=', '!=', '<>', '>', '>=', '<', '<=', 'LIKE', 'ILIKE', 'IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];
      if (!allowedOperators.includes(operator)) return '';
      let clause: string;
      if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
        clause = `${field} ${operator}`;
      } else if (value.includes('{{') || value.includes('}}')) {
        const isToken = (part: string) => /^\{\{[A-Za-z_][A-Za-z0-9_]*\}\}$/.test(part.trim());
        if (operator === 'IN') {
          const tokens = value.split(',').map(token => token.trim());
          if (tokens.length === 0 || tokens.some(token => !isToken(token))) return '';
          clause = `${field} IN (${tokens.join(', ')})`;
        } else if (operator === 'BETWEEN') {
          const tokens = value.split(/\s+AND\s+/i).map(token => token.trim());
          if (tokens.length !== 2 || tokens.some(token => !isToken(token))) return '';
          clause = `${field} BETWEEN ${tokens[0]} AND ${tokens[1]}`;
        } else {
          if (!isToken(value)) return '';
          clause = `${field} ${operator} ${value}`;
        }
      } else if (operator === 'IN') {
        const values = value.split(',').map(item => item.trim()).filter(Boolean);
        if (values.length === 0) return '';
        clause = `${field} IN (${values.map(sqlLiteral).join(', ')})`;
      } else if (operator === 'BETWEEN') {
        const values = value.split(',').map(item => item.trim());
        if (values.length !== 2 || values.some(value => !value)) return '';
        clause = `${field} BETWEEN ${sqlLiteral(values[0])} AND ${sqlLiteral(values[1])}`;
      } else {
        clause = `${field} ${operator} ${sqlLiteral(value)}`;
      }
      const connector = whereParts.length > 0 && ['AND', 'OR'].includes(cond.connector) ? ` ${cond.connector} ` : '';
      whereParts.push(`${connector}${clause}`);
    }
    if (whereParts.length > 0) sql += `\nWHERE ${whereParts.join('')}`;
  }

  if (groupBy.length > 0) {
    const fields = groupBy.map(quoteField);
    if (fields.some(field => !field)) return '';
    sql += `\nGROUP BY ${fields.join(', ')}`;
  }
  if (orderBy.length > 0) {
    const fields = orderBy.map(quoteField);
    if (fields.some(field => !field)) return '';
    sql += `\nORDER BY ${fields.join(', ')}`;
  }

  return sql;
}

export default function DataSourceTab({ sqlQuery, onSqlChange, onColumnsChange }: DataSourceTabProps) {
  const [mode, setMode] = useState<Mode>('sql');
  const [rawSql, setRawSql] = useState(sqlQuery);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<SelectedColumn[]>([]);
  const [joins, setJoins] = useState<JoinConfig[]>([]);
  const [conditions, setConditions] = useState<WhereCondition[]>([]);
  const [orderBy, setOrderBy] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<string[]>([]);

  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [previewFields, setPreviewFields] = useState<QueryField[]>([]);
  const [previewRowCount, setPreviewRowCount] = useState<number | undefined>();
  const [previewDuration, setPreviewDuration] = useState<number | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | undefined>();

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setRawSql(sqlQuery);
  }, [sqlQuery]);

  useEffect(() => {
    if (mode === 'visual') {
      const sql = generateSql(selectedTables, selectedColumns, joins, conditions, orderBy, groupBy);
      if (sql) {
        onSqlChange(sql);
        setRawSql(sql);
      }
    }
  }, [selectedTables, selectedColumns, joins, conditions, orderBy, groupBy, mode, onSqlChange]);

  useEffect(() => {
    if (onColumnsChange && previewFields.length > 0) {
      onColumnsChange(previewFields.map((f) => ({ field: f.name, label: f.name })));
    }
  }, [previewFields, onColumnsChange]);

  const handleSelectTable = useCallback((table: string) => {
    setSelectedTables((prev) => (prev.includes(table) ? prev : [...prev, table]));
  }, []);

  const handleDeselectTable = useCallback((table: string) => {
    setSelectedTables((prev) => prev.filter((t) => t !== table));
    setSelectedColumns((prev) => prev.filter((c) => c.table !== table));
    setJoins((prev) => prev.filter((j) => j.leftTable !== table && j.rightTable !== table));
  }, []);

  const handleToggleColumn = useCallback((table: string, column: string, type: string) => {
    setSelectedColumns((prev) => {
      const exists = prev.some((c) => c.table === table && c.column === column);
      if (exists) return prev.filter((c) => !(c.table === table && c.column === column));
      return [...prev, { table, column, type }];
    });
  }, []);

  const handleSqlBlur = () => {
    if (mode === 'sql') onSqlChange(rawSql);
  };

  const executePreview = async () => {
    const sql = mode === 'sql' ? rawSql : generateSql(selectedTables, selectedColumns, joins, conditions, orderBy, groupBy);
    if (!sql.trim()) return;
    onSqlChange(sql);
    setRawSql(sql);

    setPreviewLoading(true);
    setPreviewError(undefined);

    const entry: HistoryEntry = { sql, timestamp: Date.now() };
    setHistory((prev) => [entry, ...prev.filter((h) => h.sql !== sql)].slice(0, 10));

    try {
      const res = await fetch('/api/reports/preview-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || 'Erro ao executar consulta');
        setPreviewRows([]);
        setPreviewFields([]);
        setPreviewDuration(data.duration);
      } else {
        setPreviewRows(data.rows || []);
        setPreviewFields(data.fields || []);
        setPreviewRowCount(data.rowCount);
        setPreviewDuration(data.duration);
      }
    } catch (err) {
      setPreviewError('Erro de conexão com o servidor');
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setRawSql(entry.sql);
    onSqlChange(entry.sql);
    setShowHistory(false);
  };

  const handleAddOrderBy = () => {
    if (selectedColumns.length === 0) return;
    const first = `${selectedColumns[0].table}.${selectedColumns[0].column}`;
    setOrderBy((prev) => [...prev, first]);
  };

  const handleAddGroupBy = () => {
    if (selectedColumns.length === 0) return;
    const first = `${selectedColumns[0].table}.${selectedColumns[0].column}`;
    setGroupBy((prev) => [...prev, first]);
  };

  const allColumns = selectedColumns.map((c) => ({ table: c.table, column: c.column, type: c.type }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode('visual')}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'visual' ? 'bg-white text-moss-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Visual
        </button>
        <button
          onClick={() => setMode('sql')}
          className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'sql' ? 'bg-white text-moss-800 font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SQL
        </button>
      </div>

      {mode === 'visual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <SchemaExplorer
              selectedTables={selectedTables}
              onSelectTable={handleSelectTable}
              onDeselectTable={handleDeselectTable}
              selectedColumns={selectedColumns}
              onToggleColumn={handleToggleColumn}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedColumns.length > 0 && (
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Campos Selecionados</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedColumns.map((col) => (
                    <span
                      key={`${col.table}.${col.column}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-moss-50 text-moss-700 rounded text-xs"
                    >
                      <span className="text-gray-400">{col.table}.</span>
                      {col.column}
                      <button
                        onClick={() => handleToggleColumn(col.table, col.column, col.type)}
                        className="text-moss-400 hover:text-red-500 ml-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <JoinBuilder selectedTables={selectedTables} joins={joins} onJoinsChange={setJoins} />

            <WhereBuilder conditions={conditions} onConditionsChange={setConditions} availableColumns={allColumns} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">ORDER BY</h4>
                  <button onClick={handleAddOrderBy} className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded hover:bg-moss-200">
                    + Adicionar
                  </button>
                </div>
                {orderBy.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem ordenação</p>
                ) : (
                  <div className="space-y-1">
                    {orderBy.map((ob, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={ob}
                          onChange={(e) => setOrderBy((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white flex-1"
                        >
                          {allColumns.map((c) => (
                            <option key={`${c.table}.${c.column}`} value={`${c.table}.${c.column}`}>
                              {c.table}.{c.column}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setOrderBy((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">GROUP BY</h4>
                  <button onClick={handleAddGroupBy} className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded hover:bg-moss-200">
                    + Adicionar
                  </button>
                </div>
                {groupBy.length === 0 ? (
                  <p className="text-xs text-gray-400">Sem agrupamento</p>
                ) : (
                  <div className="space-y-1">
                    {groupBy.map((gb, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={gb}
                          onChange={(e) => setGroupBy((prev) => prev.map((v, i) => (i === idx ? e.target.value : v)))}
                          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white flex-1"
                        >
                          {allColumns.map((c) => (
                            <option key={`${c.table}.${c.column}`} value={`${c.table}.${c.column}`}>
                              {c.table}.{c.column}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setGroupBy((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {rawSql && (
              <div className="border border-gray-200 rounded-lg bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">SQL Gerado</h4>
                <pre className="text-xs font-mono bg-gray-50 p-3 rounded-lg overflow-x-auto text-gray-700 whitespace-pre-wrap">
                  {rawSql}
                </pre>
                <button
                  onClick={executePreview}
                  className="mt-2 px-4 py-1.5 bg-moss-700 text-white text-sm rounded-md hover:bg-moss-800 transition-colors"
                >
                  Executar Preview
                </button>
              </div>
            )}

            <QueryPreview
              rows={previewRows}
              fields={previewFields}
              rowCount={previewRowCount}
              duration={previewDuration}
              loading={previewLoading}
              error={previewError}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Consulta SQL</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  Histórico ({history.length})
                </button>
                <button
                  onClick={executePreview}
                  disabled={!rawSql.trim() || previewLoading}
                  className="px-4 py-1.5 bg-moss-700 text-white text-sm rounded-md hover:bg-moss-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Executar Preview
                </button>
              </div>
            </div>

            <textarea
              value={rawSql}
              onChange={(e) => setRawSql(e.target.value)}
              onBlur={handleSqlBlur}
              placeholder="SELECT * FROM tabela WHERE ..."
              rows={10}
              className="w-full px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-moss-500 focus:border-moss-500 resize-y bg-gray-50"
              spellCheck={false}
            />
          </div>

          {showHistory && history.length > 0 && (
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Histórico de Consultas</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((entry) => (
                  <button
                    key={entry.timestamp}
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-left p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    <pre className="text-xs font-mono text-gray-600 truncate">{entry.sql}</pre>
                    <span className="text-[10px] text-gray-400">
                      {new Date(entry.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <QueryPreview
            rows={previewRows}
            fields={previewFields}
            rowCount={previewRowCount}
            duration={previewDuration}
            loading={previewLoading}
            error={previewError}
          />
        </div>
      )}
    </div>
  );
}
