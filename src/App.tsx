// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { ProjectPanel } from './components/ProjectPanel';
import { useStore } from './store';
import {
  MessageSquare,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { SettingsModal } from './components/SettingsModal';
import { processOfflineMessages } from './utils/processOfflineMessages';
import { useSwipeable } from 'react-swipeable';

export default function App() {
  const { currentProjectId } = useStore();
  const [view, setView] = useState<'chat' | 'project'>('chat');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Demander la permission pour les notifications au démarrage
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Écouter les messages du service worker pour déclencher la synchronisation hors ligne
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_OFFLINE_MESSAGES') {
          processOfflineMessages();
        }
      });
    }
  }, []);

  // Lorsqu'on repasse en ligne, lancer la synchronisation
  useEffect(() => {
    const handleOnline = () => {
      processOfflineMessages();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Utilisation de react-swipeable pour gérer l'ouverture/fermeture de la sidebar en mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    },
    onSwipedRight: () => {
      if (window.innerWidth < 768) {
        setIsSidebarCollapsed(false);
      }
    },
    trackMouse: true // Pour tester avec la souris
  });

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar principale avec swipe (sur mobile) */}
      <div
        {...swipeHandlers}
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
        className={`fixed left-0 top-0 h-screen overflow-y-auto overflow-x-hidden z-50 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-72'}`}
      >
        <div className={`flex flex-col w-full h-full bg-gray-900 border-r border-gray-700 ${isSidebarCollapsed ? 'items-center' : ''}`}>
          {/* Navigation principale */}
          <div
            className={`flex p-2 gap-2 border-b border-gray-700 ${isSidebarCollapsed ? 'flex-col' : ''
              }`}
          >
            <div className={`flex gap-2 ${isSidebarCollapsed ? 'flex-col' : 'flex-1'}`}>
              <button
                onClick={() => setView('chat')}
                className={`flex items-center gap-2 ${isSidebarCollapsed ? 'w-12 h-12 justify-center' : 'flex-1'
                  } px-4 py-2 rounded-lg transition-colors ${view === 'chat'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <MessageSquare size={20} />
                {!isSidebarCollapsed && 'Chat'}
              </button>
              <button
                onClick={() => setView('project')}
                className={`flex items-center gap-2 ${isSidebarCollapsed ? 'w-12 h-12 justify-center' : 'flex-1'
                  } px-4 py-2 rounded-lg transition-colors ${view === 'project'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
              >
                <FolderOpen size={20} />
                {!isSidebarCollapsed && 'Projet'}
              </button>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center justify-center ${isSidebarCollapsed ? 'w-12 h-12' : 'w-12'
                } text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors`}
              title="Paramètres"
            >
              <Settings size={20} />
            </button>
          </div>

          {/* Sidebar spécifique à la vue */}
          <div className="flex-1 overflow-hidden">
            <Sidebar onViewChange={setView} currentView={view} isCollapsed={isSidebarCollapsed} />
          </div>

        </div>
      </div>

      {/* Contenu principal avec marge à gauche pour la sidebar */}
      <div
        className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-72'} transition-all duration-300 overflow-hidden`}
        onClick={() => {
          if (window.innerWidth < 768 && !isSidebarCollapsed) {
            setIsSidebarCollapsed(true);
          }
        }}
      >
        {view === 'chat' ? <ChatWindow /> : <ProjectPanel />}
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div >
  );
}
