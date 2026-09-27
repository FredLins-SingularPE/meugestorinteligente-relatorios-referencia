import React, { useState } from 'react';
import type { SubreportConfig, SubreportColumnConfig, SubreportTotalizer, SubreportSummaryConfig } from './types';

interface SubreportsTabProps {
  subreports: SubreportConfig[];
  onSubreportsChange: (subreports: SubreportConfig[]) => void;
  availableColumns: { name: string; dataType: string }[];
  parentData?: any[];
}

const FORMAT_OPTIONS = [
  { value: '', label: 'Nenhum' },
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moeda (R$)' },
  { value: 'percent', label: 'Percentual (%)' },
  { value: 'date', label: 'Data' },
  { value: 'datetime', label: 'Data/Hora' },
];

const OPERATION_OPTIONS = [
  { value: 'none', label: 'Nenhum' },
  { value: 'sum', label: 'Soma' },
  { value: 'count', label: 'Contagem' },
  { value: 'avg', label: 'Média' },
  { value: 'min', label: 'Mín' },
  { value: 'max', label: 'Máx' },
];

function generateId() {
  return 'sub_' + Math.random().toString(36).substr(2, 9);
}

function isNumericType(dataType: string): boolean {
  const numericTypes = ['number', 'numeric', 'integer', 'int', 'float', 'double', 'decimal', 'bigint', 'smallint', 'real', 'money'];
  return numericTypes.some(t => dataType.toLowerCase().includes(t));
}

