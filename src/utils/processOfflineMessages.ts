import { sendMessage } from '../services/ai';
import { useStore } from '../store';
import { getPendingMessages, removePendingMessage } from './offlineMessages';

export async function processOfflineMessages() {
  const pendingMessages = await getPendingMessages();
  if (!pendingMessages.length) return;
  const store = useStore.getState();

  // Grouper les messages pending par chatId
  const messagesByChat = pendingMessages.reduce((acc: Record<string, any[]>, msg) => {
    acc[msg.chatId] = acc[msg.chatId] || [];
    acc[msg.chatId].push(msg);
    return acc;
  }, {} as Record<string, any[]>);

  // Pour chaque chat avec des messages offline
  for (const chatId in messagesByChat) {
    try {
      const chat = store.chats.find(c => c.id === chatId);
      if (!chat) continue;
      const apiKey = store.apiKeys[chat.model.id];
      if (!apiKey) continue;

      // Pour chaque message offline pending, on retire l'indicateur offline dans le store
      for (const offlineMsg of messagesByChat[chatId]) {
        store.clearOfflineFlag(chatId, offlineMsg.id);
      }

      // Construire l'historique complet du chat
      const finalMessages = [
        { role: 'system', content: chat.systemPrompt || '' },
        ...chat.messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content
        }))
      ];

      // Effectuer une seule requête API pour ce chat
      const response = await sendMessage(chat.model, apiKey, finalMessages, chat.images, false);
      // Ajouter la réponse de l'IA dans le chat
      store.addMessage(chatId, 'assistant', response);

      // Supprimer les messages pending pour ce chat de l'IndexedDB
      for (const offlineMsg of messagesByChat[chatId]) {
        await removePendingMessage(offlineMsg.id);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation des messages offline:', error);
    }
  }
}
