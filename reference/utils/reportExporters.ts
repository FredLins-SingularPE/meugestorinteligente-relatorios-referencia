import type { ReportLayout, ChartConfig, SubreportConfig, ColumnFormat } from '../components/relatorios/report-builder/types';

type ExportedChartImage = { title: string; position: string; src: string };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(value: unknown): string {
  const replacements: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return String(value ?? '').replace(/[&<>"']/g, char => replacements[char]);
}

function aggregateForExport(data: any[], xField: string, yField: string, operation: string) {
  const valuesByLabel = new Map<string, number[]>();
  for (const row of data) {
    const label = String(row[xField] ?? '');
    if (!valuesByLabel.has(label)) valuesByLabel.set(label, []);
    valuesByLabel.get(label)!.push(parseFloat(String(row[yField] ?? 0)) || 0);
  }
  const entries = Array.from(valuesByLabel, ([label, values]) => {
    const total = values.reduce((sum, value) => sum + value, 0);
    const value = operation === 'contagem'
      ? values.length
      : operation === 'media' ? (values.length ? total / values.length : 0) : total;
    return { label, value };
  });
  entries.sort((a, b) => b.value - a.value);
  return entries;
}

function buildChartExport(chart: ChartConfig, data: any[]) {
  const yFields = chart.type === 'pie' ? chart.yFields.slice(0, 1) : chart.yFields;
  if (!chart.xField || yFields.length === 0) return null;
  const aggregates = yFields.map(field => ({
    field,
    entries: aggregateForExport(data, chart.xField, field.field, field.operation || 'soma'),
  }));
  const labels = aggregates[0].entries.map(entry => entry.label);
  const lookup = aggregates.map(({ entries }) => new Map(entries.map(entry => [entry.label, entry.value])));
  return {
    title: chart.title || 'Gráfico',
    columns: [chart.xField, ...yFields.map(field => field.field)],
    rows: labels.map(label => [label, ...lookup.map(values => values.get(label) ?? 0)]),
    position: chart.position,
  };
}

function formatValue(value: any, format?: ColumnFormat | string): string {
  if (value == null) return '';
  const str = String(value);
  if (!format || format === 'text') return str;
  switch (format) {
    case 'currency_brl':
    case 'currency': {
      const num = parseFloat(str);
      if (isNaN(num)) return str;
      return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    case 'date': {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleDateString('pt-BR');
    }
    case 'datetime': {
      const d = new Date(str);
      if (isNaN(d.getTime())) return str;
      return d.toLocaleString('pt-BR');
    }
    case 'cpf_cnpj': {
      const digits = str.replace(/\D/g, '');
      if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      return str;
    }
    case 'percent': {
      const n = parseFloat(str);
      if (isNaN(n)) return str;
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    }
    case 'number': {
      const n2 = parseFloat(str);
      if (isNaN(n2)) return str;
      return n2.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    default:
      return str;
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

function summarizeRows(
  rows: any[],
  totalizers: { field: string; operation: string }[] | undefined,
  columns: { field: string; label: string; format?: ColumnFormat | string }[],
): string {
  if (!totalizers?.length) return `${rows.length} registro(s)`;
  const parts: string[] = [];
  for (const totalizer of totalizers) {
    const column = columns.find(item => item.field === totalizer.field);
    const label = column?.label || totalizer.field;
    const operation = totalizer.operation;
    if (operation === 'contagem' || operation === 'count') {
      parts.push(`${label}: ${rows.length}`);
      continue;
    }
    const values = rows.map(row => Number(row[totalizer.field])).filter(Number.isFinite);
    let value: number | undefined;
    if (operation === 'soma' || operation === 'sum') {
      value = values.reduce((sum, item) => sum + item, 0);
    } else if (operation === 'media' || operation === 'avg') {
      value = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
    } else if (operation === 'maximo' || operation === 'max') {
      value = values.length ? Math.max(...values) : 0;
    } else if (operation === 'minimo' || operation === 'min') {
      value = values.length ? Math.min(...values) : 0;
    }
    if (value !== undefined) {
      const defaultFormat = operation === 'soma' || operation === 'sum' ? 'currency_brl' : 'number';
      parts.push(`${label}: ${formatValue(value, column?.format || defaultFormat)}`);
    }
  }
  return parts.length ? parts.join(' | ') : `${rows.length} registro(s)`;
}

function buildHTMLTable(data: any[], layout: ReportLayout): string {
  const visibleCols = layout.columns.filter(c => c.visible);
  let html = '<table style="width:100%;border-collapse:collapse;font-family:' + escapeHtml(layout.general.fontFamily) + ';font-size:' + Number(layout.general.fontSize) + 'px;">';
  html += '<thead><tr>';
  for (const col of visibleCols) {
    html += '<th style="border:1px solid #ccc;padding:6px 8px;background:#f0f0f0;font-weight:bold;text-align:' + escapeHtml(col.align) + ';">' + escapeHtml(col.label) + '</th>';
  }
  html += '</tr></thead><tbody>';

  const grouped = layout.grouping ? groupData(data, layout.grouping.fields) : null;

  if (grouped) {
    for (const [groupKey, rows] of Object.entries(grouped)) {
      html += '<tr><td colspan="' + visibleCols.length + '" style="border:1px solid #ccc;padding:6px 8px;background:#e0e7ff;font-weight:bold;">' + escapeHtml(groupKey) + '</td></tr>';
      for (let i = 0; i < (rows as any[]).length; i++) {
        const row = (rows as any[])[i];
        const bg = layout.general.zebra && i % 2 === 1 ? 'background:#f9fafb;' : '';
        html += '<tr style="' + bg + '">';
        for (const col of visibleCols) {
          html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:' + escapeHtml(col.align) + ';">' + escapeHtml(formatValue(row[col.field], col.format)) + '</td>';
        }
        html += '</tr>';
      }
      if (layout.grouping!.showSubtotals) {
        const subtotal = summarizeRows(rows as any[], layout.grouping!.totalizers, visibleCols);
        html += '<tr style="background:#f0f4ff;font-weight:bold;"><td colspan="' + visibleCols.length + '" style="border:1px solid #ccc;padding:4px 8px;">' + escapeHtml(subtotal) + '</td></tr>';
      }
    }
  } else {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const bg = layout.general.zebra && i % 2 === 1 ? 'background:#f9fafb;' : '';
      html += '<tr style="' + bg + '">';
      for (const col of visibleCols) {
        html += '<td style="border:1px solid #ccc;padding:4px 8px;text-align:' + escapeHtml(col.align) + ';">' + escapeHtml(formatValue(row[col.field], col.format)) + '</td>';
      }
      html += '</tr>';
    }
  }

  html += '</tbody>';
  if (layout.footer.showTotals) {
    html += '<tfoot><tr style="font-weight:bold;background:#e8e8e8;"><td colspan="' + visibleCols.length + '" style="border:1px solid #ccc;padding:6px 8px;">' +
      escapeHtml(summarizeRows(data, layout.footer.totalizers, visibleCols)) + '</td></tr></tfoot>';
  }
  html += '</table>';
  return html;
}

function buildFullHTML(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both', chartImages: ExportedChartImage[] = []): string {
  let html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + escapeHtml(layout.header.title || 'Relatório') + '</title>';
  html += '<style>body{font-family:' + escapeHtml(layout.general.fontFamily) + ';font-size:' + Number(layout.general.fontSize) + 'px;margin:20px;} @media print{body{margin:0;}}</style></head><body>';

  if (layout.header.show) {
    const align = layout.header.alignment || 'center';
    html += '<div style="text-align:' + align + ';margin-bottom:20px;">';
    if (layout.header.showLogo && layout.header.logo) html += '<img src="' + escapeHtml(layout.header.logo) + '" style="max-height:60px;margin-bottom:8px;" />';
    if (layout.header.title) html += '<h1 style="margin:0;">' + escapeHtml(layout.header.title) + '</h1>';
    if (layout.header.subtitle) html += '<h3 style="margin:4px 0;color:#666;">' + escapeHtml(layout.header.subtitle) + '</h3>';
    if (layout.header.showDate) html += '<p style="color:#999;font-size:0.85em;">' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR') + '</p>';
    html += '</div>';
  }

  const chartExports = contentMode === 'data' ? [] : charts.map(chart => buildChartExport(chart, data)).filter(Boolean);
  const beforeCharts = chartExports.filter(chart => chart!.position === 'before');
  const afterCharts = chartExports.filter(chart => chart!.position !== 'before');
  const imageHtml = (position: 'before' | 'after') => chartImages
    .filter(image => (position === 'before' ? image.position === 'before' : image.position !== 'before'))
    .map(image => `<figure style="margin:16px 0;text-align:center"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.title)}" style="max-width:100%;height:auto"><figcaption>${escapeHtml(image.title)}</figcaption></figure>`)
    .join('');
  const chartHtml = (items: typeof chartExports) => items.map(chart => {
    if (!chart) return '';
    return `<section style="margin:20px 0"><h3>${escapeHtml(chart.title)}</h3><table style="width:100%;border-collapse:collapse"><thead><tr>${chart.columns.map(column => `<th style="border:1px solid #ccc;padding:6px;background:#f0f0f0">${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${chart.rows.map(row => `<tr>${row.map(value => `<td style="border:1px solid #ccc;padding:4px 8px">${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>`;
  }).join('');
  html += imageHtml('before') + chartHtml(beforeCharts);
  if (contentMode !== 'charts') html += buildHTMLTable(data, layout);
  html += imageHtml('after') + chartHtml(afterCharts);

  if (subreportsData.length > 0) {
    for (const sr of subreportsData) {
      html += '<div style="margin-top:24px;">';
      html += '<h3>' + escapeHtml(sr.config.title) + '</h3>';
      const srCols = sr.config.columns;
      html += '<table style="width:100%;border-collapse:collapse;">';
      html += '<thead><tr>';
      for (const col of srCols) {
        html += '<th style="border:1px solid #ccc;padding:6px 8px;background:#f0f0f0;font-weight:bold;">' + escapeHtml(col.label) + '</th>';
      }
      html += '</tr></thead><tbody>';
      for (const row of sr.data) {
        html += '<tr>';
        for (const col of srCols) {
          html += '<td style="border:1px solid #ccc;padding:4px 8px;">' + escapeHtml(formatValue(row[col.field], col.format)) + '</td>';
        }
        html += '</tr>';
      }
      html += '</tbody>';
      if (sr.config.totalizers?.length) {
        html += '<tfoot><tr><td colspan="' + srCols.length + '" style="border:1px solid #ccc;padding:6px 8px;font-weight:bold;background:#f0f0f0;">' +
          escapeHtml(summarizeRows(sr.data, sr.config.totalizers, srCols)) + '</td></tr></tfoot>';
      }
      html += '</table></div>';
    }
  }

  if (layout.footer.show) {
    html += '<div style="margin-top:20px;border-top:1px solid #ccc;padding-top:10px;font-size:0.85em;color:#666;display:flex;justify-content:space-between;">';
    if (layout.footer.customText) html += '<span>' + escapeHtml(layout.footer.customText) + '</span>';
    if (layout.footer.showDateTime) html += '<span>' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR') + '</span>';
    html += '</div>';
  }

  html += '</body></html>';
  return html;
}

export function exportToPrint(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both' = 'both', chartImages: ExportedChartImage[] = []) {
  const html = buildFullHTML(data, layout, charts, subreportsData, contentMode, chartImages);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

export async function exportToPDF(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both' = 'both', chartImages: ExportedChartImage[] = []) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const pdfFonts = pdfFontsModule.default || pdfFontsModule;
  if (pdfFonts.pdfMake) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
  }

  const visibleCols = layout.columns.filter(c => c.visible);
  const content: any[] = [];

  if (layout.header.show) {
    if (layout.header.title) content.push({ text: layout.header.title, style: 'header', alignment: layout.header.alignment || 'center' });
    if (layout.header.subtitle) content.push({ text: layout.header.subtitle, style: 'subheader', alignment: layout.header.alignment || 'center' });
    if (layout.header.showDate) content.push({ text: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR'), alignment: 'center', color: '#999', margin: [0, 0, 0, 10] });
  }

  const addChartsAtPosition = (position: 'before' | 'after') => {
    for (const chart of charts.filter(item => position === 'before' ? item.position === 'before' : item.position !== 'before')) {
      const summary = buildChartExport(chart, data);
      if (!summary) continue;
      content.push({ text: summary.title, style: 'subheader', margin: [0, 15, 0, 5] });
      content.push({
        table: {
          headerRows: 1,
          widths: summary.columns.map(() => '*'),
          body: [
            summary.columns.map(column => ({ text: column, bold: true, fillColor: '#e0e0e0' })),
            ...summary.rows.map(row => row.map(value => ({ text: String(value ?? '') }))),
          ],
        },
        layout: 'lightHorizontalLines',
      });
    }
    for (const image of chartImages.filter(item => position === 'before' ? item.position === 'before' : item.position !== 'before')) {
      content.push({ image: image.src, width: 480, margin: [0, 10, 0, 4] });
      content.push({ text: image.title, fontSize: 9, alignment: 'center', margin: [0, 0, 0, 8] });
    }
  };

  if (contentMode !== 'data') addChartsAtPosition('before');

  if (contentMode !== 'charts' && visibleCols.length > 0 && data.length > 0) {
    const tableBody: any[][] = [];
    tableBody.push(visibleCols.map(c => ({ text: c.label, bold: true, fillColor: '#e0e0e0', alignment: c.align })));

    const grouped = layout.grouping ? groupData(data, layout.grouping.fields) : null;

    if (grouped) {
      for (const [groupKey, rows] of Object.entries(grouped)) {
        tableBody.push([{ text: groupKey, colSpan: visibleCols.length, bold: true, fillColor: '#e0e7ff' }, ...Array(visibleCols.length - 1).fill({})]);
        for (let i = 0; i < (rows as any[]).length; i++) {
          const row = (rows as any[])[i];
          const fillColor = layout.general.zebra && i % 2 === 1 ? '#f9fafb' : undefined;
          tableBody.push(visibleCols.map(c => ({ text: formatValue(row[c.field], c.format), alignment: c.align, fillColor })));
        }
        if (layout.grouping!.showSubtotals) {
          tableBody.push([{ text: summarizeRows(rows as any[], layout.grouping!.totalizers, visibleCols), colSpan: visibleCols.length, bold: true, fillColor: '#f0f4ff' }, ...Array(visibleCols.length - 1).fill({})]);
        }
      }
    } else {
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const fillColor = layout.general.zebra && i % 2 === 1 ? '#f9fafb' : undefined;
        tableBody.push(visibleCols.map(c => ({ text: formatValue(row[c.field], c.format), alignment: c.align, fillColor })));
      }
    }

    if (layout.footer.showTotals) {
      tableBody.push([{ text: summarizeRows(data, layout.footer.totalizers, visibleCols), colSpan: visibleCols.length, bold: true, fillColor: '#e8e8e8' }, ...Array(visibleCols.length - 1).fill({})]);
    }

    content.push({
      table: { headerRows: 1, widths: visibleCols.map(() => '*'), body: tableBody },
      layout: 'lightHorizontalLines',
    });
  }

  if (contentMode !== 'data') addChartsAtPosition('after');

  for (const sr of subreportsData) {
    content.push({ text: sr.config.title, style: 'subheader', margin: [0, 15, 0, 5] });
    const srCols = sr.config.columns;
    if (srCols.length > 0 && sr.data.length > 0) {
      const srBody: any[][] = [];
      srBody.push(srCols.map(c => ({ text: c.label, bold: true, fillColor: '#e0e0e0' })));
      for (const row of sr.data) {
        srBody.push(srCols.map(c => ({ text: formatValue(row[c.field], c.format) })));
      }
      if (sr.config.totalizers?.length) {
        srBody.push([
          { text: summarizeRows(sr.data, sr.config.totalizers, srCols), colSpan: srCols.length, bold: true, fillColor: '#f0f0f0' },
          ...Array(srCols.length - 1).fill({}),
        ]);
      }
      content.push({
        table: { headerRows: 1, widths: srCols.map(() => '*'), body: srBody },
        layout: 'lightHorizontalLines',
      });
    }
  }

  const docDefinition: any = {
    pageSize: layout.general.pageSize,
    pageOrientation: layout.general.orientation,
    pageMargins: [layout.general.margins.left, layout.general.margins.top, layout.general.margins.right, layout.general.margins.bottom],
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 5] },
      subheader: { fontSize: 14, bold: true, color: '#555', margin: [0, 0, 0, 5] },
    },
    defaultStyle: { fontSize: layout.general.fontSize, font: 'Roboto' },
    footer: (currentPage: number, pageCount: number) => {
      const items: any[] = [];
      if (layout.footer.showPageNumbers) items.push({ text: 'Página ' + currentPage + ' de ' + pageCount, alignment: 'center', fontSize: 9, color: '#999' });
      if (layout.footer.customText) items.push({ text: layout.footer.customText, alignment: 'center', fontSize: 9, color: '#999' });
      return { stack: items, margin: [20, 0] };
    },
  };

  pdfMake.createPdf(docDefinition).download((layout.header.title || 'relatorio') + '.pdf');
}

export async function exportToExcel(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both' = 'both') {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Relatório');

  const visibleCols = contentMode === 'charts' ? [] : layout.columns.filter(c => c.visible);

  const headerRow = visibleCols.length ? sheet.addRow(visibleCols.map(c => c.label)) : null;
  headerRow?.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin' } };
  });

  const grouped = contentMode !== 'charts' && layout.grouping ? groupData(data, layout.grouping.fields) : null;

  if (grouped) {
    for (const [groupKey, rows] of Object.entries(grouped)) {
      const gr = sheet.addRow([groupKey]);
      gr.font = { bold: true };
      gr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
      if (visibleCols.length > 1) sheet.mergeCells(gr.number, 1, gr.number, visibleCols.length);

      for (const row of (rows as any[])) {
        sheet.addRow(visibleCols.map(c => formatValue(row[c.field], c.format)));
      }

      if (layout.grouping!.showSubtotals) {
        const sr = sheet.addRow([summarizeRows(rows as any[], layout.grouping!.totalizers, visibleCols)]);
        sr.font = { bold: true, italic: true };
        if (visibleCols.length > 1) sheet.mergeCells(sr.number, 1, sr.number, visibleCols.length);
      }
    }
  } else if (contentMode !== 'charts') {
    for (const row of data) {
      sheet.addRow(visibleCols.map(c => formatValue(row[c.field], c.format)));
    }
  }

  if (contentMode !== 'data') {
    const sheetNames = new Set<string>();
    let chartIndex = 0;
    for (const chart of charts) {
      const summary = buildChartExport(chart, data);
      if (!summary) continue;
      chartIndex += 1;
      const baseName = summary.title.replace(/[\\/*?:[\]]/g, ' ').trim().substring(0, 25) || 'Gráfico';
      let sheetName = `${baseName} ${chartIndex}`.substring(0, 31);
      while (sheetNames.has(sheetName)) sheetName = `${baseName.substring(0, 20)} ${++chartIndex}`.substring(0, 31);
      sheetNames.add(sheetName);
      const chartSheet = workbook.addWorksheet(sheetName);
      chartSheet.addRow(summary.columns);
      for (const row of summary.rows) chartSheet.addRow(row);
      summary.columns.forEach((_, index) => { chartSheet.getColumn(index + 1).width = 22; });
    }
  }

  if (contentMode !== 'charts' && layout.footer.showTotals) {
    const totalRow = sheet.addRow([summarizeRows(data, layout.footer.totalizers, visibleCols)]);
    totalRow.font = { bold: true };
    if (visibleCols.length > 1) sheet.mergeCells(totalRow.number, 1, totalRow.number, visibleCols.length);
  }

  visibleCols.forEach((_, i) => {
    const col = sheet.getColumn(i + 1);
    let maxLen = visibleCols[i].label.length;
    col.eachCell({ includeEmpty: false }, cell => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 4, 50);
  });

  const usedWorksheetNames = new Set(workbook.worksheets.map(item => item.name.toLocaleLowerCase()));
  for (const sr of subreportsData) {
    const baseName = sr.config.title.replace(/[\\/*?:[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Subrelatório';
    let sheetName = baseName;
    let suffix = 2;
    while (usedWorksheetNames.has(sheetName.toLocaleLowerCase())) {
      const suffixText = ` ${suffix++}`;
      sheetName = `${baseName.slice(0, 31 - suffixText.length)}${suffixText}`;
    }
    usedWorksheetNames.add(sheetName.toLocaleLowerCase());
    const srSheet = workbook.addWorksheet(sheetName);
    const srCols = sr.config.columns;
    const srHeader = srSheet.addRow(srCols.map(c => c.label));
    srHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    });
    for (const row of sr.data) {
      srSheet.addRow(srCols.map(c => formatValue(row[c.field], c.format)));
    }
    if (sr.config.totalizers?.length && srCols.length) {
      const totalRow = srSheet.addRow([summarizeRows(sr.data, sr.config.totalizers, srCols)]);
      totalRow.font = { bold: true };
      if (srCols.length > 1) srSheet.mergeCells(totalRow.number, 1, totalRow.number, srCols.length);
    }
    srCols.forEach((_, i) => {
      const col = srSheet.getColumn(i + 1);
      let maxLen = srCols[i].label.length;
      col.eachCell({ includeEmpty: false }, cell => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 4, 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, (layout.header.title || 'relatorio') + '.xlsx');
}

export function exportToWord(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both' = 'both', chartImages: ExportedChartImage[] = []) {
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
  html += '<head><meta charset="utf-8"><style>';
  html += 'body{font-family:' + escapeHtml(layout.general.fontFamily) + ';font-size:' + Number(layout.general.fontSize) + 'pt;}';
  html += 'table{border-collapse:collapse;width:100%;}';
  html += 'th,td{border:1px solid #999;padding:4px 8px;}';
  html += 'th{background:#d0d0d0;font-weight:bold;}';
  html += '@page{size:' + escapeHtml(layout.general.pageSize) + ' ' + escapeHtml(layout.general.orientation) + ';}';
  html += '</style></head><body>';

  if (layout.header.show) {
    const align = layout.header.alignment || 'center';
    if (layout.header.title) html += '<h1 style="text-align:' + escapeHtml(align) + ';">' + escapeHtml(layout.header.title) + '</h1>';
    if (layout.header.subtitle) html += '<h3 style="text-align:' + escapeHtml(align) + ';color:#555;">' + escapeHtml(layout.header.subtitle) + '</h3>';
    if (layout.header.showDate) html += '<p style="text-align:' + escapeHtml(align) + ';color:#999;">' + new Date().toLocaleDateString('pt-BR') + '</p>';
  }

  if (contentMode !== 'charts') html += buildHTMLTable(data, layout);

  if (contentMode !== 'data') {
    for (const image of chartImages) {
      html += `<figure style="margin:16px 0;text-align:center"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.title)}" style="max-width:100%;height:auto"><figcaption>${escapeHtml(image.title)}</figcaption></figure>`;
    }
    for (const chart of charts) {
      const summary = buildChartExport(chart, data);
      if (!summary) continue;
      html += `<h3 style="margin-top:20px;">${escapeHtml(summary.title)}</h3><table><thead><tr>${summary.columns.map(column => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${summary.rows.map(row => `<tr>${row.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
  }

  for (const sr of subreportsData) {
    html += '<h3 style="margin-top:20px;">' + escapeHtml(sr.config.title) + '</h3>';
    const srCols = sr.config.columns;
    html += '<table><thead><tr>';
    for (const col of srCols) html += '<th>' + escapeHtml(col.label) + '</th>';
    html += '</tr></thead><tbody>';
    for (const row of sr.data) {
      html += '<tr>';
      for (const col of srCols) html += '<td>' + escapeHtml(formatValue(row[col.field], col.format)) + '</td>';
      html += '</tr>';
    }
    html += '</tbody>';
    if (sr.config.totalizers?.length) {
      html += '<tfoot><tr><td colspan="' + srCols.length + '">' +
        escapeHtml(summarizeRows(sr.data, sr.config.totalizers, srCols)) + '</td></tr></tfoot>';
    }
    html += '</table>';
  }

  if (layout.footer.show && layout.footer.customText) {
    html += '<p style="margin-top:20px;color:#666;">' + escapeHtml(layout.footer.customText) + '</p>';
  }

  html += '</body></html>';

  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  triggerDownload(blob, (layout.header.title || 'relatorio') + '.doc');
}

export function exportToCSV(data: any[], layout: ReportLayout, charts: ChartConfig[] = [], subreportsData: { config: SubreportConfig; data: any[] }[] = [], contentMode: 'data' | 'charts' | 'both' = 'both') {
  const visibleCols = contentMode === 'charts' ? [] : layout.columns.filter(c => c.visible);
  const lines: string[] = [];
  const pushSection = (title: string, headers: string[], rows: unknown[][]) => {
    if (lines.length) lines.push('');
    lines.push(`"${title.replace(/"/g, '""')}"`);
    lines.push(headers.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'));
    for (const row of rows) {
      lines.push(row.map(value => {
        let formatted = String(value ?? '');
        if (/^[\s]*[=+\-@\t\r]/.test(formatted)) formatted = `'${formatted}`;
        return `"${formatted.replace(/"/g, '""')}"`;
      }).join(';'));
    }
  };
  if (contentMode !== 'charts') {
    const rows = data.map(row => visibleCols.map(column => formatValue(row[column.field], column.format)));
    if (layout.footer.showTotals && visibleCols.length) {
      rows.push([summarizeRows(data, layout.footer.totalizers, visibleCols), ...Array(visibleCols.length - 1).fill('')]);
    }
    pushSection(layout.header.title || 'Relatório',
      visibleCols.map(column => column.label),
      rows);
  }
  if (contentMode !== 'data') {
    for (const chart of charts) {
      const summary = buildChartExport(chart, data);
      if (summary) pushSection(summary.title, summary.columns, summary.rows);
    }
  }
  for (const subreport of subreportsData) {
    const rows = subreport.data.map(row => subreport.config.columns.map(column => formatValue(row[column.field], column.format)));
    if (subreport.config.totalizers?.length && subreport.config.columns.length) {
      rows.push([summarizeRows(subreport.data, subreport.config.totalizers, subreport.config.columns), ...Array(subreport.config.columns.length - 1).fill('')]);
    }
    pushSection(subreport.config.title, subreport.config.columns.map(column => column.label),
      rows);
  }
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, (layout.header.title || 'relatorio') + '.csv');
}

export function exportToHTML(data: any[], layout: ReportLayout, charts: ChartConfig[], subreportsData: { config: SubreportConfig; data: any[] }[], contentMode: 'data' | 'charts' | 'both' = 'both', chartImages: ExportedChartImage[] = []) {
  const html = buildFullHTML(data, layout, charts, subreportsData, contentMode, chartImages);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  triggerDownload(blob, (layout.header.title || 'relatorio') + '.html');
}
