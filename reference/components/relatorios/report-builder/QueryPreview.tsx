import React from 'react';

interface QueryField {
  name: string;
  dataTypeID?: number;
}

interface QueryPreviewProps {
  rows: Record<string, unknown>[];
  fields: QueryField[];
  rowCount?: number;
  duration?: number;
  loading?: boolean;
  error?: string;
}

export default function QueryPreview({ rows, fields, rowCount, duration, loading, error }: QueryPreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Executando consulta...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        <p className="font-medium mb-1">Erro na consulta:</p>
        <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
      </div>
    );
  }

  if (!fields || fields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <svg className="mx-auto h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p>Execute uma consulta para ver os resultados</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="font-medium">Nenhum resultado encontrado</p>
        {duration !== undefined && <p className="text-xs mt-1">Executado em {duration}ms</p>}
      </div>
    );
  }

  const formatValue = (val: unknown): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
        <span>{rowCount ?? rows.length} registro(s) retornado(s)</span>
        {duration !== undefined && <span>Tempo: {duration}ms</span>}
      </div>
      <div className="border border-gray-200 rounded-lg overflow-auto max-h-96">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100 sticky top-0">
              {fields.map((f) => (
                <th key={f.name} className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap">
                  {f.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {fields.map((f) => (
                  <td key={f.name} className="px-3 py-1.5 border-b border-gray-100 whitespace-nowrap text-gray-600 max-w-xs truncate">
                    <span className={row[f.name] === null ? 'text-gray-300 italic' : ''}>
                      {formatValue(row[f.name])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
