import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import type { ReportLayout, ChartConfig, SubreportConfig, ColumnFormat } from './types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

export function formatCurrency(value: any): string {
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value ?? '');
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(value: any): string {
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value ?? '');
  return d.toLocaleDateString('pt-BR');
}

export function formatCPFCNPJ(value: any): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return String(value ?? '');
}

export function formatPercent(value: any): string {
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value ?? '');
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

export function formatNumber(value: any): string {
  const num = parseFloat(String(value));
  if (isNaN(num)) return String(value ?? '');
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function applyFormat(value: any, format?: ColumnFormat | string): string {
  if (value == null) return '';
  if (!format || format === 'text') return String(value);
  switch (format) {
    case 'currency_brl':
    case 'currency': return formatCurrency(value);
    case 'date': return formatDate(value);
    case 'datetime': {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR');
    }
    case 'cpf_cnpj': return formatCPFCNPJ(value);
    case 'percent': return formatPercent(value);
    case 'number': return formatNumber(value);
    default: return String(value);
  }
}

function groupData(data: any[], fields: string[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const row of data) {
    const key = fields.map(f => String(row[f] ?? 'Sem grupo')).join(' / ');
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }
  return groups;
}

function computeTotalizers(
  rows: any[],
  totalizers: { field: string; operation: string }[],
  columns: { field: string; label: string; format?: ColumnFormat | string }[]
): string {
  if (!totalizers || totalizers.length === 0) return `${rows.length} registro(s)`;
  const parts: string[] = [];
  for (const t of totalizers) {
    const col = columns.find(c => c.field === t.field);
    const label = col?.label || t.field;
    if (t.operation === 'contagem' || t.operation === 'count') {
      parts.push(`${label}: ${rows.length}`);
    } else if (t.operation === 'soma' || t.operation === 'sum') {
      const sum = rows.reduce((acc, row) => acc + (parseFloat(String(row[t.field] ?? 0)) || 0), 0);
      parts.push(`${label}: ${applyFormat(sum, col?.format as ColumnFormat || 'currency_brl')}`);
    } else if (t.operation === 'media' || t.operation === 'avg') {
      const avg = rows.length > 0 ? rows.reduce((acc, row) => acc + (parseFloat(String(row[t.field] ?? 0)) || 0), 0) / rows.length : 0;
      parts.push(`${label}: ${applyFormat(avg, col?.format as ColumnFormat || 'number')}`);
    } else if (t.operation === 'maximo' || t.operation === 'max') {
      const max = rows.reduce((acc, row) => Math.max(acc, parseFloat(String(row[t.field] ?? 0)) || 0), -Infinity);
      parts.push(`${label} (máx): ${applyFormat(max, col?.format as ColumnFormat || 'number')}`);
    } else if (t.operation === 'minimo' || t.operation === 'min') {
      const min = rows.reduce((acc, row) => Math.min(acc, parseFloat(String(row[t.field] ?? 0)) || 0), Infinity);
      parts.push(`${label} (mín): ${applyFormat(min, col?.format as ColumnFormat || 'number')}`);
    }
  }
  return parts.length > 0 ? parts.join(' | ') : `${rows.length} registro(s)`;
}

interface ReportRendererProps {
  data: any[];
  layout: ReportLayout;
  charts: ChartConfig[];
  subreportsData: { config: SubreportConfig; data: any[] }[];
  contentMode: 'data' | 'charts' | 'both';
  logoUrl?: string;
}

function aggregateChartData(data: any[], xField: string, yField: string, operation: string): { labels: string[]; values: number[] } {
  const map = new Map<string, number[]>();
  for (const row of data) {
    const key = String(row[xField] ?? '');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(parseFloat(String(row[yField] ?? 0)) || 0);
  }
  const entries: { label: string; value: number }[] = [];
  map.forEach((vals, key) => {
    let value: number;
    if (operation === 'contagem') value = vals.length;
    else if (operation === 'media') value = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    else value = vals.reduce((a, b) => a + b, 0);
    entries.push({ label: key, value });
  });
  entries.sort((a, b) => b.value - a.value);
  return {
    labels: entries.map(e => e.label),
    values: entries.map(e => e.value),
  };
}

function RenderCharts({ charts, data, position }: { charts: ChartConfig[]; data: any[]; position: 'before' | 'after' }) {
  const filtered = charts.filter(c => (position === 'before' ? c.position === 'before' : (c.position === 'after' || c.position === 'between')));
  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-4 my-4" id={`charts-${position}`}>
      {filtered.map(chart => {
        const chartType = chart.type;
        const subType = chart.subType;
        const isPie = chartType === 'pie';
        const colors: string[] = chart.colors?.length ? chart.colors : ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

        let labels: string[] = [];
        let datasets: any[] = [];

        if (isPie) {
          const yf = chart.yFields?.[0];
          if (yf) {
            const agg = aggregateChartData(data, chart.xField, yf.field, yf.operation || 'soma');
            labels = agg.labels;
            const bgColors = agg.labels.map((_, idx) => colors[idx % colors.length]);
            datasets = [{
              label: yf.field,
              data: agg.values,
              backgroundColor: bgColors,
              borderColor: bgColors.map((c: string) => c + 'CC'),
              borderWidth: 1,
            }];
          }
        } else {
          const firstAgg = chart.yFields?.[0]
            ? aggregateChartData(data, chart.xField, chart.yFields[0].field, chart.yFields[0].operation || 'soma')
            : { labels: [], values: [] };
          labels = firstAgg.labels;

          datasets = (chart.yFields || []).map((yf, i) => {
            const agg = i === 0 ? firstAgg : aggregateChartData(data, chart.xField, yf.field, yf.operation || 'soma');
            const color = yf.color || colors[i % colors.length];
            const isLineSeries = chartType === 'mixed' && yf.seriesType === 'line';
            return {
              type: isLineSeries ? 'line' as const : undefined,
              label: yf.field,
              data: agg.values,
              backgroundColor: isLineSeries ? color + '33' : color,
              borderColor: color,
              borderWidth: isLineSeries ? 2 : 1,
              fill: subType === 'area',
              yAxisID: yf.secondaryAxis ? 'y1' : 'y',
              tension: 0.3,
            };
          });
        }

        const chartData = { labels, datasets };

        const gridOpts = chart.showGrid !== false
          ? {}
          : { x: { grid: { display: false } }, y: { grid: { display: false } } };

        const scalesOpts = isPie ? {} : {
          scales: {
            ...gridOpts,
            x: { ...(gridOpts as any).x, stacked: subType === 'stacked' },
            y: { ...(gridOpts as any).y, stacked: subType === 'stacked', beginAtZero: true },
            ...(chart.yFields?.some(yf => yf.secondaryAxis) ? { y1: { type: 'linear' as const, position: 'right' as const, beginAtZero: true } } : {}),
          }
        };

        const options: any = {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            title: { display: !!chart.title, text: chart.title || '' },
            legend: { display: chart.showLegend !== false },
            datalabels: undefined,
          },
          ...scalesOpts,
        };

        const style: React.CSSProperties = {
          maxWidth: chart.width || '100%',
          flexBasis: chart.width || '100%',
          minWidth: 240,
          flexShrink: 0,
        };

        return (
          <div key={chart.id} style={style}>
            {chartType === 'bar' && subType !== 'horizontal' && subType !== 'stacked' && <Bar data={chartData} options={options} />}
            {chartType === 'bar' && subType === 'horizontal' && <Bar data={chartData} options={{ ...options, indexAxis: 'y' as const }} />}
            {chartType === 'bar' && subType === 'stacked' && <Bar data={chartData} options={options} />}
            {chartType === 'line' && <Line data={chartData} options={options} />}
            {chartType === 'pie' && subType !== 'donut' && <Pie data={chartData} options={options} />}
            {chartType === 'pie' && subType === 'donut' && <Doughnut data={chartData} options={options} />}
            {chartType === 'mixed' && <Bar data={chartData} options={options} />}
          </div>
        );
      })}
    </div>
  );
}

