export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isEditing?: boolean;
  selectedImages?: string[];
}

export interface ChatImage {
  id: string;
  base64: string;
  description: string;
  name: string;
  timestamp: number;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  lastModified: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  files: ProjectFile[];
  created: number;
  lastModified: number;
}

export interface HistoryBranch {
  baseMessageId: string; 
  branchIndex: number; 
  messages: Message[]; 
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: AIModel;
  projectId?: string;
  emoji: string;
  images: ChatImage[];
  streamingEnabled: boolean;
}

export interface AIModel {
  id: 'gpt' | 'claude' | 'mistral';
  name: string;
  apiEndpoint: string;
  defaultModel: string;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
}

export interface AppState {
  chats: Chat[];
  projects: Project[];
  currentChatId: string | null;
  currentProjectId: string | null;
  apiKeys: Record<string, string>;
  
  getCurrentChat: () => Chat | null;
  
  addChat: (model: AIModel, projectId?: string) => void;
  deleteChat: (id: string) => void;
  setCurrentChat: (id: string | null) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  addMessage: (
    chatId: string, 
    role: Message['role'], 
    content: string, 
    selectedImages?: string[]
  ) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
  setMessageEditing: (chatId: string, messageId: string, isEditing: boolean) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  updateChatEmoji: (chatId: string, emoji: string) => void;
  addImageToChat: (chatId: string, image: Omit<ChatImage, 'id'>) => string;
  deleteImageFromChat: (chatId: string, imageId: string) => void;
  
  addProject: (name: string, description: string, systemPrompt: string) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  addFile: (projectId: string, file: Omit<ProjectFile, 'id'>) => void;
  updateFile: (projectId: string, fileId: string, content: string) => void;
  deleteFile: (projectId: string, fileId: string) => void;
  
  setApiKey: (modelId: string, apiKey: string) => void;
}