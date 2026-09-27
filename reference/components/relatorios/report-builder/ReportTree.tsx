import React, { useState } from 'react';
import { ReportTemplate, REPORT_CATEGORIES } from './types';

interface ReportTreeProps {
  templates: ReportTemplate[];
  onSelect: (template: ReportTemplate) => void;
  selectedId?: string;
}

const ReportTree: React.FC<ReportTreeProps> = ({ templates, onSelect, selectedId }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    REPORT_CATEGORIES.forEach(cat => { init[cat] = true; });
    return init;
  });

  const grouped = REPORT_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat);
    return acc;
  }, {} as Record<string, ReportTemplate[]>);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getContentModeIcon = (mode: string) => {
    if (mode === 'data') {
      return (
        <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    }
    if (mode === 'charts') {
      return (
        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0h6m-6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m6 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M17 14l2 2m0 0l2 2m-2-2l2-2m-2 2l-2 2" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-xs font-bold text-moss-800 uppercase tracking-wide">Relatórios Salvos</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {REPORT_CATEGORIES.map(cat => {
          const items = grouped[cat];
          const isExpanded = expandedCategories[cat] || false;
          return (
            <div key={cat}>
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>{cat}</span>
                <span className="ml-auto text-[10px] text-gray-400 bg-gray-200 px-1.5 rounded-full">{items.length}</span>
              </button>
              {isExpanded && items.length > 0 && (
                <div className="pb-1">
                  {items.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => onSelect(tpl)}
                      className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-xs hover:bg-moss-50 transition-colors ${selectedId === tpl.id ? 'bg-moss-100 text-moss-800 font-semibold' : 'text-gray-600'}`}
                    >
                      {getContentModeIcon(tpl.content_mode)}
                      <span className="truncate flex-1 text-left">{tpl.name}</span>
                      {(tpl.allowed_users || tpl.allowed_groups) && (
                        <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {isExpanded && items.length === 0 && (
                <p className="pl-8 pr-3 py-1.5 text-[10px] text-gray-400 italic">Nenhum relatório</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportTree;
