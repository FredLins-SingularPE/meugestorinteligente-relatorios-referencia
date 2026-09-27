import React, { useState, useMemo, useEffect } from 'react';
import ReportRenderer from './ReportRenderer';
import { exportToPrint, exportToPDF, exportToExcel, exportToWord, exportToCSV, exportToHTML } from '../../../utils/reportExporters';
import type { ReportLayout, ChartConfig, SubreportConfig, FilterConfig } from './types';

interface PreviewTabProps {
  sqlQuery: string;
  layout: ReportLayout;
  charts: ChartConfig[];
  subreports: SubreportConfig[];
  contentMode: 'data' | 'charts' | 'both';
  targetLayout: 'responsive' | 'web' | 'mobile';
  filters: FilterConfig[];
  logoUrl?: string;
  templateId?: string;
}

function buildParameterizedQuery(sql: string, filters: FilterConfig[], filterValues: Record<string, string>): { sql: string; params: string[]; appliedFilterIds: Set<string> } {
  const params: string[] = [];
  const appliedFilterIds = new Set<string>();
  let paramIndex = 1;
  let processedSql = sql;

  for (const f of filters) {
    const val = filterValues[f.id] !== undefined ? filterValues[f.id] : (f.defaultValue || '');
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
      appliedFilterIds.add(f.id);
      paramIndex++;
    } else if (matchesColon) {
      const token = `$${paramIndex}`;
      processedSql = processedSql.replace(colonStyle, () => token);
      params.push(val);
      appliedFilterIds.add(f.id);
      paramIndex++;
    }
  }

  return { sql: processedSql, params, appliedFilterIds };
}

function applyClientFilters(data: any[], filters: FilterConfig[], filterValues: Record<string, string>, appliedFilterIds = new Set<string>()): any[] {
  if (filters.length === 0) return data;
  return data.filter(row => {
    for (const f of filters) {
      if (appliedFilterIds.has(f.id)) continue;
      const val = filterValues[f.id] !== undefined ? filterValues[f.id] : (f.defaultValue || '');
      if (val === '' || val === null || val === undefined) continue;

      const rawCell = row[f.placeholder];
      const cellStr = rawCell != null ? String(rawCell) : '';

      if (f.type === 'text') {
        if (!cellStr.toLowerCase().includes(val.toLowerCase())) return false;
      } else if (f.type === 'select') {
        if (cellStr !== val) return false;
      } else if (f.type === 'date') {
        const cellDate = cellStr.slice(0, 10);
        if (cellDate !== val) return false;
      } else if (f.type === 'number') {
        const num = parseFloat(String(rawCell ?? ''));
        if (isNaN(num) || num !== parseFloat(val)) return false;
      }
    }
    return true;
  });
}

