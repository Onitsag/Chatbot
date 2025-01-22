import { X } from 'lucide-react';

const EMOJI_CATEGORIES = {
  'Récents': ['💬', '🤖', '💡', '📝', '🎯', '🔍', '📚', '💻'],
  'Visages': ['😊', '🤔', '🤓', '🧐', '🤖', '👾', '🤯', '🥳'],
  'Objets': ['💡', '📝', '📚', '💻', '🔍', '🎯', '🎨', '🎮'],
  'Symboles': ['✨', '💫', '🌟', '⭐', '💭', '🗨️', '💬', '🔆']
};

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <div className="absolute left-0 top-0 z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 w-64">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-200">Choisir un émoji</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-400 mb-2">{category}</h4>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    onClose();
                  }}
                  className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}