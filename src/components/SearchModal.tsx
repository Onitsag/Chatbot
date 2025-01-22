import React from 'react';
import { Search, File, MessageSquare, FolderOpen } from 'lucide-react';
import { useStore } from '../store';

interface SearchResult {
  id: string;
  type: 'chat' | 'project' | 'file';
  title: string;
  subtitle?: string;
}

export function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { chats, projects } = useStore();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    // Recherche dans les chats
    chats.forEach(chat => {
      if (chat.title.toLowerCase().includes(searchTerm)) {
        searchResults.push({
          id: chat.id,
          type: 'chat',
          title: chat.title,
          subtitle: `Chat - ${chat.model.name}`
        });
      }
    });

    // Recherche dans les projets et leurs fichiers
    projects.forEach(project => {
      if (project.name.toLowerCase().includes(searchTerm)) {
        searchResults.push({
          id: project.id,
          type: 'project',
          title: project.name,
          subtitle: 'Projet'
        });
      }

      project.files.forEach(file => {
        if (file.name.toLowerCase().includes(searchTerm)) {
          searchResults.push({
            id: file.id,
            type: 'file',
            title: file.name,
            subtitle: `Fichier - ${project.name}`
          });
        }
      });
    });

    setResults(searchResults);
  }, [query, chats, projects]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-50 animate-fade-in">
      <div className="w-full max-w-2xl bg-zinc-900 rounded-lg shadow-xl border border-zinc-800">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Search className="text-zinc-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="flex-1 bg-transparent text-white placeholder-zinc-400 focus:outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  {result.type === 'chat' && <MessageSquare size={18} className="text-zinc-400" />}
                  {result.type === 'project' && <FolderOpen size={18} className="text-zinc-400" />}
                  {result.type === 'file' && <File size={18} className="text-zinc-400" />}
                  <div>
                    <div className="text-white">{result.title}</div>
                    {result.subtitle && (
                      <div className="text-sm text-zinc-400">{result.subtitle}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : query ? (
            <div className="p-4 text-center text-zinc-400">
              Aucun résultat trouvé pour "{query}"
            </div>
          ) : (
            <div className="p-4 text-center text-zinc-400">
              Commencez à taper pour rechercher
            </div>
          )}
        </div>
      </div>
    </div>
  );
}