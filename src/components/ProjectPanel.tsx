import React from 'react';
import { useStore } from '../store';
import { File, Settings, Plus, Trash2, MessageSquare, Upload, Edit2, Check, X } from 'lucide-react';
import { ProjectFile } from '../types';
import { Editor } from './Editor';
import { ProjectModal } from './ProjectModal';
import { ChatWindow } from './ChatWindow';
import { AI_MODELS } from '../services/ai';
import { EmojiPicker } from './EmojiPicker';

export function ProjectPanel() {
  const {
    projects,
    currentProjectId,
    updateProject,
    addFile,
    updateFile,
    deleteFile,
    chats,
    addChat,
    deleteChat,
    currentChatId,
    setCurrentChat,
    setCurrentProject,
    updateChat,
    updateChatEmoji
  } = useStore();

  const [selectedFile, setSelectedFile] = React.useState<ProjectFile | null>(null);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = React.useState(false);
  const [showingChat, setShowingChat] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [editingChatId, setEditingChatId] = React.useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = React.useState('');
  const [editingEmoji, setEditingEmoji] = React.useState<string | null>(null);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const projectChats = chats.filter(chat => chat.projectId === currentProjectId);

  React.useEffect(() => {
    setCurrentChat(null);
  }, [currentProjectId, setCurrentChat]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!currentProject) return;

    const items = Array.from(e.dataTransfer.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    for (const file of files) {
      try {
        const content = await file.text();
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        
        let language = 'plaintext';
        switch (extension) {
          case 'js':
            language = 'javascript';
            break;
          case 'ts':
          case 'tsx':
            language = 'typescript';
            break;
          case 'jsx':
            language = 'javascript';
            break;
          case 'html':
            language = 'html';
            break;
          case 'css':
            language = 'css';
            break;
          case 'json':
            language = 'json';
            break;
          case 'md':
            language = 'markdown';
            break;
          case 'py':
            language = 'python';
            break;
        }

        const newFile = {
          name: file.name,
          path: '/',
          content,
          language,
          lastModified: Date.now()
        };

        addFile(currentProject.id, newFile);
      } catch (error) {
        console.error(`Erreur lors de la lecture du fichier ${file.name}:`, error);
      }
    }
  };

  const handleFileChange = (content: string) => {
    if (!currentProject || !selectedFile) return;
    updateFile(currentProject.id, selectedFile.id, content);
  };

  const handleUpdateProject = (data: { name: string; description: string; systemPrompt: string }) => {
    if (currentProject) {
      updateProject(currentProject.id, data);
    }
  };

  const handleCreateChat = () => {
    if (!currentProject) return;
    addChat(AI_MODELS[0], currentProject.id);
    setShowingChat(true);
  };

  const handleEditChat = (chatId: string, title: string) => {
    setEditingChatId(chatId);
    setEditingChatTitle(title);
  };

  const handleEditChatEmoji = (chatId: string) => {
    setEditingEmoji(chatId);
  };

  const handleSaveChatTitle = (chatId: string) => {
    if (editingChatTitle.trim()) {
      updateChat(chatId, { title: editingChatTitle.trim() });
    }
    setEditingChatId(null);
    setEditingChatTitle('');
  };

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <p className="text-xl text-gray-300 font-medium">Aucun projet sélectionné</p>
          <p className="mt-2 text-gray-400">Sélectionnez ou créez un projet pour commencer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-screen overflow-hidden">
      <div className="w-64 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-white">{currentProject.name}</h1>
            <button
              onClick={() => setIsProjectSettingsOpen(true)}
              className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">{currentProject.description}</p>
        </div>

        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setShowingChat(false)}
              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                !showingChat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Fichiers
            </button>
            <button
              onClick={() => setShowingChat(true)}
              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                showingChat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Chats
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showingChat ? (
            <div className="p-4 space-y-2">
              <button
                onClick={handleCreateChat}
                className="flex items-center gap-2 w-full bg-gray-800 hover:bg-gray-700 text-white rounded-lg p-2.5 transition-colors"
              >
                <Plus size={20} />
                Nouveau chat
              </button>

              {projectChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50'
                  }`}
                  onClick={() => setCurrentChat(chat.id)}
                >
                  {editingChatId === chat.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingChatTitle}
                        onChange={(e) => setEditingChatTitle(e.target.value)}
                        className="flex-1 bg-gray-700 text-white rounded px-2 py-1"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveChatTitle(chat.id)}
                        className="text-green-500 hover:text-green-400"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingChatId(null)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditChatEmoji(chat.id);
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
                        <span className="truncate">{chat.title}</span>
                      </div>
                      <div className="hidden group-hover:flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditChat(chat.id, chat.title);
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
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              <div
                className={`p-4 border-2 border-dashed rounded-lg transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <Upload size={24} className="mb-2" />
                  <p className="text-sm text-center">
                    Glissez et déposez vos fichiers ici
                  </p>
                </div>
              </div>

              {currentProject.files.map((file) => (
                <div
                  key={file.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedFile?.id === file.id
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50'
                  }`}
                  onClick={() => setSelectedFile(file)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File size={16} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFile(currentProject.id, file.id);
                      if (selectedFile?.id === file.id) {
                        setSelectedFile(null);
                      }
                    }}
                    className="hidden group-hover:block text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 h-full overflow-hidden">
        {showingChat ? (
          <ChatWindow projectFiles={currentProject.files} systemPrompt={currentProject.systemPrompt} />
        ) : selectedFile ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-gray-400" />
                  <span className="text-white font-medium">{selectedFile.name}</span>
                </div>
                <span className="text-sm text-gray-400">
                  Dernière modification : {new Date(selectedFile.lastModified).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                value={selectedFile.content}
                language={selectedFile.language}
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <p className="text-xl text-gray-300 font-medium">Aucun fichier sélectionné</p>
              <p className="mt-2 text-gray-400">Sélectionnez un fichier pour commencer à éditer</p>
            </div>
          </div>
        )}
      </div>

      <ProjectModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        onSubmit={handleUpdateProject}
        initialData={currentProject}
        title="Paramètres du projet"
      />
    </div>
  );
}