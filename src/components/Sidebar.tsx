import React from 'react';
import { Plus, Trash2, Edit2, Check, X, FolderOpen } from 'lucide-react';
import { useStore } from '../store';
import { AI_MODELS } from '../services/ai';
import { ProjectModal } from './ProjectModal';
import { EmojiPicker } from './EmojiPicker';

interface SidebarProps {
  onViewChange: (view: 'chat' | 'project') => void;
  currentView: 'chat' | 'project';
  isCollapsed: boolean;
}

export function Sidebar({ currentView, onViewChange, isCollapsed }: SidebarProps) {
  const {
    chats,
    currentChatId,
    addChat,
    deleteChat,
    setCurrentChat,
    updateChatTitle,
    updateChatEmoji,
    projects,
    currentProjectId,
    addProject,
    deleteProject,
    setCurrentProject,
    updateProject
  } = useStore();

  const [editingTitle, setEditingTitle] = React.useState<string | null>(null);
  const [tempTitle, setTempTitle] = React.useState('');
  const [selectedModel, setSelectedModel] = React.useState(AI_MODELS[0]);
  const [isProjectModalOpen, setIsProjectModalOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<string | null>(null);
  const [editingEmoji, setEditingEmoji] = React.useState<string | null>(null);

  const generalChats = chats.filter(chat => !chat.projectId);

  const handleEditTitle = (id: string, title: string) => {
    setEditingTitle(id);
    setTempTitle(title);
  };

  const handleSaveTitle = (id: string) => {
    if (tempTitle.trim()) {
      updateChatTitle(id, tempTitle.trim());
    }
    setEditingTitle(null);
  };

  const handleCreateProject = (data: { name: string; description: string; systemPrompt: string }) => {
    addProject(data.name, data.description, data.systemPrompt);
    onViewChange('project');
  };

  const handleUpdateProject = (data: { name: string; description: string; systemPrompt: string }) => {
    if (editingProject) {
      updateProject(editingProject, data);
      setEditingProject(null);
    }
  };

  const handleEditProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setEditingProject(projectId);
      setIsProjectModalOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {currentView === 'chat' ? (
        <>
          <div className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between p-4'}`}>
            {isCollapsed ? (
              <button
                onClick={() => addChat(selectedModel)}
                className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-colors"
                title="Nouvelle conversation"
              >
                <Plus size={24} />
              </button>
            ) : (
              <button
                onClick={() => addChat(selectedModel)}
                className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 transition-colors"
              >
                <Plus size={20} />
                Nouvelle conversation
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 p-4">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                {generalChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setCurrentChat(chat.id)}
                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                      chat.id === currentChatId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                    title={chat.title}
                  >
                    {chat.emoji}
                  </button>
                ))}
              </div>
            ) : (
              generalChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50'
                  }`}
                  onClick={() => setCurrentChat(chat.id)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEmoji(chat.id);
                      }}
                      className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded transition-colors"
                    >
                      {chat.emoji}
                    </button>
                    {editingEmoji === chat.id && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker
                          onSelect={(emoji) => {
                            updateChatEmoji(chat.id, emoji);
                            setEditingEmoji(null);
                          }}
                          onClose={() => setEditingEmoji(null)}
                        />
                      </div>
                    )}
                    {editingTitle === chat.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={tempTitle}
                          onChange={(e) => setTempTitle(e.target.value)}
                          className="flex-1 bg-gray-700 text-white rounded px-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveTitle(chat.id);
                          }}
                          className="text-green-500 hover:text-green-400"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(null);
                          }}
                          className="text-red-500 hover:text-red-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{chat.title}</span>
                        <div className="hidden group-hover:flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTitle(chat.id, chat.title);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.id);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {!isCollapsed && (
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 transition-colors mb-4"
            >
              <Plus size={20} />
              Nouveau projet
            </button>
          )}

          {!isCollapsed && projects.map((project) => (
            <div
              key={project.id}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                project.id === currentProjectId
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800/50'
              }`}
              onClick={() => setCurrentProject(project.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FolderOpen size={18} />
                <span className="truncate">{project.name}</span>
              </div>
              <div className="hidden group-hover:flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditProject(project.id);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteProject(project.id);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        initialData={editingProject ? projects.find(p => p.id === editingProject) : undefined}
        title={editingProject ? 'Modifier le projet' : 'Nouveau projet'}
      />
    </div>
  );
}