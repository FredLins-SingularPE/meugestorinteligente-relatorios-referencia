import React, { useState, useEffect, useCallback } from 'react';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
}

interface SelectedColumn {
  table: string;
  column: string;
  type: string;
}

interface SchemaExplorerProps {
  selectedTables: string[];
  onSelectTable: (table: string) => void;
  onDeselectTable: (table: string) => void;
  selectedColumns: SelectedColumn[];
  onToggleColumn: (table: string, column: string, type: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  integer: 'bg-blue-100 text-blue-700',
  bigint: 'bg-blue-100 text-blue-700',
  smallint: 'bg-blue-100 text-blue-700',
  numeric: 'bg-purple-100 text-purple-700',
  'double precision': 'bg-purple-100 text-purple-700',
  real: 'bg-purple-100 text-purple-700',
  text: 'bg-green-100 text-green-700',
  'character varying': 'bg-green-100 text-green-700',
  boolean: 'bg-yellow-100 text-yellow-700',
  date: 'bg-orange-100 text-orange-700',
  'timestamp with time zone': 'bg-orange-100 text-orange-700',
  'timestamp without time zone': 'bg-orange-100 text-orange-700',
  jsonb: 'bg-pink-100 text-pink-700',
  json: 'bg-pink-100 text-pink-700',
  uuid: 'bg-gray-100 text-gray-700',
  'ARRAY': 'bg-indigo-100 text-indigo-700',
};

function getTypeBadgeClass(type: string): string {
  return TYPE_COLORS[type] || 'bg-gray-100 text-gray-600';
}

function shortType(type: string): string {
  const map: Record<string, string> = {
    'character varying': 'varchar',
    'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp',
    'double precision': 'float8',
  };
  return map[type] || type;
}

export default function SchemaExplorer({
  selectedTables,
  onSelectTable,
  onDeselectTable,
  selectedColumns,
  onToggleColumn,
}: SchemaExplorerProps) {
  const [tables, setTables] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [tableColumns, setTableColumns] = useState<Record<string, ColumnInfo[]>>({});
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  useEffect(() => {
    setLoadingTables(true);
    fetch('/api/reports/schema/tables')
      .then((r) => r.json())
      .then((data) => setTables(data.tables || []))
      .catch(() => setTables([]))
      .finally(() => setLoadingTables(false));
  }, []);

  const fetchColumns = useCallback(
    (table: string) => {
      if (tableColumns[table]) return;
      setLoadingColumns((prev) => ({ ...prev, [table]: true }));
      fetch(`/api/reports/schema/columns?table=${encodeURIComponent(table)}`)
        .then((r) => r.json())
        .then((data) => setTableColumns((prev) => ({ ...prev, [table]: data.columns || [] })))
        .catch(() => {})
        .finally(() => setLoadingColumns((prev) => ({ ...prev, [table]: false })));
    },
    [tableColumns],
  );

  const handleTableClick = (table: string) => {
    const isSelected = selectedTables.includes(table);
    if (isSelected) {
      if (expandedTable === table) {
        setExpandedTable(null);
      } else {
        setExpandedTable(table);
      }
    } else {
      onSelectTable(table);
      fetchColumns(table);
      setExpandedTable(table);
    }
  };

  const handleRemoveTable = (e: React.MouseEvent, table: string) => {
    e.stopPropagation();
    onDeselectTable(table);
    if (expandedTable === table) setExpandedTable(null);
  };

  const isColumnSelected = (table: string, column: string) =>
    selectedColumns.some((c) => c.table === table && c.column === column);

  const filteredTables = tables.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="p-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tabelas do Banco</h4>
        <input
          type="text"
          placeholder="Buscar tabela..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
        />
      </div>
      <div className="max-h-80 overflow-y-auto">
        {loadingTables ? (
          <div className="p-4 text-center text-gray-400 text-sm">Carregando tabelas...</div>
        ) : filteredTables.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">Nenhuma tabela encontrada</div>
        ) : (
          filteredTables.map((table) => {
            const selected = selectedTables.includes(table);
            const expanded = expandedTable === table;
            const cols = tableColumns[table];
            const colLoading = loadingColumns[table];

            return (
              <div key={table}>
                <button
                  onClick={() => handleTableClick(table)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                    selected ? 'bg-moss-50 text-moss-800 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {table}
                  </span>
                  <span className="flex items-center gap-1">
                    {selected && (
                      <span
                        onClick={(e) => handleRemoveTable(e, table)}
                        className="text-red-400 hover:text-red-600 p-0.5"
                        title="Remover tabela"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
                {expanded && selected && (
                  <div className="bg-gray-50 border-t border-gray-100 px-3 py-2">
                    {colLoading ? (
                      <p className="text-xs text-gray-400">Carregando colunas...</p>
                    ) : cols && cols.length > 0 ? (
                      <div className="space-y-1">
                        {cols.map((col) => (
                          <label
                            key={col.column_name}
                            className="flex items-center gap-2 py-0.5 text-xs cursor-pointer hover:bg-gray-100 rounded px-1"
                          >
                            <input
                              type="checkbox"
                              checked={isColumnSelected(table, col.column_name)}
                              onChange={() => onToggleColumn(table, col.column_name, col.data_type)}
                              className="rounded text-moss-600 focus:ring-moss-500"
                            />
                            <span className="text-gray-700 flex-1">{col.column_name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${getTypeBadgeClass(col.data_type)}`}>
                              {shortType(col.data_type)}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Nenhuma coluna encontrada</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
