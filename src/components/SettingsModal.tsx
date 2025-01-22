import { X } from 'lucide-react';
import { useStore } from '../store';
import { AI_MODELS } from '../services/ai';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { apiKeys, setApiKey } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">Paramètres</h2>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Clés API</h3>
            {AI_MODELS.map((model) => (
              <div key={model.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  {model.name}
                </label>
                <input
                  type="password"
                  value={apiKeys[model.id] || ''}
                  onChange={(e) => setApiKey(model.id, e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg p-2.5 border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  placeholder={`Clé API ${model.name}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}