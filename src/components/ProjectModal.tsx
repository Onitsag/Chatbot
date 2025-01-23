import React from 'react';
import { X } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; systemPrompt: string }) => void;
  initialData?: {
    name: string;
    description: string;
    systemPrompt: string;
    selectedFiles?: Set<string>;
    fileContents?: Record<string, string>;
  };
  title: string;
}

export function ProjectModal({ isOpen, onClose, onSubmit, initialData, title }: ProjectModalProps) {
  const [formData, setFormData] = React.useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    systemPrompt: initialData?.systemPrompt || ''
  });

  // Générer le prompt système complet avec les fichiers sélectionnés
  const fullSystemPrompt = React.useMemo(() => {
    let prompt = formData.systemPrompt;

    if (initialData?.selectedFiles?.size && initialData.fileContents) {
      prompt += '\n\nVoici les fichiers du projet :\n';
      
      initialData.selectedFiles.forEach(path => {
        const content = initialData.fileContents ? initialData.fileContents[path] : '';
        if (content) {
          const fileName = path.split('/').pop();
          prompt += `\n\`\`${fileName}\`\`\n\`\`\`\n${content}\n\`\`\`\n`;
        }
      });
    }

    return prompt;
  }, [formData.systemPrompt, initialData?.selectedFiles, initialData?.fileContents]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-4xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Nom du projet *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Prompt système
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="Instructions générales pour l'IA concernant ce projet..."
              className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[100px]"
            />
          </div>

          {initialData?.selectedFiles?.size ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Prompt système complet (avec fichiers sélectionnés)
              </label>
              <pre className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700 overflow-auto max-h-[400px] text-xs">
                {fullSystemPrompt}
              </pre>
            </div>
          ) : null}

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={!formData.name.trim()}
            >
              {initialData ? 'Mettre à jour' : 'Créer le projet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}