import React from 'react';

export interface WhereCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  connector: 'AND' | 'OR';
}

const OPERATORS = [
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
  { value: 'LIKE', label: 'LIKE' },
  { value: 'IN', label: 'IN' },
  { value: 'BETWEEN', label: 'BETWEEN' },
  { value: 'IS NULL', label: 'IS NULL' },
  { value: 'IS NOT NULL', label: 'IS NOT NULL' },
];

interface AvailableColumn {
  table: string;
  column: string;
  type: string;
}

interface WhereBuilderProps {
  conditions: WhereCondition[];
  onConditionsChange: (conditions: WhereCondition[]) => void;
  availableColumns: AvailableColumn[];
}

const noValueOperators = ['IS NULL', 'IS NOT NULL'];

export default function WhereBuilder({ conditions, onConditionsChange, availableColumns }: WhereBuilderProps) {
  const addCondition = () => {
    onConditionsChange([
      ...conditions,
      {
        id: crypto.randomUUID(),
        field: '',
        operator: '=',
        value: '',
        connector: 'AND',
      },
    ]);
  };

  const updateCondition = (id: string, field: keyof WhereCondition, value: string) => {
    onConditionsChange(conditions.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCondition = (id: string) => {
    onConditionsChange(conditions.filter((c) => c.id !== id));
  };

  const isDynamic = (value: string) => value.startsWith('{{') && value.endsWith('}}');

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Filtros (WHERE)</h4>
        <button
          onClick={addCondition}
          className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded hover:bg-moss-200 transition-colors"
        >
          + Adicionar Filtro
        </button>
      </div>

      {conditions.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum filtro configurado</p>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, idx) => (
            <div key={cond.id} className="flex items-center gap-2 flex-wrap">
              {idx > 0 && (
                <select
                  value={cond.connector}
                  onChange={(e) => updateCondition(cond.id, 'connector', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs bg-white font-medium w-16"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}

              <select
                value={cond.field}
                onChange={(e) => updateCondition(cond.id, 'field', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white min-w-[140px]"
              >
                <option value="">Selecionar campo</option>
                {availableColumns.map((col) => (
                  <option key={`${col.table}.${col.column}`} value={`${col.table}.${col.column}`}>
                    {col.table}.{col.column}
                  </option>
                ))}
              </select>

              <select
                value={cond.operator}
                onChange={(e) => updateCondition(cond.id, 'operator', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white w-28"
              >
                {OPERATORS.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>

              {!noValueOperators.includes(cond.operator) && (
                <div className="relative">
                  <input
                    type="text"
                    value={cond.value}
                    onChange={(e) => updateCondition(cond.id, 'value', e.target.value)}
                    placeholder="Valor ou {{filtro}}"
                    className={`px-2 py-1 border rounded text-xs w-36 ${
                      isDynamic(cond.value)
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-gray-300'
                    }`}
                  />
                  {isDynamic(cond.value) && (
                    <span className="absolute -top-1.5 right-1 text-[9px] bg-amber-100 text-amber-600 px-1 rounded">
                      dinâmico
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={() => removeCondition(cond.id)}
                className="text-red-400 hover:text-red-600 p-1"
                title="Remover filtro"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
