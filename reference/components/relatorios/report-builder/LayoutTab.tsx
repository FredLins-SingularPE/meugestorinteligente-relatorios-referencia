import React, { useState } from 'react';
import { ReportLayout, ColumnDef } from './types';
import ColumnConfig from './ColumnConfig';
import GroupConfig from './GroupConfig';
import { HeaderConfig, FooterConfig } from './HeaderFooterConfig';

interface LayoutTabProps {
  layout: ReportLayout;
  onLayoutChange: (layout: ReportLayout) => void;
  columns: ColumnDef[];
  targetLayout: 'responsive' | 'web' | 'mobile';
  onTargetLayoutChange: (target: 'responsive' | 'web' | 'mobile') => void;
}

const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <svg
          className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500">{icon}</span>
        <span className="text-sm font-medium text-gray-700">{title}</span>
      </button>
      {open && <div className="p-4 border-t border-gray-100">{children}</div>}
    </div>
  );
};

const LayoutTab: React.FC<LayoutTabProps> = ({
  layout,
  onLayoutChange,
  columns,
  targetLayout,
  onTargetLayoutChange,
}) => {
  const updateHeader = (header: ReportLayout['header']) => onLayoutChange({ ...layout, header });
  const updateColumns = (cols: ColumnDef[]) => onLayoutChange({ ...layout, columns: cols });
  const updateGrouping = (grouping: ReportLayout['grouping']) => onLayoutChange({ ...layout, grouping });
  const updateFooter = (footer: ReportLayout['footer']) => onLayoutChange({ ...layout, footer });
  const updateGeneral = (general: ReportLayout['general']) => onLayoutChange({ ...layout, general });

  return (
    <div className="space-y-3">
      <CollapsibleSection
        title="Cabeçalho"
        defaultOpen
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        }
      >
        <HeaderConfig header={layout.header} onChange={updateHeader} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Colunas do Detalhe"
        defaultOpen
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
        }
      >
        <ColumnConfig columns={columns.length > 0 ? columns : layout.columns} onChange={updateColumns} />
      </CollapsibleSection>

      <CollapsibleSection
        title="Agrupamento e Quebras"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <GroupConfig
          grouping={layout.grouping}
          columns={columns.length > 0 ? columns : layout.columns}
          onChange={updateGrouping}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Rodapé"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        }
      >
        <FooterConfig
          footer={layout.footer}
          columns={columns.length > 0 ? columns : layout.columns}
          onChange={updateFooter}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Configurações Gerais"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Orientação</label>
              <div className="flex gap-1">
                {(['portrait', 'landscape'] as const).map((o) => (
                  <button
                    key={o}
                    onClick={() => updateGeneral({ ...layout.general, orientation: o })}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                      layout.general.orientation === o
                        ? 'bg-moss-100 border-moss-400 text-moss-800 font-medium'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {o === 'portrait' ? 'Retrato' : 'Paisagem'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tamanho do papel</label>
              <select
                value={layout.general.pageSize}
                onChange={(e) => updateGeneral({ ...layout.general, pageSize: e.target.value as 'A4' | 'Letter' | 'Legal' })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                <option value="A4">A4</option>
                <option value="Letter">Carta (Letter)</option>
                <option value="Legal">Ofício (Legal)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Margens (mm)</label>
            <div className="grid grid-cols-4 gap-2">
              {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                <div key={side}>
                  <label className="block text-[10px] text-gray-500 mb-0.5">
                    {side === 'top' ? 'Superior' : side === 'bottom' ? 'Inferior' : side === 'left' ? 'Esquerda' : 'Direita'}
                  </label>
                  <input
                    type="number"
                    value={layout.general.margins[side]}
                    onChange={(e) =>
                      updateGeneral({
                        ...layout.general,
                        margins: { ...layout.general.margins, [side]: Number(e.target.value) || 0 },
                      })
                    }
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tamanho da fonte</label>
              <select
                value={layout.general.fontSize}
                onChange={(e) => updateGeneral({ ...layout.general, fontSize: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-moss-500 focus:border-moss-500"
              >
                {[8, 9, 10, 11, 12, 14].map((s) => (
                  <option key={s} value={s}>{s}pt</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={layout.general.zebra}
                  onChange={(e) => updateGeneral({ ...layout.general, zebra: e.target.checked })}
                  className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
                />
                Linhas zebradas
              </label>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Layout de Destino"
        icon={
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['responsive', 'web', 'mobile'] as const).map((t) => (
              <button
                key={t}
                onClick={() => onTargetLayoutChange(t)}
                className={`flex-1 py-2 text-xs rounded border transition-colors ${
                  targetLayout === t
                    ? 'bg-moss-100 border-moss-400 text-moss-800 font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'responsive' ? 'Responsivo' : t === 'web' ? 'Web (Desktop)' : 'Mobile'}
              </button>
            ))}
          </div>

          {targetLayout === 'mobile' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <p className="font-medium mb-1">Layout Mobile ativo</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                <li>Colunas serão empilhadas em formato de cartão</li>
                <li>Fontes maiores para melhor legibilidade</li>
                <li>Gráficos ocuparão 100% da largura</li>
              </ul>
            </div>
          )}

          {targetLayout === 'web' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <p className="font-medium mb-1">Layout Web (Desktop) ativo</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Layout fixo com largura total</li>
                <li>Tabela com colunas fixas e scroll horizontal se necessário</li>
                <li>Otimizado para telas grandes</li>
              </ul>
            </div>
          )}

          {targetLayout === 'responsive' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
              <p className="font-medium mb-1">Layout Responsivo ativo</p>
              <ul className="list-disc list-inside space-y-0.5 text-green-700">
                <li>Adapta-se automaticamente ao tamanho da tela</li>
                <li>Modo tabela no desktop, cartão no mobile</li>
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default LayoutTab;
