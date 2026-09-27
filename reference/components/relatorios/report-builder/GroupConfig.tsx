import React from 'react';
import { ColumnDef, TotalizerConfig, AGGREGATION_OPTIONS, AggregationOp } from './types';

interface GroupConfigProps {
  grouping: {
    fields: string[];
    headerTemplate: string;
    showSubtotals: boolean;
    totalizers: TotalizerConfig[];
  } | null;
  columns: ColumnDef[];
  onChange: (grouping: GroupConfigProps['grouping']) => void;
}

const GroupConfig: React.FC<GroupConfigProps> = ({ grouping, columns, onChange }) => {
  const numericColumns = columns.filter((c) => ['number', 'currency_brl', 'percent'].includes(c.format));
  const availableFields = columns.map((c) => c.field);

  const ensureGrouping = () => {
    if (!grouping) {
      return { fields: [], headerTemplate: '', showSubtotals: false, totalizers: [] };
    }
    return grouping;
  };

  const toggleGroupField = (field: string) => {
    const g = ensureGrouping();
    const fields = g.fields.includes(field)
      ? g.fields.filter((f) => f !== field)
      : [...g.fields, field];
    onChange(fields.length === 0 && !g.showSubtotals && g.totalizers.length === 0 ? null : { ...g, fields });
  };

  const updateHeaderTemplate = (headerTemplate: string) => {
    const g = ensureGrouping();
    onChange({ ...g, headerTemplate });
  };

  const updateSubtotals = (showSubtotals: boolean) => {
    const g = ensureGrouping();
    onChange({ ...g, showSubtotals });
  };

  const updateTotalizer = (field: string, operation: AggregationOp) => {
    const g = ensureGrouping();
    let totalizers = [...g.totalizers];
    const idx = totalizers.findIndex((t) => t.field === field);
    if (operation === 'nenhum') {
      totalizers = totalizers.filter((t) => t.field !== field);
    } else if (idx >= 0) {
      totalizers[idx] = { field, operation };
    } else {
      totalizers.push({ field, operation });
    }
    onChange({ ...g, totalizers });
  };

  const getTotalizerOp = (field: string): AggregationOp => {
    return grouping?.totalizers.find((t) => t.field === field)?.operation || 'nenhum';
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">Campos para agrupar</label>
        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => (
            <button
              key={field}
              onClick={() => toggleGroupField(field)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                grouping?.fields.includes(field)
                  ? 'bg-moss-100 border-moss-400 text-moss-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {field}
            </button>
          ))}
        </div>
      </div>

      {grouping && grouping.fields.length > 0 && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Template do cabeçalho do grupo</label>
            <input
              type="text"
              value={grouping.headerTemplate}
              onChange={(e) => updateHeaderTemplate(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              placeholder="Ex: Grupo: {campo} - Total de registros: {count}"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Use {'{campo}'} para substituição dinâmica</p>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={grouping.showSubtotals}
              onChange={(e) => updateSubtotals(e.target.checked)}
              className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
            />
            Exibir subtotais no rodapé do grupo
          </label>

          {grouping.showSubtotals && numericColumns.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Totalizadores por coluna</label>
              <div className="space-y-1.5">
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
            </div>
          )}

          {grouping.showSubtotals && numericColumns.length === 0 && (
            <p className="text-xs text-gray-400 italic">Nenhuma coluna numérica disponível para totalização. Altere o formato das colunas para Número, Moeda BRL ou Percentual.</p>
          )}
        </>
      )}
    </div>
  );
};

export default GroupConfig;
