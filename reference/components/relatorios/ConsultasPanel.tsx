import React, { useCallback, useEffect, useRef, useState } from 'react';

type QueryType = 'clients' | 'titles' | 'admissions' | 'bankMovements' | 'collaborators';

interface QueryColumn {
  key: string;
  label: string;
}

const QUERY_TYPES: { value: QueryType; label: string }[] = [
  { value: 'clients', label: 'Clientes' },
  { value: 'titles', label: 'Títulos financeiros' },
  { value: 'admissions', label: 'Admissões' },
  { value: 'bankMovements', label: 'Movimentações bancárias' },
  { value: 'collaborators', label: 'Colaboradores' },
];

const STATUS_OPTIONS: Partial<Record<QueryType, string[]>> = {
  titles: ['ABERTO', 'PAGO', 'PARCIAL', 'CANCELADO', 'PROTESTADO', 'PROVISAO'],
  admissions: ['PENDENTE', 'NEGOCIAÇÃO', 'APROVADA', 'ANÁLISE CLIENTE', 'REPROVADA', 'AUDITADA', 'FINALIZADA'],
  bankMovements: ['PENDENTE', 'CONCILIADO'],
  collaborators: ['true', 'false'],
};

const STATUS_LABELS: Partial<Record<QueryType, Record<string, string>>> = {
  collaborators: { true: 'Ativo', false: 'Inativo' },
};

const DATE_FILTER_TYPES = new Set<QueryType>(['clients', 'titles', 'admissions', 'bankMovements']);

const formatCell = (value: unknown, key: string) => {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'value' || key === 'current_balance' || key === 'financed_amount') {
    const numericValue = Number(String(value).replace(',', '.'));
    if (Number.isFinite(numericValue)) {
      return numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  }
  if (key === 'created_at' || key === 'due_date' || key === 'date') {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
  }
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  return String(value);
};

export default function ConsultasPanel() {
  const [type, setType] = useState<QueryType>('clients');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('');
  const [scope, setScope] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [columns, setColumns] = useState<QueryColumn[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; denied: boolean } | null>(null);
  const [hasRun, setHasRun] = useState(false);
  const requestId = useRef(0);

  const runQuery = useCallback(async (overrides: { sortBy?: string; order?: 'ASC' | 'DESC' } = {}) => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      type,
      limit: '100',
      sortBy: overrides.sortBy || sortBy || '',
      order: overrides.order || order,
    });
    if (search.trim()) params.set('search', search.trim());
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (status) params.set('status', status);
    if (scope) params.set('scope', scope);

    try {
      const response = await fetch(`/api/reports/queries?${params.toString()}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const denied = response.status === 401 || response.status === 403;
        throw Object.assign(new Error(result.error || 'Não foi possível carregar os dados.'), { denied });
      }
      if (id !== requestId.current) return;
      setColumns(result.columns || []);
      setRows(result.rows || []);
      setTruncated(!!result.truncated);
      setSortBy(overrides.sortBy || sortBy || result.columns?.[0]?.key || '');
      if (overrides.order) setOrder(overrides.order);
      setHasRun(true);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setRows([]);
      setColumns([]);
      setTruncated(false);
      setHasRun(true);
      setError({ message: err?.message || 'Erro de conexão com o servidor.', denied: !!err?.denied });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [type, search, dateFrom, dateTo, status, scope, sortBy, order]);

  useEffect(() => {
    setRows([]);
    setColumns([]);
    setTruncated(false);
    setHasRun(false);
    setError(null);
    setStatus('');
    setScope('');
    setSortBy('');
  }, [type]);

  const toggleSort = (key: string) => {
    const nextOrder = sortBy === key && order === 'ASC' ? 'DESC' : 'ASC';
    setSortBy(key);
    setOrder(nextOrder);
    if (hasRun) runQuery({ sortBy: key, order: nextOrder });
  };

  const isTitleQuery = type === 'titles';
  const statuses = STATUS_OPTIONS[type];

  return (
    <section className="flex h-full min-h-0 flex-col gap-4" aria-label="Consultas somente para leitura">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Consultas</h2>
        <p className="mt-1 text-sm text-gray-500">Consulte dados dos módulos autorizados. Os resultados são somente para leitura e limitados a 100 linhas.</p>
      </div>

      <form
        className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6"
        onSubmit={event => { event.preventDefault(); runQuery(); }}
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 xl:col-span-2">
          Fonte
          <select value={type} onChange={event => setType(event.target.value as QueryType)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
            {QUERY_TYPES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        {isTitleQuery && (
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Tipo de título
            <select value={scope} onChange={event => setScope(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Todos os autorizados</option>
              <option value="RECEBER">A receber</option>
              <option value="PAGAR">A pagar</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-600 xl:col-span-2">
          Buscar
          <input value={search} onChange={event => setSearch(event.target.value)} maxLength={100} placeholder="Nome, documento ou descrição" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
        {statuses && (
          <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
            Situação
            <select value={status} onChange={event => setStatus(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Todas</option>
              {statuses.map(value => <option key={value} value={value}>{STATUS_LABELS[type]?.[value] || value}</option>)}
            </select>
          </label>
        )}
        {DATE_FILTER_TYPES.has(type) && (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Data inicial
              <input type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              Data final
              <input type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </>
        )}
        <div className="flex items-end">
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-moss-700 px-4 py-2 text-sm font-semibold text-white hover:bg-moss-800 disabled:cursor-wait disabled:opacity-60">
            {loading ? 'Consultando…' : 'Consultar'}
          </button>
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-500" role="status">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-moss-600 border-t-transparent" />
            Carregando resultados…
          </div>
        ) : error ? (
          <div className={`m-4 rounded-lg border p-4 text-sm ${error.denied ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-red-200 bg-red-50 text-red-800'}`} role="alert">
            <strong>{error.denied ? 'Acesso não autorizado' : 'Falha na consulta'}</strong>
            <p className="mt-1">{error.message}</p>
          </div>
        ) : !hasRun ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-gray-500">Escolha os filtros e selecione Consultar.</div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-gray-500">Nenhum registro corresponde aos filtros.</div>
        ) : (
          <>
            <div className="border-b border-gray-200 px-4 py-2 text-xs text-gray-500">{rows.length} resultado(s){truncated ? ' — limite de 100 linhas atingido; refine os filtros para ver mais' : ''}</div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {columns.map(column => (
                    <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                      <button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1 hover:text-moss-800">
                        {column.label}
                        <span aria-hidden="true">{sortBy === column.key ? (order === 'ASC' ? '↑' : '↓') : '↕'}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns.map(column => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-gray-700">{formatCell(row[column.key], column.key)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </section>
  );
}