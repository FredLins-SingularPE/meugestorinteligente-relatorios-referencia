import React, { useState, useEffect, useCallback } from 'react';
import { PortalConfig, User } from '../../../types';
import { ReportTemplate, ReportLayout, ChartConfig, SubreportConfig, FilterConfig, ColumnDef, createEmptyTemplate } from './types';
import ReportTree from './ReportTree';
import ReportSaveModal from './ReportSaveModal';
import DataSourceTab from './DataSourceTab';
import LayoutTab from './LayoutTab';
import ChartsTab from './ChartsTab';
import FiltersTab from './FiltersTab';
import SubreportsTab from './SubreportsTab';
import PreviewTab from './PreviewTab';
import GuideTab from './GuideTab';

interface ReportBuilderProps {
  config: PortalConfig;
  currentUser: User | null;
}

const TABS = [
  { id: 'datasource', label: 'Fonte de Dados' },
  { id: 'layout', label: 'Layout' },
  { id: 'charts', label: 'Gráficos' },
  { id: 'filters', label: 'Filtros' },
  { id: 'subreports', label: 'Subrelatórios' },
  { id: 'guide', label: 'Guia' },
] as const;

type TabId = typeof TABS[number]['id'];

const ReportBuilder: React.FC<ReportBuilderProps> = ({ config, currentUser }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReportTemplate>(createEmptyTemplate(currentUser?.id));
  const [activeTab, setActiveTab] = useState<TabId>('datasource');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<{ name: string; dataType: string }[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1200);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 1200;
      setIsNarrow(narrow);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports/templates');
      if (!res.ok) {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || 'Erro ao carregar templates');
      }
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleNew = () => {
    if (currentUser?.role !== 'ADMIN') return;
    setCurrentTemplate(createEmptyTemplate(currentUser?.id));
    setAvailableColumns([]);
    setPreviewData([]);
    setActiveTab('datasource');
    setMobilePreviewOpen(false);
  };

  const handleSelect = (tpl: ReportTemplate) => {
    setCurrentTemplate({ ...tpl });
    const savedColumns = new Map<string, string>();
    const addSavedColumn = (field: unknown, dataType = 'text') => {
      if (typeof field !== 'string' || !field.trim()) return;
      if (!savedColumns.has(field)) savedColumns.set(field, dataType);
    };
    for (const column of tpl.layout?.columns || []) {
      const format = String(column.format || '').toLowerCase();
      const dataType = ['number', 'currency', 'currency_brl', 'percent'].includes(format)
        ? 'numeric'
        : ['date', 'datetime'].includes(format) ? 'date' : 'text';
      addSavedColumn(column.field, dataType);
    }
    for (const filter of (tpl as any).filters || []) {
      const field = filter.field || String(filter.placeholder || '').split('.').at(-1);
      const dataType = filter.type === 'number' ? 'numeric' : filter.type === 'date' ? 'date' : 'text';
      addSavedColumn(field, dataType);
    }
    for (const subreport of (tpl as any).subreports || []) {
      for (const column of subreport.columns || []) {
        const format = String(column.format || '').toLowerCase();
        const dataType = ['number', 'currency', 'currency_brl', 'percent'].includes(format)
          ? 'numeric'
          : ['date', 'datetime'].includes(format) ? 'date' : 'text';
        addSavedColumn(column.field, dataType);
      }
      addSavedColumn(subreport.summary_config?.groupField);
    }
    for (const chart of (tpl as any).charts || []) {
      addSavedColumn(chart.xField);
      for (const field of chart.yFields || []) addSavedColumn(typeof field === 'string' ? field : field.field, 'numeric');
    }
    setAvailableColumns(Array.from(savedColumns, ([name, dataType]) => ({ name, dataType })));
    setPreviewData([]);
    setActiveTab('datasource');
    setMobilePreviewOpen(false);
    if (isNarrow) setSidebarOpen(false);
  };

  const handleSave = async (data: Partial<ReportTemplate>) => {
    try {
      const payload = { ...currentTemplate, ...data };
      const isNew = !payload.id;
      const url = isNew ? '/api/reports/templates' : `/api/reports/templates/${payload.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || 'Erro ao salvar o relatório.');
      }
      const saved = await res.json();
      setCurrentTemplate(saved.template || saved);
      setShowSaveModal(false);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!currentTemplate.id) return;
    if (!window.confirm('Tem certeza que deseja excluir este relatório?')) return;
    try {
      const res = await fetch(`/api/reports/templates/${currentTemplate.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const response = await res.json().catch(() => ({}));
        throw new Error(response.error || 'Erro ao excluir o relatório.');
      }
      handleNew();
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSqlChange = useCallback((sql: string) => {
    setCurrentTemplate(prev => ({ ...prev, sql_query: sql }));
  }, []);

  const handleColumnsChange = useCallback((cols: { field: string; label: string }[]) => {
    setAvailableColumns(cols.map(c => ({ name: c.field, dataType: 'text' })));
    setCurrentTemplate(prev => {
      const existingFields = new Set(prev.layout.columns.map(c => c.field));
      const newColumns: ColumnDef[] = cols.map(c => {
        if (existingFields.has(c.field)) {
          return prev.layout.columns.find(ec => ec.field === c.field)!;
        }
        return { field: c.field, label: c.label, width: '100', align: 'left' as const, format: 'text' as const, visible: true };
      });
      return { ...prev, layout: { ...prev.layout, columns: newColumns } };
    });
  }, []);

  const handleLayoutChange = useCallback((layout: ReportLayout) => {
    setCurrentTemplate(prev => ({ ...prev, layout }));
  }, []);

  const handleTargetLayoutChange = useCallback((target: 'responsive' | 'web' | 'mobile') => {
    setCurrentTemplate(prev => ({ ...prev, target_layout: target }));
  }, []);

  const handleChartsChange = useCallback((charts: ChartConfig[]) => {
    setCurrentTemplate(prev => ({ ...prev, charts }));
  }, []);

  const handleFiltersChange = useCallback((filters: FilterConfig[]) => {
    setCurrentTemplate(prev => ({ ...prev, filters }));
  }, []);

  const handleSubreportsChange = useCallback((subreports: SubreportConfig[]) => {
    setCurrentTemplate(prev => ({ ...prev, subreports }));
  }, []);

  const columnNames = currentTemplate.layout.columns.map(c => c.field);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'datasource':
        return (
          <DataSourceTab
            sqlQuery={currentTemplate.sql_query}
            onSqlChange={handleSqlChange}
            onColumnsChange={handleColumnsChange}
          />
        );
      case 'layout':
        return (
          <LayoutTab
            layout={currentTemplate.layout}
            onLayoutChange={handleLayoutChange}
            columns={currentTemplate.layout.columns}
            targetLayout={currentTemplate.target_layout}
            onTargetLayoutChange={handleTargetLayoutChange}
          />
        );
      case 'charts':
        return (
          <ChartsTab
            charts={currentTemplate.charts}
            onChartsChange={handleChartsChange}
            columns={columnNames}
          />
        );
      case 'filters':
        return (
          <FiltersTab
            filters={currentTemplate.filters}
            onFiltersChange={handleFiltersChange}
            availableColumns={availableColumns}
          />
        );
      case 'subreports':
        return (
          <SubreportsTab
            subreports={currentTemplate.subreports}
            onSubreportsChange={handleSubreportsChange}
            availableColumns={availableColumns}
            parentData={previewData}
          />
        );
      case 'guide':
        return <GuideTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full gap-3 relative">
      {isNarrow && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {isNarrow ? (
        <div className={`
          fixed top-0 left-0 h-full z-40 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-72 bg-white shadow-sm border border-gray-200 flex flex-col overflow-hidden rounded-none
        `}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Relatórios Salvos</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ReportTree
            templates={templates}
            onSelect={handleSelect}
            selectedId={currentTemplate.id}
          />
        </div>
      ) : (
        <div className={`
          flex-shrink-0 transition-all duration-300 overflow-hidden
          ${sidebarOpen ? 'w-72' : 'w-0'}
          bg-white shadow-sm border border-gray-200 flex flex-col rounded-xl
          ${!sidebarOpen ? 'border-0' : ''}
        `}>
          <ReportTree
            templates={templates}
            onSelect={handleSelect}
            selectedId={currentTemplate.id}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2.5 flex items-center gap-2 flex-wrap mb-3">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
            title={sidebarOpen ? 'Ocultar painel de relatórios' : 'Mostrar painel de relatórios'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {currentUser?.role === 'ADMIN' && <button
            onClick={handleNew}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-moss-700 rounded-lg hover:bg-moss-800 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo
          </button>}
          {currentUser?.role === 'ADMIN' && <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Salvar
          </button>}
          {currentUser?.role === 'ADMIN' && <button
            onClick={handleDelete}
            disabled={!currentTemplate.id}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Excluir
          </button>}

          {isNarrow && (
            <button
              onClick={() => setMobilePreviewOpen(value => !value)}
              className="ml-auto rounded-lg border border-moss-200 bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800"
            >
              {mobilePreviewOpen ? 'Voltar ao editor' : 'Abrir preview'}
            </button>
          )}

          <div className="h-5 w-px bg-gray-300 mx-1" />

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Conteúdo:</label>
            <select
              value={currentTemplate.content_mode}
              onChange={e => setCurrentTemplate(prev => ({ ...prev, content_mode: e.target.value as any }))}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
            >
              <option value="data">Dados</option>
              <option value="charts">Gráficos</option>
              <option value="both">Ambos</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase">Layout:</label>
            <select
              value={currentTemplate.target_layout}
              onChange={e => setCurrentTemplate(prev => ({ ...prev, target_layout: e.target.value as any }))}
              className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-moss-500 outline-none"
            >
              <option value="responsive">Responsivo</option>
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {currentTemplate.id && (
            <span className="ml-auto text-[10px] text-gray-400 truncate max-w-[200px]">
              {currentTemplate.name || 'Sem nome'}
            </span>
          )}
        </div>

        {currentUser?.role !== 'ADMIN' && (
          <div className="mb-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>
              <strong>Somente administradores</strong> podem criar ou editar templates de relatório com queries SQL.
              Você pode visualizar e executar relatórios existentes.
            </span>
          </div>
        )}

        {error && (
          <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className={`${isNarrow ? 'flex flex-col' : 'grid grid-cols-2'} flex-1 min-h-0 gap-3`}>
        <div className={`bg-white rounded-xl shadow-sm border border-gray-200 min-h-0 flex-col overflow-hidden ${isNarrow && mobilePreviewOpen ? 'hidden' : 'flex'}`}>
          {currentUser?.role === 'ADMIN' && <div className="flex flex-wrap border-b border-gray-200">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'text-moss-800 border-moss-600 bg-moss-50/50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>}

          <div className="flex-1 overflow-y-auto p-4">
            {currentUser?.role !== 'ADMIN' ? (
              <div className="flex h-full min-h-40 items-center justify-center text-center text-sm text-gray-500">
                Selecione um relatório autorizado e execute-o no painel de preview.
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-moss-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>
        <section className={`min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${isNarrow && !mobilePreviewOpen ? 'hidden' : 'flex'}`} aria-label="Preview do relatório">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-600">Preview executável</h3>
            {isNarrow && (
              <button onClick={() => setMobilePreviewOpen(false)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">
                Voltar ao editor
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <PreviewTab
              key={currentTemplate.id || '__new_report__'}
              sqlQuery={currentTemplate.sql_query}
              layout={currentTemplate.layout}
              charts={currentTemplate.charts}
              subreports={currentTemplate.subreports}
              contentMode={currentTemplate.content_mode}
              targetLayout={currentTemplate.target_layout}
              filters={currentTemplate.filters}
              logoUrl={config.logoUrl || ''}
              templateId={currentTemplate.id || undefined}
            />
          </div>
        </section>
        </div>
      </div>

      {showSaveModal && (
        <ReportSaveModal
          template={currentTemplate}
          config={config}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
};

export default ReportBuilder;
