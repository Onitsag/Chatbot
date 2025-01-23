import React from 'react';
import {
  Send,
  Edit2,
  Check,
  X,
  Loader,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  RotateCw
} from 'lucide-react';
import { useStore } from '../store';
import {
  sendMessage,
  generateImageDescription,
  AI_MODELS,
  streamResponse,
  handleFunctionCallsAndRespond
} from '../services/ai';
import { marked } from 'marked';
import { ProjectFile, ChatImage, AIModel } from '../types';
import 'highlight.js/styles/github-dark.css';

/**
 * ChatWindow
 * - Envoie un message system invisible comme 1er message (prompt system).
 * - Permet de choisir la taille d'historique (2 à 30).
 * - @NomImage: pas de description visible, description seulement pour l'IA.
 */
export function ChatWindow({
  projectFiles,
  systemPrompt
}: {
  projectFiles?: ProjectFile[];
  systemPrompt?: string;
}) {
  const {
    chats,
    currentChatId,
    apiKeys,
    addMessage,
    updateMessage,
    setMessageEditing,
    updateChat,
    addImageToChat,
    deleteImageFromChat
  } = useStore();

  // État local
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isImageLoading, setIsImageLoading] = React.useState(false);
  const [editingContent, setEditingContent] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [selectedImages, setSelectedImages] = React.useState<ChatImage[]>([]);
  const [showImageSuggestions, setShowImageSuggestions] = React.useState(false);
  const [cursorPosition, setCursorPosition] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);
  const [streamingEnabled, setStreamingEnabled] = React.useState(true);
  const [currentResponse, setCurrentResponse] = React.useState('');

  // Nouvelle fonctionnalité : limiter l'historique
  // On lit localStorage si présent, sinon 15
  const [historySize, setHistorySize] = React.useState(() => {
    const saved = localStorage.getItem('historySize');
    return saved ? parseInt(saved, 10) : 15;
  });

  const [isHistoryDropdownOpen, setIsHistoryDropdownOpen] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const suggestionRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const historyDropdownRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Liste locale d'images
  const [localImages, setLocalImages] = React.useState<ChatImage[]>([]);

  // Sélection du chat
  const currentChat = chats.find(chat => chat.id === currentChatId);

  React.useEffect(() => {
    localStorage.setItem('historySize', historySize.toString());
  }, [historySize]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) Synchronisation localImages
  // ─────────────────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (currentChat) {
      setLocalImages([...currentChat.images]);
    }
  }, [currentChat?.id, currentChat?.images.length]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fonctions utilitaires
  // ─────────────────────────────────────────────────────────────────────────────
  function convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  }

  function getRandomSuffix(length: number = 5): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  function getRandomizedName(originalName: string): string {
    const dotIndex = originalName.lastIndexOf('.');
    let base = originalName;
    let ext = '';
    if (dotIndex !== -1) {
      base = originalName.slice(0, dotIndex);
      ext = originalName.slice(dotIndex);
    }
    const suffix = getRandomSuffix(5);
    return `${base}-${suffix}${ext}`;
  }

  // Convertir MarkDown => HTML
  function toHtml(markdown: string) {
    return marked.parse(markdown, { breaks: true }) as string;
  }

  // Repère @NomImage dans un message => renvoie la liste des images
  function getMentionedImages(content: string): ChatImage[] {
    const mentionRegex = /@([^\s]+)/g;
    const result: ChatImage[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const imageName = match[1];
      const found = localImages.find(i => i.name === imageName);
      if (found && !result.some(x => x.id === found.id)) {
        result.push(found);
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) Divers useEffects
  // ─────────────────────────────────────────────────────────────────────────────
  // Focus auto
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.length === 1) {
        const activeElem = document.activeElement as HTMLElement | null;
        if (!activeElem) return;
        const tag = activeElem.tagName.toLowerCase();
        if (tag !== 'textarea' && tag !== 'input') {
          textareaRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Scroll auto
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  // Fermer suggestions
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowImageSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Coller image
  React.useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(it => it.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) {
          await processImage(file);
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [currentChat?.id, apiKeys]);

  // Fermer dropdown IA
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setIsHistoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) Pas de chat => ...
  // ─────────────────────────────────────────────────────────────────────────────
  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-800">
        <div className="text-center">
          <p className="text-xl text-gray-300 font-medium">Aucune conversation sélectionnée</p>
          <p className="mt-2 text-gray-400">Sélectionnez ou créez une conversation pour commencer</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // processImage => rename + desc + store
  // ─────────────────────────────────────────────────────────────────────────────
  async function processImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Le fichier doit être une image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }
    try {
      setError(null);
      setIsImageLoading(true);

      const rName = getRandomizedName(file.name);
      console.log(`[processImage] rename "${file.name}" => "${rName}"`);

      const base64 = await convertToBase64(file);
      if (!currentChat) {
        setError('Aucune conversation sélectionnée');
        return;
      }
      const desc = await generateImageDescription(apiKeys[currentChat.model.id], base64);

      const newImg: ChatImage = {
        id: crypto.randomUUID(),
        base64,
        description: desc,
        name: rName,
        timestamp: Date.now()
      };

      setLocalImages(prev => [...prev, newImg]);
      await addImageToChat(currentChat.id, {
        base64,
        description: desc,
        name: rName,
        timestamp: Date.now()
      });
      console.log('[processImage] Image added =>', rName);
    } catch (err: any) {
      setError(err.message);
      console.error('Erreur lors du traitement de l\'image:', err);
    } finally {
      setIsImageLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // handleStreamingToggle
  // ─────────────────────────────────────────────────────────────────────────────
  function handleStreamingToggle() {
    const newVal = !streamingEnabled;
    setStreamingEnabled(newVal);
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    updateChat(currentChat.id, { streamingEnabled: newVal });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // handleSubmit => envoi
  // ─────────────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && selectedImages.length === 0) return;
    if (isLoading) return;

    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    const apiKey = apiKeys[currentChat.model.id];
    if (!apiKey) {
      setError(`Veuillez entrer une clé API pour ${currentChat.model.name}`);
      return;
    }

    setError(null);

    // Message tapé par l'utilisateur
    const userTyped = input.trim();
    // Copie qu'on enverra à l'IA (avec desc)
    let msgForAI = userTyped;

    // @Nom => @Nom(desc)
    for (const img of localImages) {
      const mention = '@' + img.name;
      if (msgForAI.includes(mention)) {
        msgForAI = msgForAI.replace(
          mention,
          mention + ` (${img.description})`
        );
      }
    }

    setInput('');
    setSelectedImages([]);

    // On stocke visuellement le message user tel que tapé
    addMessage(currentChat.id, 'user', userTyped);

    setIsLoading(true);
    setCurrentResponse('');

    try {
      // Construire un message system invisible
      const systemBase = `Tu es un assistant IA. Réponds brièvement. L'utilisateur peut t'envoyer des images en mentionnant leur nom, exemple "@image.png". Tu peux voir l'image grâce à la description qui se trouve automatiquement entre parenthèse après la mention de l'image en question.\n`;
      const fullSystem = systemPrompt
        ? systemBase + "\n" + systemPrompt
        : systemBase;
      const systemMsg = { role: 'system' as const, content: fullSystem };

      // On retire du store tout ce qui est role=system (s'il y en a)
      const visibleHistory = currentChat.messages.filter(m => m.role !== 'system');

      // On ne prend que les X derniers messages : historySize
      const lastMessages = visibleHistory.slice(-historySize);

      // On construit l'historique final => [system, ...lastMessages, nouveau user]
      const finalMessages = [
        systemMsg,
        ...lastMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: msgForAI }
      ];

      if (streamingEnabled && currentChat.model.supportsStreaming) {
        const finalToolCalls: Record<number, { name: string; arguments: string }> = {};
        const streamGen = streamResponse(currentChat.model, apiKey, finalMessages, finalToolCalls);

        let accum = '';
        for await (const chunk of streamGen) {
          accum += chunk;
          setCurrentResponse(accum);
        }
        // handle calls
        const addRes = await handleFunctionCallsAndRespond(
          currentChat.model,
          apiKey,
          [...finalMessages, { role: 'assistant', content: accum }],
          finalToolCalls
        );
        let finalAnswer = accum.trim();
        if (addRes.trim()) finalAnswer += '\n\n' + addRes.trim();

        if (finalAnswer) {
          addMessage(currentChat.id, 'assistant', finalAnswer);
        }
      } else {
        // Pas streaming
        const resp = await sendMessage(
          currentChat.model,
          apiKey,
          finalMessages,
          currentChat.images,
          false
        );
        addMessage(currentChat.id, 'assistant', resp);
      }
    } catch (err: any) {
      const msg = err.message || 'Une erreur est survenue';
      setError(msg);
      addMessage(currentChat.id, 'assistant', `⚠️ ${msg}`);
    } finally {
      setIsLoading(false);
      setCurrentResponse('');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Édition
  // ─────────────────────────────────────────────────────────────────────────────
  function handleEdit(msg: any) {
    setEditingContent(msg.content);
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    setMessageEditing(currentChat.id, msg.id, true);
  }
  async function handleSaveEdit(msgId: string) {
    // 1. Mettre à jour le contenu du message et sortir du mode édition
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    updateMessage(currentChat.id, msgId, editingContent);
    setMessageEditing(currentChat.id, msgId, false);
  
    // 2. Réacquérir l'état mis à jour du chat depuis le store
    const updatedChat = useStore.getState().chats.find(chat => chat.id === currentChat.id);
    if (!updatedChat) return;
  
    // 3. Trouver l'index du message modifié dans l'état actualisé
    const index = updatedChat.messages.findIndex(m => m.id === msgId);
    if (index === -1) return;
  
    // 4. Tronquer les messages postérieurs au message modifié
    const trimmedMessages = updatedChat.messages.slice(0, index + 1);
    updateChat(updatedChat.id, { messages: trimmedMessages });
  
    // 5. Réinitialiser l'état local d'édition si nécessaire
    setEditingContent('');
  
    // 6. Générer une nouvelle réponse de l'IA basée sur le message modifié
    await generateResponseForLastUser();
  }


  function handleCancelEdit(msgId: string) {
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    setMessageEditing(currentChat.id, msgId, false);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Regenerate
  // ─────────────────────────────────────────────────────────────────────────────
  async function regenerateMessage(assistantMsgId: string) {
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    const idx = currentChat.messages.findIndex(m => m.id === assistantMsgId);
    if (idx === -1) return;
  
    // Vider le contenu du message existant avant régénération
    updateMessage(currentChat.id, assistantMsgId, '');
  
    // Trouver l'index du message utilisateur précédent
    const userIdx = idx - 1;
    if (userIdx < 0 || currentChat.messages[userIdx].role !== 'user') return;
  
    const userMsg = currentChat.messages[userIdx].content;
    setInput('');
    setIsLoading(true);
  
    try {
      const apiKey = apiKeys[currentChat.model.id];
      if (!apiKey) {
        setError(`Veuillez entrer une clé API pour ${currentChat.model.name}`);
        return;
      }
  
      // Construction du message système
      const systemBase = "Tu es Georges, un assistant IA. Réponds brièvement.\n";
      const fullSystem = systemPrompt ? systemBase + "\n" + systemPrompt : systemBase;
      const systemMsg = { role: 'system' as const, content: fullSystem };
  
      // Préparation de l'historique et récupération des X derniers messages
      const visibleHistory = currentChat.messages.filter(m => m.role !== 'system');
      const lastMessages = visibleHistory.slice(0, idx).slice(-historySize);
  
      // Intégration des descriptions d'images dans le message utilisateur si nécessaire
      let userForAI = userMsg;
      for (const img of localImages) {
        const mention = '@' + img.name;
        if (userForAI.includes(mention)) {
          userForAI = userForAI.replace(mention, mention + ` (${img.description})`);
        }
      }
  
      const finalMessages = [
        systemMsg,
        ...lastMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userForAI }
      ];
  
      if (streamingEnabled && currentChat.model.supportsStreaming) {
        const finalToolCalls: Record<number, { name: string; arguments: string }> = {};
        const streamGen = streamResponse(currentChat.model, apiKey, finalMessages, finalToolCalls);
  
        let accum = '';
        for await (const chunk of streamGen) {
          accum += chunk;
          // Mise à jour directe du message existant pendant le streaming
          updateMessage(currentChat.id, assistantMsgId, accum);
        }
  
        const addRes = await handleFunctionCallsAndRespond(
          currentChat.model,
          apiKey,
          [...finalMessages, { role: 'assistant', content: accum }],
          finalToolCalls
        );
  
        let finalAnswer = accum.trim();
        if (addRes.trim()) finalAnswer += '\n\n' + addRes.trim();
  
        if (finalAnswer) {
          // Mise à jour finale du message avec la réponse complète
          updateMessage(currentChat.id, assistantMsgId, finalAnswer);
        }
      } else {
        const resp = await sendMessage(
          currentChat.model,
          apiKey,
          finalMessages,
          currentChat.images,
          false
        );
        updateMessage(currentChat.id, assistantMsgId, resp);
      }
    } catch (err: any) {
      const msg = err.message || 'Une erreur est survenue';
      setError(msg);
      updateMessage(currentChat.id, assistantMsgId, `⚠️ ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function generateResponseForLastUser() {
  // Rechercher le chat actuel directement depuis le store pour obtenir la version mise à jour
  const updatedChat = useStore.getState().chats.find(chat => chat.id === currentChatId);
  if (!updatedChat) return;

  const lastMsg = updatedChat.messages[updatedChat.messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user') return;

  const apiKey = apiKeys[updatedChat.model.id];
  if (!apiKey) {
    setError(`Veuillez entrer une clé API pour ${updatedChat.model.name}`);
    return;
  }

  setError(null);
  setIsLoading(true);
  setCurrentResponse('');

  // Construction du message système et préparation de l’historique
  const systemBase = "Tu es Georges, un assistant IA. Réponds brièvement.\n";
  const fullSystem = systemPrompt ? systemBase + "\n" + systemPrompt : systemBase;
  const systemMsg = { role: 'system' as const, content: fullSystem };

  // Utiliser updatedChat pour construire l'historique
  const visibleHistory = updatedChat.messages.filter(m => m.role !== 'system');
  const lastMessages = visibleHistory.slice(-historySize);

  // Préparation du message utilisateur pour l’IA (intégration des descriptions d’images si nécessaire)
  let msgForAI = lastMsg.content;
  for (const img of localImages) {
    const mention = '@' + img.name;
    if (msgForAI.includes(mention)) {
      msgForAI = msgForAI.replace(mention, mention + ` (${img.description})`);
    }
  }

  const finalMessages = [
    systemMsg,
    ...lastMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: msgForAI }
  ];

  try {
    if (streamingEnabled && updatedChat.model.supportsStreaming) {
      const finalToolCalls: Record<number, { name: string; arguments: string }> = {};
      const streamGen = streamResponse(updatedChat.model, apiKey, finalMessages, finalToolCalls);

      let accum = '';
      for await (const chunk of streamGen) {
        accum += chunk;
        setCurrentResponse(accum);
      }

      const addRes = await handleFunctionCallsAndRespond(
        updatedChat.model,
        apiKey,
        [...finalMessages, { role: 'assistant', content: accum }],
        finalToolCalls
      );

      let finalAnswer = accum.trim();
      if (addRes.trim()) finalAnswer += '\n\n' + addRes.trim();

      if (finalAnswer) {
        addMessage(updatedChat.id, 'assistant', finalAnswer);
      }
    } else {
      const resp = await sendMessage(updatedChat.model, apiKey, finalMessages, updatedChat.images, false);
      addMessage(updatedChat.id, 'assistant', resp);
    }
  } catch (err: any) {
    const msg = err.message || 'Une erreur est survenue';
    setError(msg);
    addMessage(updatedChat.id, 'assistant', `⚠️ ${msg}`);
  } finally {
    setIsLoading(false);
    setCurrentResponse('');
  }
}



  // ─────────────────────────────────────────────────────────────────────────────
  // handleInputKeyDown + handleInputChange
  // ─────────────────────────────────────────────────────────────────────────────
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showImageSuggestions) {
        e.preventDefault();
        const arr = getFilteredImages();
        if (arr.length > 0) {
          insertImageMention(arr[0]);
        }
        return;
      }
      e.preventDefault();
      handleSubmit(e);
    }
  }
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(val);
    setCursorPosition(pos);

    // auto-resize
    e.currentTarget.style.height = 'auto';
    const maxHeight = 200;
    e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, maxHeight) + 'px';
    if (e.currentTarget.scrollHeight > maxHeight) {
      e.currentTarget.style.overflowY = 'auto';
    } else {
      e.currentTarget.style.overflowY = 'hidden';
    }

    // suggestions
    const textBefore = val.substring(0, pos);
    const lastAt = textBefore.lastIndexOf('@');
    if (lastAt !== -1 && !textBefore.includes(' ', lastAt)) {
      const term = textBefore.substring(lastAt + 1).toLowerCase();
      const found = localImages.some(i => i.name.toLowerCase().includes(term));
      setShowImageSuggestions(found);
    } else {
      setShowImageSuggestions(false);
    }
  }

  // Mentions
  function insertImageMention(img: ChatImage) {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const lastAtSymbol = text.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const before = text.substring(0, lastAtSymbol);
      const after = text.substring(lastAtSymbol);
      const spaceIndex = after.indexOf(' ');
      const newText = before + `@${img.name}` + (spaceIndex >= 0 ? after.substring(spaceIndex) : '');
      setInput(newText);
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      setInput(text + `@${img.name}`);
    }
    setSelectedImages(prev => {
      if (!prev.find(i => i.id === img.id)) {
        return [...prev, img];
      }
      return prev;
    });
    setShowImageSuggestions(false);
  }

  function getFilteredImages() {
    const txt = input.substring(0, cursorPosition);
    const lastAt = txt.lastIndexOf('@');
    if (lastAt === -1) return localImages;
    const searchTerm = txt.substring(lastAt + 1).toLowerCase();
    return localImages.filter(i => i.name.toLowerCase().includes(searchTerm));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drag & drop
  // ─────────────────────────────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }
  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const items = Array.from(e.dataTransfer.items);
    const files = items
      .filter(i => i.kind === 'file')
      .map(i => i.getAsFile())
      .filter((f): f is File => f !== null);
    for (const file of files) {
      await processImage(file);
    }
  }

  // handleModelChange
  function handleModelChange(model: AIModel) {
    if (!currentChat) {
      setError('Aucune conversation sélectionnée');
      return;
    }
    updateChat(currentChat.id, { model });
    setIsModelDropdownOpen(false);
  }

  // Handle history size
  function handleHistorySizeChange(size: number) {
    setHistorySize(size);
    setIsHistoryDropdownOpen(false);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={chatContainerRef}
      className="flex flex-col h-full bg-gray-800 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Barre d'en-tête */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold text-white">{currentChat.title}</h1>

        <div className="flex items-center gap-4 relative">
          {/* Switch streaming */}
          {currentChat.model.id === 'gpt' && (
            <button
              onClick={handleStreamingToggle}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 
                         hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
              title={streamingEnabled ? 'Désactiver le streaming' : 'Activer le streaming'}
            >
              {streamingEnabled ? (
                <ToggleRight size={16} className="text-blue-500" />
              ) : (
                <ToggleLeft size={16} />
              )}
              <span>Streaming</span>
            </button>

          )}

          {/* Choix du modèle */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 
                         hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
            >
              <span>{currentChat.model.name}</span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  isModelDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isModelDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg
                           border border-gray-600 py-1 z-50"
              >
                {AI_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleModelChange(m)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-600 transition-colors ${
                      currentChat.model.id === m.id ? 'bg-gray-600 text-white' : 'text-gray-200'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Choix de la taille d'historique */}
          <div className="relative" ref={historyDropdownRef}>
            <button
              onClick={() => setIsHistoryDropdownOpen(!isHistoryDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 
                         hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
              title="Nombre de messages de l'historique"
            >
              <span>Hist: {historySize}</span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${
                  isHistoryDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {isHistoryDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-20 bg-gray-700 rounded-lg shadow-lg
                           border border-gray-600 py-1 z-50 max-h-48 overflow-y-auto"
              >
                {[...Array(29)].map((_, i) => i + 2).map((num) => (
                  <button
                    key={num}
                    onClick={() => handleHistorySizeChange(num)}
                    className={`w-full px-4 py-1 text-left hover:bg-gray-600 transition-colors ${
                      historySize === num ? 'bg-gray-600 text-white' : 'text-gray-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay drag & drop */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed
                       rounded-lg flex items-center justify-center z-50"
        >
          <div className="text-blue-500 text-lg font-medium">
            Déposez votre image ici
          </div>
        </div>
      )}

      {/* Overlay chargement d'image */}
      {isImageLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-3">
            <Loader className="animate-spin text-blue-500" size={24} />
            <span className="text-white">Analyse de l'image en cours...</span>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="m-4 bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Liste de messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentChat.messages.map((message, idx) => {
          // On ignore role=system visuellement
          if (message.role === 'system') return null;

          const isLastAssistant = (message.role === 'assistant') && (idx === currentChat.messages.length - 1);
          const senderName = (message.role === 'user') ? 'Vous' : currentChat.model.name;

          // On convertit en HTML
          const html = toHtml(message.content);
          // Images mentionnées
          const mentionImages = getMentionedImages(message.content);

          return (
            <div
              key={message.id}
              className={`group max-w-2xl ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
            >
              <div
                className={`
                  rounded-lg p-4 relative
                  ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}
                `}
                style={{ paddingTop: '3rem' }}
              >
                {/* Nom + actions */}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-100">{senderName}</span>
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(message)}
                    className="text-gray-300 hover:text-white transition-colors"
                    title="Éditer ce message"
                  >
                    <Edit2 size={16} />
                  </button>
                  {isLastAssistant && message.role === 'assistant' && (
                    <button
                      onClick={() => regenerateMessage(message.id)}
                      className="text-gray-300 hover:text-white transition-colors"
                      title="Regénérer ce message"
                    >
                      <RotateCw size={16} />
                    </button>
                  )}
                </div>

                {message.isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded p-2 min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSaveEdit(message.id)}
                        className="text-green-500 hover:text-green-400"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => handleCancelEdit(message.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    dangerouslySetInnerHTML={{ __html: html }}
                    className="prose prose-invert max-w-none"
                  />
                )}
              </div>

              {/* Miniatures d'images mentionnées */}
              {mentionImages.length > 0 && (
                <div className={`flex gap-2 mt-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {mentionImages.map(img => (
                    <div key={img.id} className="w-12 h-12 rounded-lg overflow-hidden">
                      <img
                        src={img.base64}
                        alt={img.description}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Affichage streaming */}
        {isLoading && currentResponse && (
          <div className="group max-w-2xl mr-auto">
            <div className="rounded-lg p-4 bg-gray-700 text-white">
              {currentResponse}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Galerie images en bas */}
      {localImages.length > 0 && (
        <div className="p-2 border-t border-gray-700 bg-gray-850">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
            {localImages.map((img) => (
              <div
                key={img.id}
                className={`
                  flex-shrink-0 group relative w-12 h-12 rounded-lg overflow-hidden
                  ${selectedImages.find(i => i.id === img.id) ? 'ring-2 ring-blue-500' : ''}
                `}
              >
                <div
                  onClick={() => insertImageMention(img)}
                  className="w-full h-full cursor-pointer"
                  title={img.description}
                >
                  <img
                    src={img.base64}
                    alt={img.description}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => {
                    deleteImageFromChat(currentChat.id, img.id);
                    setLocalImages(prev => prev.filter(i => i.id !== img.id));
                    setSelectedImages(prev => prev.filter(i => i.id !== img.id));
                  }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-red-500
                             text-white rounded-full transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de saisie */}
      <form onSubmit={handleSubmit} className="relative p-4 border-t border-gray-700">
        {showImageSuggestions && (
          <div
            ref={suggestionRef}
            className="absolute bottom-full mb-2 w-full bg-gray-800
                       rounded-lg border border-gray-700 shadow-lg
                       max-h-48 overflow-y-auto"
          >
            {getFilteredImages().map(img => (
              <div
                key={img.id}
                onClick={() => insertImageMention(img)}
                className="flex items-center gap-2 p-2 hover:bg-gray-700 cursor-pointer"
              >
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={img.base64}
                    alt={img.description}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-white font-medium">{img.name}</span>
                  <span className="text-xs text-gray-400 truncate">{img.description}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Écrivez votre message... (Shift+Entrée pour une nouvelle ligne, Entrée pour envoyer)"
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              minHeight: '50px',
              maxHeight: '200px',
              resize: 'vertical',
              overflowY: 'hidden'
            }}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
            className="bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send size={20} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </form>
    </div>
  );
}