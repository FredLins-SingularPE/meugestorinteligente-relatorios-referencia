import React from 'react';
import { ChartConfig, createEmptyChart } from './types';
import ChartConfigComponent from './ChartConfig';

interface ChartsTabProps {
  charts: ChartConfig[];
  onChartsChange: (charts: ChartConfig[]) => void;
  columns: string[];
}

const ChartsTab: React.FC<ChartsTabProps> = ({ charts, onChartsChange, columns }) => {
  const addChart = () => {
    onChartsChange([...charts, createEmptyChart()]);
  };

  const updateChart = (index: number, chart: ChartConfig) => {
    const next = charts.map((c, i) => (i === index ? chart : c));
    onChartsChange(next);
  };

  const removeChart = (index: number) => {
    onChartsChange(charts.filter((_, i) => i !== index));
  };

  const moveChart = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= charts.length) return;
    const next = [...charts];
    [next[index], next[target]] = [next[target], next[index]];
    onChartsChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {charts.length === 0
            ? 'Nenhum gráfico configurado. Adicione um gráfico para visualizar os dados.'
            : `${charts.length} gráfico(s) configurado(s)`}
        </p>
        <button
          onClick={addChart}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-moss-600 text-white text-xs rounded-lg hover:bg-moss-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Gráfico
        </button>
      </div>

      {charts.map((chart, i) => (
        <ChartConfigComponent
          key={chart.id}
          chart={chart}
          columns={columns}
          index={i}
          total={charts.length}
          onChange={(c) => updateChart(i, c)}
          onRemove={() => removeChart(i)}
          onMove={(dir) => moveChart(i, dir)}
        />
      ))}
    </div>
  );
};

export default ChartsTab;
