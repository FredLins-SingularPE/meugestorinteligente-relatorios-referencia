import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { ChartConfig } from './types';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler);

interface ChartPreviewProps {
  chart: ChartConfig;
  columns: string[];
}

const ChartPreview: React.FC<ChartPreviewProps> = ({ chart, columns }) => {
  if (!chart.xField || chart.yFields.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-xs">
        Configure o eixo X e pelo menos um campo Y para ver o preview
      </div>
    );
  }

  const sampleLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const generateData = (seed: number) =>
    sampleLabels.map((_, i) => Math.round(Math.random() * 100 + seed * 20 + i * 10));

  const getColor = (index: number) => {
    return chart.yFields[index]?.color || chart.colors[index % chart.colors.length] || '#3B82F6';
  };

  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: chart.showLegend, position: 'bottom' as const },
      title: { display: !!chart.title, text: chart.title, font: { size: 13 } },
    },
  };

  if (chart.type === 'pie') {
    const data = {
      labels: sampleLabels,
      datasets: [{
        data: generateData(1),
        backgroundColor: sampleLabels.map((_, i) => getColor(i)),
        borderWidth: 1,
      }],
    };
    if (chart.subType === 'donut') {
      return (
        <div className="h-56">
          <Doughnut data={data} options={commonOptions} />
        </div>
      );
    }
    return (
      <div className="h-56">
        <Pie data={data} options={commonOptions} />
      </div>
    );
  }

  if (chart.type === 'line') {
    const data = {
      labels: sampleLabels,
      datasets: chart.yFields.map((yf, i) => ({
        label: yf.field || `Série ${i + 1}`,
        data: generateData(i),
        borderColor: getColor(i),
        backgroundColor: chart.subType === 'area' ? getColor(i) + '40' : 'transparent',
        fill: chart.subType === 'area',
        tension: 0.3,
        pointRadius: 3,
      })),
    };
    const options = {
      ...commonOptions,
      scales: {
        x: { grid: { display: chart.showGrid } },
        y: { grid: { display: chart.showGrid }, beginAtZero: true },
      },
    };
    return (
      <div className="h-56">
        <Line data={data} options={options} />
      </div>
    );
  }

  if (chart.type === 'mixed') {
    const data = {
      labels: sampleLabels,
      datasets: chart.yFields.map((yf, i) => {
        const isLine = yf.seriesType === 'line';
        return {
          type: (isLine ? 'line' : 'bar') as any,
          label: yf.field || `Série ${i + 1}`,
          data: generateData(i),
          borderColor: getColor(i),
          backgroundColor: isLine ? 'transparent' : getColor(i) + 'CC',
          yAxisID: yf.secondaryAxis ? 'y1' : 'y',
          tension: 0.3,
          pointRadius: isLine ? 3 : 0,
          order: isLine ? 0 : 1,
        };
      }),
    };
    const options = {
      ...commonOptions,
      scales: {
        x: { grid: { display: chart.showGrid } },
        y: { type: 'linear' as const, position: 'left' as const, grid: { display: chart.showGrid }, beginAtZero: true },
        y1: {
          type: 'linear' as const,
          position: 'right' as const,
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          display: chart.yFields.some((yf) => yf.secondaryAxis),
        },
      },
    };
    return (
      <div className="h-56">
        <Bar data={data} options={options} />
      </div>
    );
  }

  const isHorizontal = chart.subType === 'horizontal';
  const isStacked = chart.subType === 'stacked';
  const data = {
    labels: sampleLabels,
    datasets: chart.yFields.map((yf, i) => ({
      label: yf.field || `Série ${i + 1}`,
      data: generateData(i),
      backgroundColor: getColor(i) + 'CC',
      borderColor: getColor(i),
      borderWidth: 1,
    })),
  };
  const options = {
    ...commonOptions,
    indexAxis: (isHorizontal ? 'y' : 'x') as 'x' | 'y',
    scales: {
      x: { stacked: isStacked, grid: { display: chart.showGrid }, beginAtZero: isHorizontal },
      y: { stacked: isStacked, grid: { display: chart.showGrid }, beginAtZero: !isHorizontal },
    },
  };

  return (
    <div className="h-56">
      <Bar data={data} options={options} />
    </div>
  );
};

export default ChartPreview;