const PX_PER_MM = 3.78;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;

function PageHeader({ layout, logoUrl, alignClass }: { layout: ReportLayout; logoUrl?: string; alignClass: string }) {
  if (!layout.header.show) return null;
  return (
    <div className={`${alignClass} mb-3`} style={{ flexShrink: 0 }}>
      {layout.header.showLogo && (logoUrl || layout.header.logo) && (
        <div className={`mb-1 ${layout.header.alignment === 'center' ? 'flex justify-center' : layout.header.alignment === 'right' ? 'flex justify-end' : ''}`}>
          <img src={logoUrl || layout.header.logo} alt="Logo" style={{ maxHeight: '48px' }} />
        </div>
      )}
      {layout.header.title && <h1 className="text-xl font-bold leading-tight">{layout.header.title}</h1>}
      {layout.header.subtitle && <h3 className="text-sm text-gray-600 leading-tight">{layout.header.subtitle}</h3>}
      {layout.header.showDate && <p className="text-[10px] text-gray-400">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</p>}
    </div>
  );
}

function PageFooter({ layout, data, pageNum, totalPages }: { layout: ReportLayout; data: any[]; pageNum: number; totalPages: number }) {
  if (!layout.footer.show) return null;
  const footerTotalizerText = layout.footer.showTotals && layout.footer.totalizers && layout.footer.totalizers.length > 0
    ? computeTotalizers(data, layout.footer.totalizers, layout.columns.map(c => ({ field: c.field, label: c.label, format: c.format })))
    : layout.footer.showTotals ? `${data.length} registro(s)` : '';

  return (
    <div className="mt-auto pt-2 border-t border-gray-300 text-[10px] text-gray-500" style={{ flexShrink: 0 }}>
      <div className="flex flex-wrap justify-between items-center gap-1">
        <div>
          {footerTotalizerText && <span className="font-semibold">{footerTotalizerText}</span>}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {layout.footer.customText && <span>{layout.footer.customText}</span>}
          {layout.footer.showDateTime && <span>{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</span>}
          {layout.footer.showPageNumbers && <span>Página {pageNum} de {totalPages}</span>}
        </div>
      </div>
    </div>
  );
}

function TableHeader({ visibleCols }: { visibleCols: { field: string; label: string; align: string; width: string }[] }) {
  return (
    <thead>
      <tr>
        {visibleCols.map(col => (
          <th key={col.field} className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold text-[11px]" style={{ textAlign: col.align as any, width: col.width || 'auto' }}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

type RowItem = { type: 'data'; row: any; idx: number } | { type: 'group-header'; key: string } | { type: 'subtotal'; rows: any[]; visibleCols: any[]; totalizers: any[] };

function buildRowItems(data: any[], layout: ReportLayout): RowItem[] {
  const items: RowItem[] = [];
  if (layout.grouping) {
    const grouped = groupData(data, layout.grouping.fields);
    let idx = 0;
    for (const [key, rows] of Object.entries(grouped)) {
      items.push({ type: 'group-header', key });
      for (const row of rows as any[]) {
        items.push({ type: 'data', row, idx: idx++ });
      }
      if (layout.grouping.showSubtotals) {
        items.push({ type: 'subtotal', rows: rows as any[], visibleCols: layout.columns.filter(c => c.visible), totalizers: layout.grouping!.totalizers || [] });
      }
    }
  } else {
    data.forEach((row, idx) => items.push({ type: 'data', row, idx }));
  }
  return items;
}

function calcPageMetrics(layout: ReportLayout) {
  const margins = layout.general.margins;
  const marginTopPx = margins.top * PX_PER_MM;
  const marginBottomPx = margins.bottom * PX_PER_MM;
  const usableHeightPx = A4_HEIGHT_MM * PX_PER_MM - marginTopPx - marginBottomPx;

  const headerH = layout.header.show ? (layout.header.showLogo ? 72 : 48) : 0;
  const footerH = layout.footer.show ? 32 : 0;
  const tableHeaderH = 28;
  const fontSize = layout.general.fontSize || 12;
  const rowH = Math.max(fontSize * 1.4 + 8, 22);

  const bodyH = usableHeightPx - headerH - footerH - tableHeaderH;
  const rowsPerPage = Math.max(3, Math.floor(bodyH / rowH));

  return {
    pageWidthMm: A4_WIDTH_MM,
    pageHeightMm: A4_HEIGHT_MM,
    marginTopPx,
    marginBottomPx,
    marginLeftPx: margins.left * PX_PER_MM,
    marginRightPx: margins.right * PX_PER_MM,
    rowsPerPage,
    rowH,
  };
}

export default function ReportRenderer({ data, layout, charts, subreportsData, contentMode, logoUrl }: ReportRendererProps) {
  const visibleCols = layout.columns.filter(c => c.visible);
  const showCharts = contentMode === 'charts' || contentMode === 'both';
  const showData = contentMode === 'data' || contentMode === 'both';
  const alignClass = layout.header.alignment === 'left' ? 'text-left' : layout.header.alignment === 'right' ? 'text-right' : 'text-center';

  const metrics = calcPageMetrics(layout);
  const rowItems = showData && visibleCols.length > 0 ? buildRowItems(data, layout) : [];

  const pages: RowItem[][] = [];
  if (rowItems.length > 0) {
    let current: RowItem[] = [];
    let count = 0;
    for (const item of rowItems) {
      const cost = item.type === 'data' ? 1 : item.type === 'group-header' ? 1 : 1;
      if (count + cost > metrics.rowsPerPage && current.length > 0) {
        pages.push(current);
        current = [];
        count = 0;
      }
      current.push(item);
      count += cost;
    }
    if (current.length > 0) pages.push(current);
  }

  const chartsBeforeCount = charts.filter(c => c.position === 'before').length;
  const chartsAfterCount = charts.filter(c => c.position !== 'before').length;
  const hasChartsBefore = showCharts && chartsBeforeCount > 0;
  const hasChartsAfter = showCharts && chartsAfterCount > 0;
  const hasSubreports = subreportsData.length > 0;

  const hasAnyContent = pages.length > 0 || hasChartsBefore || hasChartsAfter || hasSubreports;
  let totalPages = pages.length;
  if (hasChartsBefore) totalPages++;
  if (hasChartsAfter || hasSubreports) totalPages++;
  if (!hasAnyContent) totalPages = 1;

  const pageStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: `${metrics.pageWidthMm}mm`,
    boxSizing: 'border-box',
    minHeight: `${metrics.pageHeightMm}mm`,
    padding: `${layout.general.margins.top}mm ${layout.general.margins.right}mm ${layout.general.margins.bottom}mm ${layout.general.margins.left}mm`,
    fontFamily: layout.general.fontFamily,
    fontSize: layout.general.fontSize + 'px',
    background: '#fff',
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
  };

  let pageCounter = 0;

  const renderPage = (content: React.ReactNode, key: string) => {
    pageCounter++;
    const num = pageCounter;
    return (
      <div key={key} className="report-page" style={pageStyle}>
        <PageHeader layout={layout} logoUrl={logoUrl} alignClass={alignClass} />
        <div style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
          {content}
        </div>
        <PageFooter layout={layout} data={data} pageNum={num} totalPages={totalPages} />
      </div>
    );
  };

  const renderDataRow = (item: RowItem, visibleCols: any[], zebra: boolean) => {
    if (item.type === 'group-header') {
      return (
        <tr key={`gh-${item.key}`}>
          <td colSpan={visibleCols.length} className="border border-gray-300 px-2 py-1 bg-indigo-50 font-bold text-[11px]">
            {item.key}
          </td>
        </tr>
      );
    }
    if (item.type === 'subtotal') {
      return (
        <tr key={`st-${Math.random()}`} className="bg-indigo-50/50">
          <td className="border border-gray-300 px-2 py-0.5 font-semibold text-[10px] italic text-right" colSpan={1}>
            Subtotal:
          </td>
          {item.visibleCols.slice(1).map((col: any) => {
            const subtotalizer = item.totalizers.find((t: any) => t.field === col.field);
            if (!subtotalizer) return <td key={col.field} className="border border-gray-300 px-2 py-0.5 text-[10px]" style={{ textAlign: col.align }} />;
            const subtotalText = computeTotalizers(item.rows, [subtotalizer], [{ field: col.field, label: col.label, format: col.format }]);
            const valueOnly = subtotalText.includes(': ') ? subtotalText.split(': ').slice(1).join(': ') : subtotalText;
            return <td key={col.field} className="border border-gray-300 px-2 py-0.5 text-[10px] font-semibold" style={{ textAlign: col.align }}>{valueOnly}</td>;
          })}
        </tr>
      );
    }
    return (
      <tr key={`r-${item.idx}`} className={zebra && item.idx % 2 === 1 ? 'bg-gray-50' : ''}>
        {visibleCols.map((col: any) => (
          <td key={col.field} className="border border-gray-300 px-2 py-0.5 text-[11px]" style={{ textAlign: col.align }}>
            {applyFormat(item.row[col.field], col.format)}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <style>{`
        @media print {
          .report-page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
          .report-page:last-child { page-break-after: avoid; }
        }
      `}</style>

      {hasChartsBefore && renderPage(
        <RenderCharts charts={charts} data={data} position="before" />,
        'charts-before'
      )}

      {pages.map((pageItems, pi) => renderPage(
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: layout.general.fontSize + 'px' }}>
            <TableHeader visibleCols={visibleCols} />
            <tbody>
              {pageItems.map(item => renderDataRow(item, visibleCols, layout.general.zebra))}
            </tbody>
          </table>
        </div>,
        `data-page-${pi}`
      ))}

      {(hasChartsAfter || hasSubreports) && renderPage(
        <>
          {hasChartsAfter && <RenderCharts charts={charts} data={data} position="after" />}
          {subreportsData.map(sr => (
            <div key={sr.config.id} className="mt-4">
              <h3 className="text-sm font-bold mb-1">{sr.config.title}</h3>
              {sr.data.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">Nenhum dado disponível.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {sr.config.columns.map(col => (
                          <th key={col.field} className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold text-[10px] text-left">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sr.data.map((row, i) => (
                        <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                          {sr.config.columns.map(col => (
                            <td key={col.field} className="border border-gray-300 px-2 py-0.5 text-[10px]">
                              {applyFormat(row[col.field], (col as any).format)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {Boolean(sr.config.totalizers?.length) && (
                      <tfoot>
                        <tr>
                          <td
                            colSpan={sr.config.columns.length}
                            className="border border-gray-300 px-2 py-1 text-[10px] font-bold bg-gray-100"
                          >
                            {computeTotalizers(sr.data, sr.config.totalizers, sr.config.columns)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          ))}
        </>,
        'charts-after-subreports'
      )}

      {!hasAnyContent && renderPage(
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Nenhum dado para exibir.
        </div>,
        'empty'
      )}
    </div>
  );
}
