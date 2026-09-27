import React from 'react';
import { ColumnDef, COLUMN_FORMATS } from './types';

interface ColumnConfigProps {
  columns: ColumnDef[];
  onChange: (columns: ColumnDef[]) => void;
}

const ColumnConfig: React.FC<ColumnConfigProps> = ({ columns, onChange }) => {
  const updateColumn = (index: number, updates: Partial<ColumnDef>) => {
    const next = columns.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange(next);
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  if (columns.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        <p>Nenhuma coluna disponível.</p>
        <p className="text-xs mt-1">Execute a consulta SQL para detectar as colunas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {columns.map((col, i) => (
        <div
          key={col.field}
          className={`border rounded-lg p-3 transition-colors ${col.visible ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveColumn(i, -1)}
                disabled={i === 0}
                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Mover para cima"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveColumn(i, 1)}
                disabled={i === columns.length - 1}
                className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Mover para baixo"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{col.field}</span>
            <div className="flex-1" />
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={(e) => updateColumn(i, { visible: e.target.checked })}
                className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
              />
              Visível
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Rótulo</label>
              <input
                type="text"
                value={col.label}
                onChange={(e) => updateColumn(i, { label: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
                placeholder={col.field}
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Largura (%)</label>
              <input
                type="text"
                value={col.width}
                onChange={(e) => updateColumn(i, { width: e.target.value })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
                placeholder="auto"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Alinhamento</label>
              <select
                value={col.align}
                onChange={(e) => updateColumn(i, { align: e.target.value as ColumnDef['align'] })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">Formato</label>
              <select
                value={col.format}
                onChange={(e) => updateColumn(i, { format: e.target.value as ColumnDef['format'] })}
                className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                {COLUMN_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ColumnConfig;
