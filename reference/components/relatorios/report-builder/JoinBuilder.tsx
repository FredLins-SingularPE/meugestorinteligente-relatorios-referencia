import React, { useState, useEffect } from 'react';

interface ForeignKey {
  source_table: string;
  source_column: string;
  foreign_table: string;
  foreign_column: string;
}

export interface JoinConfig {
  id: string;
  leftTable: string;
  leftColumn: string;
  joinType: 'INNER JOIN' | 'LEFT JOIN' | 'RIGHT JOIN';
  rightTable: string;
  rightColumn: string;
}

interface JoinBuilderProps {
  selectedTables: string[];
  joins: JoinConfig[];
  onJoinsChange: (joins: JoinConfig[]) => void;
}

export default function JoinBuilder({ selectedTables, joins, onJoinsChange }: JoinBuilderProps) {
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    fetch('/api/reports/schema/foreign-keys')
      .then((r) => r.json())
      .then((data) => {
        setForeignKeys(data.foreignKeys || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [loaded]);

  useEffect(() => {
    if (!loaded || selectedTables.length < 2) return;
    if (joins.length > 0) return;

    const suggested: JoinConfig[] = [];
    for (let i = 1; i < selectedTables.length; i++) {
      const tA = selectedTables[i - 1];
      const tB = selectedTables[i];

      const fk =
        foreignKeys.find(
          (f) =>
            (f.source_table === tA && f.foreign_table === tB) ||
            (f.source_table === tB && f.foreign_table === tA),
        );

      if (fk) {
        const isForward = fk.source_table === tA;
        suggested.push({
          id: crypto.randomUUID(),
          leftTable: isForward ? fk.source_table : fk.foreign_table,
          leftColumn: isForward ? fk.source_column : fk.foreign_column,
          joinType: 'INNER JOIN',
          rightTable: isForward ? fk.foreign_table : fk.source_table,
          rightColumn: isForward ? fk.foreign_column : fk.source_column,
        });
      } else {
        suggested.push({
          id: crypto.randomUUID(),
          leftTable: tA,
          leftColumn: '',
          joinType: 'INNER JOIN',
          rightTable: tB,
          rightColumn: '',
        });
      }
    }

    if (suggested.length > 0) onJoinsChange(suggested);
  }, [selectedTables, foreignKeys, loaded, joins.length, onJoinsChange]);

  const updateJoin = (id: string, field: keyof JoinConfig, value: string) => {
    onJoinsChange(joins.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
  };

  const removeJoin = (id: string) => {
    onJoinsChange(joins.filter((j) => j.id !== id));
  };

  const addJoin = () => {
    onJoinsChange([
      ...joins,
      {
        id: crypto.randomUUID(),
        leftTable: selectedTables[0] || '',
        leftColumn: '',
        joinType: 'INNER JOIN',
        rightTable: selectedTables[1] || '',
        rightColumn: '',
      },
    ]);
  };

  if (selectedTables.length < 2) return null;

  return (
    <div className="border border-gray-200 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Joins</h4>
        <button
          onClick={addJoin}
          className="text-xs px-2 py-1 bg-moss-100 text-moss-700 rounded hover:bg-moss-200 transition-colors"
        >
          + Adicionar Join
        </button>
      </div>

      {joins.length === 0 ? (
        <p className="text-xs text-gray-400">Nenhum join configurado</p>
      ) : (
        <div className="space-y-2">
          {joins.map((join) => (
            <div key={join.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
              <select
                value={join.leftTable}
                onChange={(e) => updateJoin(join.id, 'leftTable', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="">Tabela</option>
                {selectedTables.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-gray-400">.</span>
              <input
                type="text"
                value={join.leftColumn}
                onChange={(e) => updateJoin(join.id, 'leftColumn', e.target.value)}
                placeholder="coluna"
                className="px-2 py-1 border border-gray-300 rounded text-xs w-28"
              />

              <select
                value={join.joinType}
                onChange={(e) => updateJoin(join.id, 'joinType', e.target.value as JoinConfig['joinType'])}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white font-medium text-moss-700"
              >
                <option value="INNER JOIN">INNER</option>
                <option value="LEFT JOIN">LEFT</option>
                <option value="RIGHT JOIN">RIGHT</option>
              </select>

              <select
                value={join.rightTable}
                onChange={(e) => updateJoin(join.id, 'rightTable', e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
              >
                <option value="">Tabela</option>
                {selectedTables.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-gray-400">.</span>
              <input
                type="text"
                value={join.rightColumn}
                onChange={(e) => updateJoin(join.id, 'rightColumn', e.target.value)}
                placeholder="coluna"
                className="px-2 py-1 border border-gray-300 rounded text-xs w-28"
              />

              <button
                onClick={() => removeJoin(join.id)}
                className="text-red-400 hover:text-red-600 p-1 ml-auto"
                title="Remover join"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
