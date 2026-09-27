import React from 'react';
import {
  ChartConfig as ChartConfigType,
  ChartMainType,
  YFieldConfig,
  COLOR_PALETTES,
} from './types';
import ChartPreview from './ChartPreview';

interface ChartConfigProps {
  chart: ChartConfigType;
  columns: string[];
  index: number;
  total: number;
  onChange: (chart: ChartConfigType) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}

const CHART_TYPES: { value: ChartMainType; label: string }[] = [
  { value: 'bar', label: 'Barra' },
  { value: 'pie', label: 'Pizza' },
  { value: 'line', label: 'Linhas' },
  { value: 'mixed', label: 'Misto (Barra+Linha)' },
];

const SUBTYPES: Record<ChartMainType, { value: string; label: string }[]> = {
  bar: [
    { value: 'vertical', label: 'Vertical' },
    { value: 'horizontal', label: 'Horizontal' },
    { value: 'stacked', label: 'Empilhado' },
  ],
  pie: [
    { value: 'pizza', label: 'Pizza' },
    { value: 'donut', label: 'Rosca (Donut)' },
  ],
  line: [
    { value: 'line', label: 'Linha' },
    { value: 'area', label: 'Área (preenchido)' },
  ],
  mixed: [],
};

const Y_OPERATIONS: { value: string; label: string }[] = [
  { value: 'direto', label: 'Valor direto' },
  { value: 'soma', label: 'Soma' },
  { value: 'contagem', label: 'Contagem' },
  { value: 'media', label: 'Média' },
];

const ChartConfigComponent: React.FC<ChartConfigProps> = ({
  chart,
  columns,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}) => {
  const update = (partial: Partial<ChartConfigType>) => onChange({ ...chart, ...partial });

  const handleTypeChange = (type: ChartMainType) => {
    const subtypes = SUBTYPES[type];
    update({ type, subType: subtypes.length > 0 ? subtypes[0].value : '' });
  };

  const addYField = (field: string) => {
    if (chart.yFields.some((y) => y.field === field)) return;
    const colorIdx = chart.yFields.length;
    const color = chart.colors[colorIdx % chart.colors.length] || '#3B82F6';
    const newField: YFieldConfig = {
      field,
      operation: 'direto',
      color,
      seriesType: chart.type === 'mixed' ? 'bar' : undefined,
      secondaryAxis: false,
    };
    update({ yFields: [...chart.yFields, newField] });
  };

  const removeYField = (idx: number) => {
    update({ yFields: chart.yFields.filter((_, i) => i !== idx) });
  };

  const updateYField = (idx: number, partial: Partial<YFieldConfig>) => {
    const yFields = chart.yFields.map((y, i) => (i === idx ? { ...y, ...partial } : y));
    update({ yFields });
  };

  const handlePaletteChange = (palette: string) => {
    const colors = COLOR_PALETTES[palette] || COLOR_PALETTES.padrao;
    const yFields = chart.yFields.map((y, i) => ({ ...y, color: colors[i % colors.length] }));
    update({ palette, colors, yFields });
  };

  const availableYFields = columns.filter((c) => !chart.yFields.some((y) => y.field === c));

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <span className="text-sm font-medium text-gray-700 flex-1">
          Gráfico {index + 1}{chart.title ? `: ${chart.title}` : ''}
        </span>
        <button
          onClick={onRemove}
          className="p-1 rounded hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
          title="Remover gráfico"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={chart.type}
              onChange={(e) => handleTypeChange(e.target.value as ChartMainType)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              {CHART_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {SUBTYPES[chart.type].length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subtipo</label>
              <select
                value={chart.subType}
                onChange={(e) => update({ subType: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                {SUBTYPES[chart.type].map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Título do gráfico</label>
          <input
            type="text"
            value={chart.title}
            onChange={(e) => update({ title: e.target.value })}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            placeholder="Título opcional"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Eixo X (categorias)</label>
            <select
              value={chart.xField}
              onChange={(e) => update({ xField: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              <option value="">Selecione...</option>
              {columns.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Adicionar campo Y</label>
            <select
              value=""
              onChange={(e) => { if (e.target.value) addYField(e.target.value); }}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              <option value="">Selecione para adicionar...</option>
              {availableYFields.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {chart.yFields.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">Séries Y configuradas</label>
            {chart.yFields.map((yf, i) => (
              <div key={yf.field} className="flex items-center gap-2 bg-gray-50 rounded px-2 py-1.5">
                <input
                  type="color"
                  value={yf.color}
                  onChange={(e) => updateYField(i, { color: e.target.value })}
                  className="w-6 h-6 rounded border border-gray-300 cursor-pointer p-0"
                />
                <span className="text-xs text-gray-700 font-medium flex-1 truncate">{yf.field}</span>
                <select
                  value={yf.operation}
                  onChange={(e) => updateYField(i, { operation: e.target.value as YFieldConfig['operation'] })}
                  className="border border-gray-200 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-moss-500"
                >
                  {Y_OPERATIONS.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                {chart.type === 'mixed' && (
                  <>
                    <select
                      value={yf.seriesType || 'bar'}
                      onChange={(e) => updateYField(i, { seriesType: e.target.value as 'bar' | 'line' })}
                      className="border border-gray-200 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-moss-500"
                    >
                      <option value="bar">Barra</option>
                      <option value="line">Linha</option>
                    </select>
                    <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={yf.secondaryAxis || false}
                        onChange={(e) => updateYField(i, { secondaryAxis: e.target.checked })}
                        className="rounded border-gray-300 text-moss-600 focus:ring-moss-500 w-3 h-3"
                      />
                      Eixo 2
                    </label>
                  </>
                )}
                <button
                  onClick={() => removeYField(i)}
                  className="p-0.5 rounded hover:bg-red-100 text-red-400 hover:text-red-600"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paleta de cores</label>
            <select
              value={chart.palette}
              onChange={(e) => handlePaletteChange(e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              {Object.keys(COLOR_PALETTES).map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
            <div className="flex gap-0.5 mt-1">
              {(COLOR_PALETTES[chart.palette] || COLOR_PALETTES.padrao).slice(0, 8).map((c, i) => (
                <div key={i} className="w-4 h-4 rounded-sm" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Posição</label>
            <select
              value={chart.position}
              onChange={(e) => update({ position: e.target.value as ChartConfigType['position'] })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              <option value="before">Antes dos dados</option>
              <option value="after">Após os dados</option>
              <option value="between">Entre seções</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Largura</label>
            <select
              value={chart.width}
              onChange={(e) => update({ width: e.target.value as '100%' | '50%' })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
            >
              <option value="100%">100%</option>
              <option value="50%">50%</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={chart.showLegend}
              onChange={(e) => update({ showLegend: e.target.checked })}
              className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
            />
            Legenda
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={chart.showDataLabels}
              onChange={(e) => update({ showDataLabels: e.target.checked })}
              className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
            />
            Rótulos de dados
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={chart.showGrid}
              onChange={(e) => update({ showGrid: e.target.checked })}
              className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
            />
            Grade
          </label>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <label className="block text-xs font-medium text-gray-500 mb-2">Preview</label>
          <ChartPreview chart={chart} columns={columns} />
        </div>
      </div>
    </div>
  );
};

export default ChartConfigComponent;