export default function SubreportsTab({ subreports, onSubreportsChange, availableColumns, parentData }: SubreportsTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [queryResults, setQueryResults] = useState<Record<string, { rows: any[]; fields: any[]; error?: string; loading?: boolean }>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSubreport = () => {
    const newSub: SubreportConfig = {
      id: generateId(),
      type: 'summary',
      title: '',
      columns: [],
      totalizers: [],
      summary_config: { groupField: '', operations: [] },
    };
    onSubreportsChange([...subreports, newSub]);
    setExpandedIds(prev => new Set(prev).add(newSub.id));
  };

  const updateSubreport = (id: string, updates: Partial<SubreportConfig>) => {
    onSubreportsChange(subreports.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSubreport = (id: string) => {
    onSubreportsChange(subreports.filter(s => s.id !== id));
  };

  const moveSubreport = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= subreports.length) return;
    const arr = [...subreports];
    [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
    onSubreportsChange(arr);
  };

  const testQuery = async (sub: SubreportConfig) => {
    if (!sub.sql_query?.trim()) return;
    setQueryResults(prev => ({ ...prev, [sub.id]: { rows: [], fields: [], loading: true } }));
    try {
      const res = await fetch('/api/reports/preview-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sub.sql_query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao executar query');
      setQueryResults(prev => ({ ...prev, [sub.id]: { rows: data.rows || [], fields: data.fields || [] } }));
    } catch (err: any) {
      setQueryResults(prev => ({ ...prev, [sub.id]: { rows: [], fields: [], error: err.message } }));
    }
  };

  const numericColumns = availableColumns.filter(c => isNumericType(c.dataType));

  const computeSummaryPreview = (sub: SubreportConfig) => {
    if (!parentData?.length || !sub.summary_config?.groupField) return [];
    const { groupField, operations } = sub.summary_config;
    const groups: Record<string, any[]> = {};
    parentData.forEach(row => {
      const key = String(row[groupField] ?? '(vazio)');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    return Object.entries(groups).map(([key, rows]) => {
      const result: Record<string, any> = { [groupField]: key };
      (operations || []).forEach(({ field, op }) => {
        if (op === 'none') return;
        if (op === 'count') {
          result[field] = rows.length;
          return;
        }
        const vals = rows.map(r => Number(r[field])).filter(v => !isNaN(v));
        if (op === 'sum') result[field] = vals.reduce((a, b) => a + b, 0);
        else if (op === 'avg') result[field] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        else if (op === 'min') result[field] = vals.length ? Math.min(...vals) : 0;
        else if (op === 'max') result[field] = vals.length ? Math.max(...vals) : 0;
      });
      return result;
    });
  };

  const addColumn = (subId: string) => {
    const sub = subreports.find(s => s.id === subId);
    if (!sub) return;
    updateSubreport(subId, {
      columns: [...sub.columns, { field: '', label: '', width: 20, format: '', align: 'left' }],
    });
  };

  const updateColumn = (subId: string, colIdx: number, updates: Partial<SubreportColumnConfig>) => {
    const sub = subreports.find(s => s.id === subId);
    if (!sub) return;
    const cols = sub.columns.map((c, i) => i === colIdx ? { ...c, ...updates } : c);
    updateSubreport(subId, { columns: cols });
  };

  const removeColumn = (subId: string, colIdx: number) => {
    const sub = subreports.find(s => s.id === subId);
    if (!sub) return;
    updateSubreport(subId, { columns: sub.columns.filter((_, i) => i !== colIdx) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addSubreport}
          className="flex items-center gap-2 px-4 py-2 bg-moss-800 text-white rounded-lg hover:bg-moss-900 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Subrelatório
        </button>
      </div>

      <p className="text-xs text-gray-500 italic">
        Subrelatórios aparecem antes do rodapé do relatório principal
      </p>

      {subreports.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Nenhum subrelatório configurado</p>
          <p className="text-xs mt-1">Clique em "Adicionar Subrelatório" para começar</p>
        </div>
      )}

      {subreports.map((sub, index) => {
        const isExpanded = expandedIds.has(sub.id);
        const qr = queryResults[sub.id];

        return (
          <div key={sub.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer select-none"
              onClick={() => toggleExpand(sub.id)}
            >
              <div className="flex items-center gap-3">
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-sm text-gray-700">
                  {sub.title || `Subrelatório ${index + 1}`}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${sub.type === 'summary' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {sub.type === 'summary' ? 'Resumo' : 'Query'}
                </span>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => moveSubreport(index, -1)}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Mover para cima"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSubreport(index, 1)}
                  disabled={index === subreports.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => removeSubreport(sub.id)}
                  className="p-1 text-red-400 hover:text-red-600 ml-1"
                  title="Remover subrelatório"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                  <input
                    type="text"
                    value={sub.title}
                    onChange={e => updateSubreport(sub.id, { title: e.target.value })}
                    placeholder="Título do subrelatório"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-moss-800 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Tipo</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateSubreport(sub.id, {
                        type: 'summary',
                        summary_config: sub.summary_config || { groupField: '', operations: [] },
                      })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        sub.type === 'summary'
                          ? 'bg-moss-800 text-white border-moss-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Resumo Automático
                    </button>
                    <button
                      onClick={() => updateSubreport(sub.id, { type: 'query', sql_query: sub.sql_query || '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        sub.type === 'query'
                          ? 'bg-moss-800 text-white border-moss-800'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      Query Independente
                    </button>
                  </div>
                </div>

                {sub.type === 'summary' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Campo de Agrupamento</label>
                      <select
                        value={sub.summary_config?.groupField || ''}
                        onChange={e => updateSubreport(sub.id, {
                          summary_config: { ...sub.summary_config!, groupField: e.target.value, operations: sub.summary_config?.operations || [] },
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-moss-800 focus:border-transparent"
                      >
                        <option value="">Selecione um campo...</option>
                        {availableColumns.map(col => (
                          <option key={col.name} value={col.name}>{col.name}</option>
                        ))}
                      </select>
                    </div>

                    {numericColumns.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Operações por Coluna Numérica</label>
                        <div className="space-y-2">
                          {numericColumns.map(col => {
                            const existing = sub.summary_config?.operations?.find(o => o.field === col.name);
                            return (
                              <div key={col.name} className="flex items-center gap-3">
                                <span className="text-sm text-gray-700 w-40 truncate" title={col.name}>{col.name}</span>
                                <select
                                  value={existing?.op || 'none'}
                                  onChange={e => {
                                    const ops = (sub.summary_config?.operations || []).filter(o => o.field !== col.name);
                                    if (e.target.value !== 'none') {
                                      ops.push({ field: col.name, op: e.target.value });
                                    }
                                    updateSubreport(sub.id, {
                                      summary_config: { ...sub.summary_config!, operations: ops },
                                    });
                                  }}
                                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-moss-800 focus:border-transparent"
                                >
                                  {OPERATION_OPTIONS.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {parentData && parentData.length > 0 && sub.summary_config?.groupField && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Prévia do Resumo</label>
                        <div className="border border-gray-200 rounded-lg overflow-auto max-h-48 bg-white">
                          {(() => {
                            const preview = computeSummaryPreview(sub);
                            if (!preview.length) return <p className="p-3 text-xs text-gray-400">Sem dados para prévia</p>;
                            const keys = Object.keys(preview[0]);
                            return (
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr className="bg-gray-100">
                                    {keys.map(k => (
                                      <th key={k} className="px-2 py-1.5 text-left font-medium text-gray-600 border-b">{k}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {preview.slice(0, 10).map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      {keys.map(k => (
                                        <td key={k} className="px-2 py-1 border-b border-gray-100 text-gray-600">
                                          {typeof row[k] === 'number' ? row[k].toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(row[k] ?? '')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {sub.type === 'query' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Query SQL</label>
                      <textarea
                        value={sub.sql_query || ''}
                        onChange={e => updateSubreport(sub.id, { sql_query: e.target.value })}
                        placeholder="SELECT ... FROM ..."
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-moss-800 focus:border-transparent resize-y"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Use {'{{placeholder}}'} para variáveis dos filtros do relatório principal. Apenas consultas SELECT são permitidas.
                      </p>
                    </div>
                    <button
                      onClick={() => testQuery(sub)}
                      disabled={!sub.sql_query?.trim() || qr?.loading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-moss-800 text-white rounded-lg hover:bg-moss-900 transition-colors text-sm disabled:opacity-50"
                    >
                      {qr?.loading ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      Testar Query
                    </button>

                    {qr?.error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">
                        <p className="font-medium mb-1">Erro na consulta:</p>
                        <pre className="whitespace-pre-wrap font-mono">{qr.error}</pre>
                      </div>
                    )}

                    {qr && !qr.loading && !qr.error && qr.fields.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-auto max-h-48 bg-white">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 sticky top-0">
                              {qr.fields.map((f: any) => (
                                <th key={f.name} className="px-2 py-1.5 text-left font-medium text-gray-600 border-b whitespace-nowrap">{f.name}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {qr.rows.slice(0, 10).map((row: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {qr.fields.map((f: any) => (
                                  <td key={f.name} className="px-2 py-1 border-b border-gray-100 text-gray-600 whitespace-nowrap max-w-xs truncate">
                                    {row[f.name] === null ? <span className="text-gray-300 italic">NULL</span> : String(row[f.name])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {qr.rows.length > 10 && (
                          <p className="text-xs text-gray-400 p-2 text-center">Mostrando 10 de {qr.rows.length} registros</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-600">Configuração de Colunas</label>
                    <button
                      onClick={() => addColumn(sub.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-moss-800 border border-moss-800 rounded hover:bg-moss-800 hover:text-white transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Coluna
                    </button>
                  </div>

                  {sub.columns.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhuma coluna configurada</p>
                  )}

                  {sub.columns.map((col, colIdx) => (
                    <div key={colIdx} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-5 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Campo</label>
                          <input
                            type="text"
                            value={col.field}
                            onChange={e => updateColumn(sub.id, colIdx, { field: e.target.value })}
                            placeholder="campo"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Rótulo</label>
                          <input
                            type="text"
                            value={col.label}
                            onChange={e => updateColumn(sub.id, colIdx, { label: e.target.value })}
                            placeholder="Rótulo"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Largura %</label>
                          <input
                            type="number"
                            value={col.width}
                            onChange={e => updateColumn(sub.id, colIdx, { width: Number(e.target.value) })}
                            min={1}
                            max={100}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Formato</label>
                          <select
                            value={col.format}
                            onChange={e => updateColumn(sub.id, colIdx, { format: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                          >
                            {FORMAT_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Alinhamento</label>
                          <select
                            value={col.align}
                            onChange={e => updateColumn(sub.id, colIdx, { align: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                          >
                            <option value="left">Esquerda</option>
                            <option value="center">Centro</option>
                            <option value="right">Direita</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => removeColumn(sub.id, colIdx)}
                        className="mt-4 p-1 text-red-400 hover:text-red-600"
                        title="Remover coluna"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {sub.columns.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">Totalizadores</label>
                    <div className="space-y-2">
                      {sub.columns.map((col, colIdx) => {
                        const totalizer = sub.totalizers.find(t => t.field === col.field);
                        return (
                          <div key={colIdx} className="flex items-center gap-3">
                            <span className="text-xs text-gray-600 w-32 truncate" title={col.label || col.field}>
                              {col.label || col.field || `Coluna ${colIdx + 1}`}
                            </span>
                            <select
                              value={totalizer?.operation || 'none'}
                              onChange={e => {
                                const tots = sub.totalizers.filter(t => t.field !== col.field);
                                if (e.target.value !== 'none') {
                                  tots.push({ field: col.field, operation: e.target.value });
                                }
                                updateSubreport(sub.id, { totalizers: tots });
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-moss-800"
                            >
                              {OPERATION_OPTIONS.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}