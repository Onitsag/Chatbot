import { useStore } from '../store';
import { useFileSystem } from '../hooks/useFileSystem';
import { FileTree } from './FileTree';
import { File, Settings, Plus, Trash2, MessageSquare, Upload, Edit2, Check, X, FolderOpen } from 'lucide-react';
import { ProjectFile } from '../types';
import { Editor } from './Editor';
import { ProjectModal } from './ProjectModal';
import { ChatWindow } from './ChatWindow';
import { AI_MODELS } from '../services/ai';
import { EmojiPicker } from './EmojiPicker';
import { useState, useEffect, useRef } from 'react';

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

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [showingChat, setShowingChat] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatTitle, setEditingChatTitle] = useState('');
  const [editingEmoji, setEditingEmoji] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<number | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  const renameInputRef = useRef<HTMLInputElement>(null);

  const {
    isPWA,
    hasFileSystemAccess,
    fileTree,
    isLoading,
    requestFileSystemAccess,
    readFileContent,
    writeFileContent,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    refreshFileTree,
    watchFileChanges,
    moveEntry,
    copyEntry,
    fileStats,
    rootDirectory,
    getAllFilesInDirectory
  } = useFileSystem();

  const currentProject = projects.find(p => p.id === currentProjectId);
  const projectChats = chats.filter(chat => chat.projectId === currentProjectId);

  // Reset du chat courant quand on change de projet
  useEffect(() => {
    setCurrentChat(null);
  }, [currentProjectId, setCurrentChat]);

  // Surveillance des changements de fichiers
  useEffect(() => {
    if (hasFileSystemAccess) {
      const unwatch = watchFileChanges(async (path) => {
        if (selectedFile && path === selectedFile.path) {
          const content = await readFileContent(path);
          setSelectedFile(prev => prev ? { ...prev, content } : null);
        }
        refreshFileTree();
      });
      return unwatch;
    }
  }, [hasFileSystemAccess, selectedFile, watchFileChanges, readFileContent, refreshFileTree]);

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges && selectedFile) {
      const interval = window.setInterval(async () => {
        try {
          await handleSaveFile();
          console.log('Auto-saved:', selectedFile.path);
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 30000);

      setAutoSaveInterval(interval);
      return () => clearInterval(interval);
    }
    return () => {};
  }, [hasUnsavedChanges, selectedFile]);

  // Nettoyage de l'intervalle d'auto-save
  useEffect(() => {
    return () => {
      if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
      }
    };
  }, [autoSaveInterval]);

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && selectedFile) {
        e.preventDefault();
        await handleSaveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile]);

  // Mise à jour des fichiers sélectionnés dans le projet
  useEffect(() => {
    if (currentProject && currentProject.selectedFiles) {
      // Convertir l'objet Set sérialisé en véritable Set
      const files = Array.isArray(currentProject.selectedFiles) 
        ? new Set(currentProject.selectedFiles)
        : new Set();
      setSelectedFiles(files);
    } else {
      setSelectedFiles(new Set());
    }
  }, [currentProject]);

  // Chargement du contenu des fichiers sélectionnés
  useEffect(() => {
    const loadSelectedFilesContent = async () => {
      const contents: Record<string, string> = {};
      for (const path of selectedFiles) {
        try {
          contents[path] = await readFileContent(path);
        } catch (error) {
          console.error(`Error loading content for ${path}:`, error);
        }
      }
      setFileContents(contents);
    };

    if (selectedFiles.size > 0) {
      loadSelectedFilesContent();
    }
  }, [selectedFiles, readFileContent]);

  // Gestion des chats
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

  // Gestion des fichiers
  const handleFileSelect = async (path: string) => {
    if (!hasFileSystemAccess) return;

    if (hasUnsavedChanges) {
      const confirm = window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous continuer ?');
      if (!confirm) return;
    }

    try {
      const content = await readFileContent(path);
      const extension = path.split('.').pop()?.toLowerCase() || '';

      let language = 'plaintext';
      switch (extension) {
        case 'js': language = 'javascript'; break;
        case 'ts':
        case 'tsx': language = 'typescript'; break;
        case 'jsx': language = 'javascript'; break;
        case 'html': language = 'html'; break;
        case 'css': language = 'css'; break;
        case 'json': language = 'json'; break;
        case 'md': language = 'markdown'; break;
        case 'py': language = 'python'; break;
      }

      const file: ProjectFile = {
        id: path,
        name: path.split('/').pop() || '',
        path,
        content,
        language,
        lastModified: Date.now()
      };

      setSelectedFile(file);
      setLastSavedContent(content);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
    }
  };

  const handleFileChange = async (content: string) => {
    if (!selectedFile) return;
    setSelectedFile(prev => prev ? { ...prev, content } : null);
    setHasUnsavedChanges(content !== lastSavedContent);
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !hasUnsavedChanges) return;

    try {
      await writeFileContent(selectedFile.path, selectedFile.content);
      setLastSavedContent(selectedFile.content);
      setHasUnsavedChanges(false);
      console.log('File saved:', selectedFile.path);
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const handleCreateFile = async (path: string) => {
    try {
      await createFile(path);
      await refreshFileTree();
      handleFileSelect(path);
    } catch (error) {
      console.error('Error creating file:', error);
    }
  };

  const handleCreateDirectory = async (path: string) => {
    try {
      await createDirectory(path);
      await refreshFileTree();
      setExpandedFolders(prev => new Set([...prev, path]));
    } catch (error) {
      console.error('Error creating directory:', error);
    }
  };

  const handleDeleteEntry = async (path: string) => {
    const confirm = window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?');
    if (!confirm) return;

    try {
      if (selectedFile?.path === path) {
        setSelectedFile(null);
      }
      await deleteEntry(path);
      await refreshFileTree();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleRename = (path: string) => {
    setIsRenaming(path);
    setNewName(path.split('/').pop() || '');
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameSubmit = async (oldPath: string) => {
    if (!newName.trim()) return;

    try {
      const parts = oldPath.split('/');
      parts.pop();
      const newPath = [...parts, newName].join('/');

      await renameEntry(oldPath, newPath);

      if (selectedFile?.path === oldPath) {
        setSelectedFile(prev => prev ? { ...prev, path: newPath, name: newName } : null);
      }

      setIsRenaming(null);
      setNewName('');
      await refreshFileTree();
    } catch (error) {
      console.error('Error renaming entry:', error);
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileSelectionChange = async (path: string, selected: boolean, isDirectory?: boolean) => {
    const newSelectedFiles = new Set(selectedFiles);
    
    if (isDirectory) {
      try {
        const files = await getAllFilesInDirectory(path);
        if (selected) {
          files.forEach(file => newSelectedFiles.add(file));
          for (const file of files) {
            try {
              const content = await readFileContent(file);
              setFileContents(prev => ({ ...prev, [file]: content }));
            } catch (error) {
              console.error(`Error loading content for ${file}:`, error);
            }
          }
        } else {
          files.forEach(file => {
            newSelectedFiles.delete(file);
            setFileContents(prev => {
              const next = { ...prev };
              delete next[file];
              return next;
            });
          });
        }
      } catch (error) {
        console.error(`Error processing directory ${path}:`, error);
      }
    } else {
      if (selected) {
        newSelectedFiles.add(path);
        try {
          const content = await readFileContent(path);
          setFileContents(prev => ({ ...prev, [path]: content }));
        } catch (error) {
          console.error(`Error loading content for ${path}:`, error);
        }
      } else {
        newSelectedFiles.delete(path);
        setFileContents(prev => {
          const next = { ...prev };
          delete next[path];
          return next;
        });
      }
    }
    
    setSelectedFiles(newSelectedFiles);
    
    if (currentProject) {
      updateProject(currentProject.id, { selectedFiles: newSelectedFiles });
    }
  };

  // Drag & drop
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

    if (!hasFileSystemAccess) {
      alert('Veuillez d\'abord sélectionner un dossier de travail');
      return;
    }

    const items = Array.from(e.dataTransfer.items);
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (!file) continue;

        try {
          const content = await file.text();
          await createFile(file.name, content);
        } catch (error) {
          console.error('Error processing dropped file:', error);
        }
      }
    }

    await refreshFileTree();
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
      {/* Sidebar gauche */}
      <div className="w-64 border-r border-gray-700 flex flex-col">
        {/* En-tête du projet */}
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

        {/* Sélecteur de vue (Chats/Fichiers) */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
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
          </div>
        </div>

        {/* Contenu de la sidebar */}
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
              {isPWA ? (
                hasFileSystemAccess ? (
                  <div
                    className="space-y-2"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isDragging && (
                      <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center z-50">
                        <div className="text-blue-500 text-lg font-medium">
                          Déposez vos fichiers ici
                        </div>
                      </div>
                    )}

                    {fileTree && (
                      <FileTree
                        tree={fileTree}
                        onFileSelect={handleFileSelect}
                        onCreateFile={handleCreateFile}
                        onCreateDirectory={handleCreateDirectory}
                        onRename={handleRename}
                        onDelete={handleDeleteEntry}
                        onMove={moveEntry}
                        onCopy={copyEntry}
                        expandedFolders={expandedFolders}
                        onToggleFolder={toggleFolder}
                        fileStats={fileStats}
                        rootDirectory={rootDirectory}
                        selectedFiles={selectedFiles}
                        onFileSelectionChange={handleFileSelectionChange}
                      />
                    )}
                  </div>
                ) : (
                  <button
                    onClick={requestFileSystemAccess}
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2.5 transition-colors disabled:opacity-50"
                  >
                    <FolderOpen size={20} />
                    {isLoading ? 'Chargement...' : 'Sélectionner un dossier'}
                  </button>
                )
              ) : (
                <div className="text-center p-4 bg-gray-800 rounded-lg">
                  <p className="text-gray-300 mb-2">
                    Pour accéder aux fichiers de votre système, veuillez installer l'application.
                  </p>
                  <p className="text-sm text-gray-400">
                    Cliquez sur l'icône d'installation dans la barre d'adresse de votre navigateur.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Zone principale */}
      <div className="flex-1 h-full overflow-hidden">
        {showingChat ? (
          <ChatWindow
            projectFiles={currentProject.files}
            systemPrompt={currentProject.systemPrompt}
          />
        ) : selectedFile ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File size={16} className="text-gray-400" />
                  <span className="text-white font-medium">{selectedFile.path}</span>
                  {hasUnsavedChanges && (
                    <span className="text-yellow-500 text-sm">•</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {hasUnsavedChanges && (
                    <button
                      onClick={handleSaveFile}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                    >
                      Sauvegarder
                    </button>
                  )}
                </div>
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
              <p className="mt-2 text-gray-400">
                {isPWA
                  ? hasFileSystemAccess
                    ? 'Sélectionnez un fichier dans l\'arborescence pour commencer à éditer'
                    : 'Sélectionnez un dossier pour accéder à vos fichiers'
                  : 'Installez l\'application pour accéder à vos fichiers'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal des paramètres du projet */}
      <ProjectModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        onSubmit={(data) => {
          updateProject(currentProject.id, data);
          setIsProjectSettingsOpen(false);
        }}
        initialData={{
          ...currentProject,
          selectedFiles,
          fileContents
        }}
        title="Paramètres du projet"
      />
    </div>
  );
}