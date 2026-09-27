import React, { useRef } from 'react';
import { ReportLayout, ColumnDef, TotalizerConfig, AGGREGATION_OPTIONS, AggregationOp } from './types';

interface HeaderConfigProps {
  header: ReportLayout['header'];
  onChange: (header: ReportLayout['header']) => void;
}

export const HeaderConfig: React.FC<HeaderConfigProps> = ({ header, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onChange({ ...header, logo: reader.result as string, showLogo: true });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
        <input
          type="text"
          value={header.title}
          onChange={(e) => onChange({ ...header, title: e.target.value })}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
          placeholder="Título do relatório"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Subtítulo</label>
        <input
          type="text"
          value={header.subtitle}
          onChange={(e) => onChange({ ...header, subtitle: e.target.value })}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
          placeholder="Subtítulo opcional"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Logotipo</label>
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={header.logo}
              onChange={(e) => onChange({ ...header, logo: e.target.value })}
              className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              placeholder="URL da imagem ou clique para fazer upload"
            />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-moss-600 hover:text-moss-800 underline"
            >
              Fazer upload de arquivo
            </button>
          </div>
          {header.logo && (
            <div className="w-16 h-16 border border-gray-200 rounded overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
              <img src={header.logo} alt="Logo preview" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Alinhamento</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => onChange({ ...header, alignment: align })}
              className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                header.alignment === align
                  ? 'bg-moss-100 border-moss-400 text-moss-800 font-medium'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FooterConfigProps {
  footer: ReportLayout['footer'];
  columns: ColumnDef[];
  onChange: (footer: ReportLayout['footer']) => void;
}

export const FooterConfig: React.FC<FooterConfigProps> = ({ footer, columns, onChange }) => {
  const numericColumns = columns.filter((c) => ['number', 'currency_brl', 'percent'].includes(c.format));

  const updateTotalizer = (field: string, operation: AggregationOp) => {
    let totalizers = [...footer.totalizers];
    const idx = totalizers.findIndex((t) => t.field === field);
    if (operation === 'nenhum') {
      totalizers = totalizers.filter((t) => t.field !== field);
    } else if (idx >= 0) {
      totalizers[idx] = { field, operation };
    } else {
      totalizers.push({ field, operation });
    }
    onChange({ ...footer, totalizers });
  };

  const getTotalizerOp = (field: string): AggregationOp => {
    return footer.totalizers.find((t: TotalizerConfig) => t.field === field)?.operation || 'nenhum';
  };

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={footer.showTotals}
          onChange={(e) => onChange({ ...footer, showTotals: e.target.checked })}
          className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
        />
        Exibir totalizadores gerais
      </label>

      {footer.showTotals && numericColumns.length > 0 && (
        <div className="ml-5 space-y-1.5">
          {numericColumns.map((col) => (
            <div key={col.field} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 truncate">{col.label || col.field}</span>
              <select
                value={getTotalizerOp(col.field)}
                onChange={(e) => updateTotalizer(col.field, e.target.value as AggregationOp)}
                className="border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                {AGGREGATION_OPTIONS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={footer.showPageNumbers}
          onChange={(e) => onChange({ ...footer, showPageNumbers: e.target.checked })}
          className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
        />
        Exibir "Página X de Y"
      </label>

      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={footer.showDateTime}
          onChange={(e) => onChange({ ...footer, showDateTime: e.target.checked })}
          className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
        />
        Exibir data/hora de geração
      </label>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Texto personalizado</label>
        <input
          type="text"
          value={footer.customText}
          onChange={(e) => onChange({ ...footer, customText: e.target.value })}
          className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
          placeholder="Texto exibido no rodapé de cada página"
        />
      </div>
    </div>
  );
};
