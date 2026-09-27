import React, { useState, useEffect } from 'react';
import { ReportTemplate, REPORT_CATEGORIES } from './types';
import { PortalConfig } from '../../../types';

interface ReportSaveModalProps {
  template: ReportTemplate;
  config: PortalConfig;
  onSave: (data: Partial<ReportTemplate>) => void;
  onClose: () => void;
}

const ReportSaveModal: React.FC<ReportSaveModalProps> = ({ template, config, onSave, onClose }) => {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [category, setCategory] = useState(template.category);
  const [targetLayout, setTargetLayout] = useState(template.target_layout);
  const [contentMode, setContentMode] = useState(template.content_mode);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(template.allowed_users || []);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(template.allowed_groups || []);

  useEffect(() => {
    setName(template.name);
    setDescription(template.description);
    setCategory(template.category);
    setTargetLayout(template.target_layout);
    setContentMode(template.content_mode);
    setSelectedUsers(template.allowed_users || []);
    setSelectedGroups(template.allowed_groups || []);
  }, [template]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      target_layout: targetLayout,
      content_mode: contentMode,
      allowed_users: selectedUsers.length > 0 ? selectedUsers : null,
      allowed_groups: selectedGroups.length > 0 ? selectedGroups : null,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [name, description, category, targetLayout, contentMode, selectedUsers, selectedGroups]);

  const toggleUser = (id: string) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]);
  };

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-moss-800">Salvar Relatório</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-moss-500 outline-none"
              placeholder="Nome do relatório"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-moss-500 outline-none resize-none"
              placeholder="Descrição do relatório"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-moss-500 outline-none"
              >
                {REPORT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Layout</label>
              <select
                value={targetLayout}
                onChange={e => setTargetLayout(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-moss-500 outline-none"
              >
                <option value="responsive">Responsivo</option>
                <option value="web">Web</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Conteúdo</label>
              <select
                value={contentMode}
                onChange={e => setContentMode(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-moss-500 focus:border-moss-500 outline-none"
              >
                <option value="data">Dados</option>
                <option value="charts">Gráficos</option>
                <option value="both">Ambos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Usuários Permitidos</label>
            <div className="border border-gray-300 rounded-lg max-h-28 overflow-y-auto p-2 space-y-1">
              {(config.users || []).map(u => (
                <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
                  />
                  <span className="truncate">{u.name}</span>
                </label>
              ))}
              {(config.users || []).length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum usuário</p>}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Vazio = todos têm acesso</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Grupos Permitidos</label>
            <div className="border border-gray-300 rounded-lg max-h-28 overflow-y-auto p-2 space-y-1">
              {(config.userGroups || []).map(g => (
                <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="rounded border-gray-300 text-moss-600 focus:ring-moss-500"
                  />
                  <span className="truncate">{g.name}</span>
                </label>
              ))}
              {(config.userGroups || []).length === 0 && <p className="text-[10px] text-gray-400 italic">Nenhum grupo</p>}
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">Vazio = todos os grupos</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-moss-700 rounded-lg hover:bg-moss-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportSaveModal;
