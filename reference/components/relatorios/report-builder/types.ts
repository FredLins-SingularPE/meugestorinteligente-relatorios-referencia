export interface FilterConfig {
  id: string;
  placeholder: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select';
  defaultValue: string;
  options?: string[];
}

export type ColumnFormat = 'text' | 'number' | 'currency_brl' | 'date' | 'cpf_cnpj' | 'percent';
export type AggregationOp = 'soma' | 'contagem' | 'media' | 'min' | 'max' | 'nenhum';

export interface ColumnDef {
  field: string;
  label: string;
  width: string;
  align: 'left' | 'center' | 'right';
  format: ColumnFormat;
  visible: boolean;
}

export interface TotalizerConfig {
  field: string;
  operation: AggregationOp;
}

export interface ReportLayout {
  header: {
    show: boolean;
    title: string;
    subtitle: string;
    logo: string;
    alignment: 'left' | 'center' | 'right';
    showDate: boolean;
    showLogo: boolean;
  };
  columns: ColumnDef[];
  grouping: {
    fields: string[];
    headerTemplate: string;
    showSubtotals: boolean;
    totalizers: TotalizerConfig[];
  } | null;
  footer: {
    show: boolean;
    showTotals: boolean;
    totalizers: TotalizerConfig[];
    showPageNumbers: boolean;
    showDateTime: boolean;
    customText: string;
  };
  general: {
    pageSize: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    fontSize: number;
    fontFamily: string;
    zebra: boolean;
    margins: { top: number; bottom: number; left: number; right: number };
  };
}

export type ChartMainType = 'bar' | 'pie' | 'line' | 'mixed';
export type BarSubType = 'vertical' | 'horizontal' | 'stacked';
export type PieSubType = 'pizza' | 'donut';
export type LineSubType = 'line' | 'area';
export type YFieldOp = 'soma' | 'contagem' | 'media' | 'direto';

export interface YFieldConfig {
  field: string;
  operation: YFieldOp;
  color: string;
  seriesType?: 'bar' | 'line';
  secondaryAxis?: boolean;
}

export interface ChartConfig {
  id: string;
  type: ChartMainType;
  subType: string;
  title: string;
  xField: string;
  yFields: YFieldConfig[];
  colors: string[];
  palette: string;
  position: 'before' | 'after' | 'between';
  width: '100%' | '50%';
  showLegend: boolean;
  showDataLabels: boolean;
  showGrid: boolean;
}

export interface SubreportColumnConfig {
  field: string;
  label: string;
  width: number;
  format: string;
  align: string;
}

export interface SubreportTotalizer {
  field: string;
  operation: string;
}

export interface SubreportSummaryConfig {
  groupField: string;
  operations: { field: string; op: string }[];
}

export interface SubreportConfig {
  id: string;
  type: 'summary' | 'query';
  title: string;
  sql_query?: string;
  summary_config?: SubreportSummaryConfig;
  columns: SubreportColumnConfig[];
  totalizers: SubreportTotalizer[];
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  target_layout: 'responsive' | 'web' | 'mobile';
  content_mode: 'data' | 'charts' | 'both';
  sql_query: string;
  layout: ReportLayout;
  filters: FilterConfig[];
  subreports: SubreportConfig[];
  charts: ChartConfig[];
  allowed_users: string[] | null;
  allowed_groups: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const REPORT_CATEGORIES = [
  'Cadastrais',
  'Financeiro',
  'Comercial',
  'Jurídico',
  'Negociação',
  'Cobrança',
  'Administrativo',
  'Gerenciais',
  'Outros',
] as const;

export const COLUMN_FORMATS: { value: ColumnFormat; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency_brl', label: 'Moeda BRL' },
  { value: 'date', label: 'Data' },
  { value: 'cpf_cnpj', label: 'CPF/CNPJ' },
  { value: 'percent', label: 'Percentual' },
];

export const AGGREGATION_OPTIONS: { value: AggregationOp; label: string }[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'soma', label: 'Soma' },
  { value: 'contagem', label: 'Contagem' },
  { value: 'media', label: 'Média' },
  { value: 'min', label: 'Mín' },
  { value: 'max', label: 'Máx' },
];

export const COLOR_PALETTES: Record<string, string[]> = {
  padrao: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'],
  pastel: ['#93C5FD', '#FCA5A5', '#6EE7B7', '#FDE68A', '#C4B5FD', '#FBCFE8', '#67E8F9', '#FDBA74'],
  escuro: ['#1E3A5F', '#7F1D1D', '#064E3B', '#78350F', '#4C1D95', '#831843', '#164E63', '#9A3412'],
  monocromatico: ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF'],
};

export const DEFAULT_LAYOUT: ReportLayout = {
  header: { show: true, title: '', subtitle: '', logo: '', alignment: 'left', showDate: true, showLogo: true },
  columns: [],
  grouping: null,
  footer: { show: true, showTotals: false, totalizers: [], showPageNumbers: true, showDateTime: false, customText: '' },
  general: { pageSize: 'A4', orientation: 'portrait', fontSize: 12, fontFamily: 'Arial', zebra: true, margins: { top: 20, bottom: 20, left: 15, right: 15 } },
};

export function createEmptyTemplate(userId?: string): ReportTemplate {
  return {
    id: '',
    name: '',
    description: '',
    category: 'Outros',
    target_layout: 'responsive',
    content_mode: 'both',
    sql_query: '',
    layout: { ...DEFAULT_LAYOUT },
    filters: [],
    subreports: [],
    charts: [],
    allowed_users: null,
    allowed_groups: null,
    created_by: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true,
  };
}

export function createEmptyChart(): ChartConfig {
  return {
    id: crypto.randomUUID(),
    type: 'bar',
    subType: 'vertical',
    title: '',
    xField: '',
    yFields: [],
    colors: COLOR_PALETTES.padrao,
    palette: 'padrao',
    position: 'after',
    width: '100%',
    showLegend: true,
    showDataLabels: false,
    showGrid: true,
  };
}
