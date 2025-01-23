import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, Chat, AIModel, Project, ProjectFile, ChatImage, Message } from './types';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      chats: [],
      projects: [],
      currentChatId: null,
      currentProjectId: null,
      apiKeys: {},

      addChat: (model: AIModel, projectId?: string) => {
        const newChat: Chat = {
          id: crypto.randomUUID(),
          title: 'Nouvelle conversation',
          messages: [],
          model,
          projectId,
          emoji: '💬',
          images: [],
          streamingEnabled: true
        };

        set((state) => ({
          chats: [...state.chats, newChat],
          currentChatId: newChat.id
        }));
      },

      deleteChat: (id: string) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId
        }));
      },

      setCurrentChat: (id: string | null) => {
        set({ currentChatId: id });
      },

      updateChat: (id: string, updates: Partial<Chat>) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === id ? { ...chat, ...updates } : chat
          )
        }));
      },

      addMessage: (chatId: string, role: Message['role'], content: string, selectedImages?: string[]) => {
        const message = {
          id: crypto.randomUUID(),
          role,
          content,
          timestamp: Date.now(),
          isEditing: false,
          selectedImages
        };

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, messages: [...chat.messages, message] }
              : chat
          )
        }));
      },

      updateMessage: (chatId: string, messageId: string, content: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg) =>
                    msg.id === messageId
                      ? { ...msg, content, isEditing: false }
                      : msg
                  )
                }
              : chat
          )
        }));
      },

      setMessageEditing: (chatId: string, messageId: string, isEditing: boolean) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((msg) =>
                    msg.id === messageId ? { ...msg, isEditing } : msg
                  )
                }
              : chat
          )
        }));
      },

      updateChatTitle: (chatId: string, title: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, title } : chat
          )
        }));
      },

      updateChatEmoji: (chatId: string, emoji: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, emoji } : chat
          )
        }));
      },

      addImageToChat: (chatId: string, image: Omit<ChatImage, 'id'>) => {
        const newImage: ChatImage = {
          ...image,
          id: crypto.randomUUID()
        };

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { 
                  ...chat, 
                  images: Array.isArray(chat.images) 
                    ? [...chat.images, newImage]
                    : [newImage]
                }
              : chat
          )
        }));

        return newImage.id;
      },

      deleteImageFromChat: (chatId: string, imageId: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  images: Array.isArray(chat.images) 
                    ? chat.images.filter((img) => img.id !== imageId)
                    : [],
                  messages: chat.messages.map((msg) => ({
                    ...msg,
                    selectedImages: msg.selectedImages?.filter((id) => id !== imageId)
                  }))
                }
              : chat
          )
        }));
      },

      getCurrentChat: () => {
        const state = get();
        return state.currentChatId ? (state.chats.find(c => c.id === state.currentChatId) || null) : null;
      },

      addProject: (name: string, description: string, systemPrompt: string) => {
        const newProject: Project = {
          id: crypto.randomUUID(),
          name,
          description,
          systemPrompt,
          files: [],
          created: Date.now(),
          lastModified: Date.now(),
          selectedFiles: new Set<string>(),
          directoryHandle: null
        };

        set((state) => ({
          projects: [...state.projects, newProject],
          currentProjectId: newProject.id
        }));
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
          chats: state.chats.filter((chat) => chat.projectId !== id)
        }));
      },

      setCurrentProject: (id: string | null) => {
        set({ currentProjectId: id });
      },

      updateProject: (id: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id
              ? { ...project, ...updates, lastModified: Date.now() }
              : project
          )
        }));
      },

      addFile: (projectId: string, file: Omit<ProjectFile, 'id'>) => {
        const newFile: ProjectFile = {
          ...file,
          id: crypto.randomUUID()
        };

        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  files: [...project.files, newFile],
                  lastModified: Date.now()
                }
              : project
          )
        }));
      },

      updateFile: (projectId: string, fileId: string, content: string) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  files: project.files.map((file) =>
                    file.id === fileId
                      ? { ...file, content, lastModified: Date.now() }
                      : file
                  ),
                  lastModified: Date.now()
                }
              : project
          )
        }));
      },

      deleteFile: (projectId: string, fileId: string) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  files: project.files.filter((file) => file.id !== fileId),
                  lastModified: Date.now()
                }
              : project
          )
        }));
      },

      setApiKey: (modelId: string, apiKey: string) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [modelId]: apiKey }
        }));
      },

      setProjectDirectory: (projectId: string, handle: FileSystemDirectoryHandle | null) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, directoryHandle: handle }
              : project
          )
        }));
      }
    }),
    {
      name: 'ai-chat-storage',
      partialize: (state) => ({
        chats: state.chats,
        projects: state.projects.map(project => ({
          ...project,
          directoryHandle: undefined // Ne pas persister le handle
        })),
        apiKeys: state.apiKeys
      })
    }
  )
);