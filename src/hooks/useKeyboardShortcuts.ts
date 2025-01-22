import { useEffect } from 'react';
import { useStore } from '../store';

export function useKeyboardShortcuts() {
  const { addChat, addProject } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K : Recherche globale
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // TODO: Ouvrir la recherche globale
      }

      // Ctrl/Cmd + N : Nouveau chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        // TODO: Ouvrir le modal de création de chat
      }

      // Ctrl/Cmd + P : Nouveau projet
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        // TODO: Ouvrir le modal de création de projet
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addChat, addProject]);
}