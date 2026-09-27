import React, { useState } from 'react';
import { FilterConfig } from './types';

interface FiltersTabProps {
  filters: FilterConfig[];
  onFiltersChange: (filters: FilterConfig[]) => void;
  availableColumns: { name: string; dataType: string }[];
}

const FILTER_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  select: 'Seleção (lista)',
  date: 'Data',
  number: 'Número',
};

function createEmptyFilter(columns: { name: string }[]): FilterConfig {
  return {
    id: crypto.randomUUID(),
    placeholder: columns[0]?.name || 'campo',
    label: '',
    type: 'text',
    defaultValue: '',
    options: [],
  };
}

const FiltersTab: React.FC<FiltersTabProps> = ({ filters, onFiltersChange, availableColumns }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addFilter = () => {
    const f = createEmptyFilter(availableColumns);
    onFiltersChange([...filters, f]);
    setExpandedId(f.id);
  };

  const updateFilter = (id: string, patch: Partial<FilterConfig>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveFilter = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= filters.length) return;
    const next = [...filters];
    [next[index], next[target]] = [next[target], next[index]];
    onFiltersChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">
            {filters.length === 0
              ? 'Nenhum filtro configurado. Adicione filtros para o usuário selecionar na geração do relatório.'
              : `${filters.length} filtro(s) configurado(s). Filtro em branco = todos os registros.`}
          </p>
        </div>
        <button
          onClick={addFilter}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-moss-600 text-white text-xs rounded-lg hover:bg-moss-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Filtro
        </button>
      </div>

      {availableColumns.length === 0 && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          Execute o preview da consulta SQL na aba "Fonte de Dados" para detectar as colunas disponíveis.
        </div>
      )}

      {filters.map((f, i) => (
        <div key={f.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div
            className="flex items-center justify-between px-3 py-2.5 bg-gray-50 cursor-pointer select-none"
            onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${expandedId === f.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs font-semibold text-gray-700 truncate">
                {f.label || f.placeholder || `Filtro ${i + 1}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 flex-shrink-0">
                {FILTER_TYPE_LABELS[f.type] || f.type}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => moveFilter(i, -1)}
                disabled={i === 0}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                title="Mover para cima"
              >
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => moveFilter(i, 1)}
                disabled={i === filters.length - 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-30"
                title="Mover para baixo"
              >
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={() => removeFilter(f.id)}
                className="p-1 rounded hover:bg-red-100 text-red-500"
                title="Remover filtro"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {expandedId === f.id && (
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Rótulo (exibido ao usuário)</label>
                  <input
                    type="text"
                    value={f.label}
                    onChange={e => updateFilter(f.id, { label: e.target.value })}
                    placeholder="Ex: Período, Status, Cliente..."
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Coluna / Campo</label>
                  {availableColumns.length > 0 ? (
                    <select
                      value={f.placeholder}
                      onChange={e => updateFilter(f.id, { placeholder: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                    >
                      {availableColumns.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={f.placeholder}
                      onChange={e => updateFilter(f.id, { placeholder: e.target.value })}
                      placeholder="nome_da_coluna"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Tipo de filtro</label>
                  <select
                    value={f.type}
                    onChange={e => updateFilter(f.id, { type: e.target.value as FilterConfig['type'] })}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                  >
                    <option value="text">Texto (busca parcial)</option>
                    <option value="select">Seleção (lista de valores)</option>
                    <option value="date">Data</option>
                    <option value="number">Número</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Valor padrão (opcional)</label>
                  <input
                    type="text"
                    value={f.defaultValue}
                    onChange={e => updateFilter(f.id, { defaultValue: e.target.value })}
                    placeholder="Deixe em branco para mostrar tudo"
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
                  />
                </div>
              </div>

              {f.type === 'select' && (
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">
                    Opções da lista (uma por linha)
                  </label>
                  <textarea
                    value={(f.options || []).join('\n')}
                    onChange={e => updateFilter(f.id, { options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                    rows={4}
                    placeholder={'Ativo\nInativo\nPendente'}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none resize-y font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Deixe vazio o campo de seleção no preview para mostrar todos os registros.
                  </p>
                </div>
              )}

              {(f.type === 'text') && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">
                  A busca por texto é parcial e não diferencia maiúsculas/minúsculas. Deixar em branco = todos os registros.
                </div>
              )}
              {(f.type === 'date') && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">
                  O filtro de data compara exatamente com a data informada. Deixar em branco = todos os registros.
                </div>
              )}
              {(f.type === 'number') && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700">
                  O filtro de número compara exatamente com o valor informado. Deixar em branco = todos os registros.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {filters.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
          <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <p className="text-xs">Nenhum filtro adicionado</p>
          <button onClick={addFilter} className="text-xs text-moss-600 hover:underline">+ Adicionar primeiro filtro</button>
        </div>
      )}
    </div>
  );
};

export default FiltersTab;