function computeSummaryRows(data: any[], config: SubreportConfig): any[] {
  const summary = config.summary_config;
  if (!summary?.groupField) return [];
  const groups = new Map<string, any[]>();
  for (const row of data) {
    const key = String(row[summary.groupField] ?? '(vazio)');
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return Array.from(groups, ([key, rows]) => {
    const result: Record<string, unknown> = { [summary.groupField]: key };
    for (const { field, op } of summary.operations || []) {
      if (op === 'none') continue;
      if (op === 'count') {
        result[field] = rows.length;
        continue;
      }
      const values = rows.map(row => Number(row[field])).filter(Number.isFinite);
      if (op === 'sum') result[field] = values.reduce((sum, value) => sum + value, 0);
      else if (op === 'avg') result[field] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      else if (op === 'min') result[field] = values.length ? Math.min(...values) : 0;
      else if (op === 'max') result[field] = values.length ? Math.max(...values) : 0;
    }
    return result;
  });
}

function captureChartImages(charts: ChartConfig[]) {
  const rendered = [
    ...charts.filter(chart => chart.position === 'before'),
    ...charts.filter(chart => chart.position !== 'before'),
  ];
  const canvases = Array.from(document.querySelectorAll<HTMLCanvasElement>(
    '#report-render-area #charts-before canvas, #report-render-area #charts-after canvas',
  ));
  return rendered.flatMap((chart, index) => {
    try {
      return canvases[index] ? [{ title: chart.title || 'Gráfico', position: chart.position, src: canvases[index].toDataURL('image/png') }] : [];
    } catch {
      return [];
    }
  });
}

export default function PreviewTab({ sqlQuery, layout, charts, subreports, contentMode, targetLayout, filters, logoUrl, templateId }: PreviewTabProps) {
  const [rawData, setRawData] = useState<any[]>([]);
  const [rawSubreportsData, setRawSubreportsData] = useState<{ config: SubreportConfig; data: any[]; appliedFilterIds: Set<string> }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [executed, setExecuted] = useState(false);
  const [appliedFilterIds, setAppliedFilterIds] = useState<Set<string>>(new Set());
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    setExecuted(false);
    setRawData([]);
    setRawSubreportsData([]);
    setError(null);
    setTruncated(false);
  }, [sqlQuery, filters, subreports]);

  const handleFilterChange = (id: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [id]: value }));
    setExecuted(false);
    setError(null);
    setTruncated(false);
  };

  const data = useMemo(() => applyClientFilters(rawData, filters, filterValues, appliedFilterIds), [rawData, filters, filterValues, appliedFilterIds]);

  const subreportsData = useMemo(() => {
    return rawSubreportsData.map(sr => ({
      config: sr.config,
      data: applyClientFilters(sr.data, filters, filterValues, sr.appliedFilterIds),
    }));
  }, [rawSubreportsData, filters, filterValues, appliedFilterIds]);

  const executeQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('Nenhuma consulta SQL definida.');
      return;
    }
    setLoading(true);
    setExecuted(false);
    setRawData([]);
    setRawSubreportsData([]);
    setError(null);
    setAccessDenied(false);
    setTruncated(false);
    try {
      const { sql, params, appliedFilterIds: applied } = buildParameterizedQuery(sqlQuery, filters, filterValues);

      const res = await fetch('/api/reports/execute-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // filterValues é usado pelo servidor (não-admins) para reconstruir a query
        // a partir do SQL armazenado no template; sql/params servem ao preview admin.
        body: JSON.stringify({ sql, params, templateId, filterValues, limit: 500 }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw Object.assign(new Error(errData.error || 'Erro ao executar consulta'), { status: res.status });
      }
      const result = await res.json();
      setRawData(result.rows || []);
      setAppliedFilterIds(applied);
      setTruncated(!!result.truncated);

      const srResults: { config: SubreportConfig; data: any[]; appliedFilterIds: Set<string> }[] = [];
      for (const sr of subreports) {
        if (sr.type === 'query' && sr.sql_query) {
          const srQuery = buildParameterizedQuery(sr.sql_query, filters, filterValues);
          const srRes = await fetch('/api/reports/execute-query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: srQuery.sql, params: srQuery.params, templateId, subreportId: sr.id, filterValues, limit: 500 }),
          });
          const srResult = await srRes.json().catch(() => ({}));
          if (!srRes.ok) throw Object.assign(new Error(srResult.error || `Erro ao executar o subrelatório "${sr.title}".`), { status: srRes.status });
          srResults.push({ config: sr, data: srResult.rows || [], appliedFilterIds: srQuery.appliedFilterIds });
        } else if (sr.type === 'summary') {
          srResults.push({ config: sr, data: computeSummaryRows(result.rows || [], sr), appliedFilterIds: applied });
        }
      }
      setRawSubreportsData(srResults);
      setExecuted(true);
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
      setAccessDenied(err.status === 401 || err.status === 403);
    } finally {
      setLoading(false);
    }
  };

  const paperWidthClass = targetLayout === 'mobile'
    ? 'max-w-[360px]'
    : targetLayout === 'web'
      ? 'w-full'
      : 'max-w-4xl';

  const activeFilterCount = filters.filter(f => {
    const v = filterValues[f.id] !== undefined ? filterValues[f.id] : (f.defaultValue || '');
    return v !== '';
  }).length;

  return (
    <div className="space-y-4">
      {filters.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filtros
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterValues({});
                  setExecuted(false);
                  setError(null);
                }}
                className="text-[10px] text-gray-500 hover:text-red-600 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar filtros ({activeFilterCount})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filters.map(f => {
              const currentVal = filterValues[f.id] !== undefined ? filterValues[f.id] : (f.defaultValue || '');
              return (
                <div key={f.id}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label || f.placeholder}</label>
                  {f.type === 'select' ? (
                    <select
                      value={currentVal}
                      onChange={e => handleFilterChange(f.id, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                    >
                      <option value="">— Todos —</option>
                      {(f.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                      value={currentVal}
                      onChange={e => handleFilterChange(f.id, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                      placeholder={f.type === 'text' ? 'Todos (deixe vazio)' : ''}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {executed && (
            <p className="mt-2 text-[10px] text-gray-400">
              {data.length} de {rawData.length} registro(s) exibido(s)
              {activeFilterCount > 0 ? ` com ${activeFilterCount} filtro(s) ativo(s)` : ' (sem filtros ativos — todos os dados)'}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={executeQuery}
          disabled={loading || !sqlQuery.trim()}
          className="px-4 py-2 text-xs font-semibold text-white bg-moss-700 rounded-lg hover:bg-moss-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          Gerar Relatório
        </button>

        {executed && (data.length > 0 || subreportsData.some(subreport => subreport.data.length > 0)) && (() => {
          const layoutWithLogo = logoUrl
            ? { ...layout, header: { ...layout.header, logo: logoUrl } }
            : layout;
          const chartImages = contentMode === 'data' ? [] : captureChartImages(charts);
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">{data.length} registro(s)</span>
              <div className="h-4 w-px bg-gray-300" />
              <button onClick={() => exportToPrint(data, layoutWithLogo, charts, subreportsData, contentMode, chartImages)} className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 rounded hover:bg-gray-200">Imprimir</button>
              <button onClick={() => exportToPDF(data, layoutWithLogo, charts, subreportsData, contentMode, chartImages)} className="px-2 py-1 text-[10px] font-semibold text-red-600 bg-red-50 rounded hover:bg-red-100">PDF</button>
              <button onClick={() => exportToExcel(data, layoutWithLogo, charts, subreportsData, contentMode)} className="px-2 py-1 text-[10px] font-semibold text-green-600 bg-green-50 rounded hover:bg-green-100">Excel</button>
              <button onClick={() => exportToWord(data, layoutWithLogo, charts, subreportsData, contentMode, chartImages)} className="px-2 py-1 text-[10px] font-semibold text-blue-600 bg-blue-50 rounded hover:bg-blue-100">Word</button>
              <button onClick={() => exportToCSV(data, layoutWithLogo, charts, subreportsData, contentMode)} className="px-2 py-1 text-[10px] font-semibold text-orange-600 bg-orange-50 rounded hover:bg-orange-100">CSV</button>
              <button onClick={() => exportToHTML(data, layoutWithLogo, charts, subreportsData, contentMode, chartImages)} className="px-2 py-1 text-[10px] font-semibold text-purple-600 bg-purple-50 rounded hover:bg-purple-100">HTML</button>
            </div>
          );
        })()}
      </div>

      {truncated && executed && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          A execução atingiu o limite de 500 linhas. Ajuste os filtros para consultar um intervalo menor.
        </p>
      )}
      {executed && !loading && data.length === 0 && subreportsData.every(subreport => subreport.data.length === 0) && (
        <p className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600" role="status">
          A execução terminou sem resultados para os filtros informados.
        </p>
      )}

      {error && (
        <div className={`px-4 py-2 rounded-lg text-xs ${accessDenied ? 'border border-amber-200 bg-amber-50 text-amber-900' : 'border border-red-200 bg-red-50 text-red-700'}`} role="alert">
          <strong>{accessDenied ? 'Acesso não autorizado. ' : ''}</strong>{error}
        </div>
      )}

      {executed && !loading && (
        <div className={`mx-auto ${paperWidthClass}`}>
          <div id="report-render-area">
            <ReportRenderer
              data={data}
              layout={layout}
              charts={charts}
              subreportsData={subreportsData}
              contentMode={contentMode}
              logoUrl={logoUrl}
            />
          </div>
        </div>
      )}

      {!executed && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <svg className="w-16 h-16 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <p className="text-sm font-semibold">Preview do Relatório</p>
          <p className="text-xs text-center max-w-sm">
            {sqlQuery.trim()
              ? 'Clique em "Gerar Relatório" para visualizar o resultado.'
              : 'Configure uma consulta SQL na aba "Fonte de Dados" para gerar o preview.'}
          </p>
        </div>
      )}
    </div>
  );
}
