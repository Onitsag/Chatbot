import OpenAI from 'openai';
import { AIModel } from '../types';

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt',
    name: 'GPT-4o',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    supportsStreaming: true,
    supportsFunctionCalling: true
  },
  {
    id: 'claude',
    name: 'Claude',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-opus-20240229',
    supportsStreaming: false,
    supportsFunctionCalling: false
  },
  {
    id: 'mistral',
    name: 'Mistral',
    apiEndpoint: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-large-latest',
    supportsStreaming: false,
    supportsFunctionCalling: false
  }
];

export async function generateImageDescription(apiKey: string, base64Image: string): Promise<string> {
  if (!apiKey) {
    throw new Error("Clé API GPT-4 requise pour l'analyse d'images");
  }

  const openai = new OpenAI({ 
    apiKey,
    dangerouslyAllowBrowser: true
  });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Décris cette image de manière très précise. La première phrase est obligatoirement une phrase concise qui résume l'image, commençant par "Tu vois une image qui représente" et de moins de 15 mots. Ensuite tu décris très précisément l'image. S'il y a du texte d'indiqué, tu le répète entièrement. Si l'image est uniquement un screen d'un fichier de code, après la première phrase de ta réponse tu indiqueras uniquement "Code :" suivi de l'entièreté du code affiché sur l'image.` 
            },
            {
              type: "image_url",
              image_url: {
                url: base64Image
              }
            }
          ],
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || 'Description non disponible';
  } catch (error: any) {
    console.error('Erreur lors de la génération de la description:', error);
    throw new Error(`Erreur lors de l'analyse de l'image: ${error.message}`);
  }
}

// Définition des outils avec additionalProperties: false
const tools = [
  {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Get the current time in a specific timezone",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "The timezone to get the time for (e.g. 'Europe/Paris')"
          }
        },
        required: ["timezone"],
        additionalProperties: false
      },
      strict: true
    }
  }
];

function get_current_time(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('fr-FR', { 
      timeZone: timezone, 
      timeStyle: 'medium', 
      dateStyle: 'long' 
    });
    return formatter.format(now);
  } catch (e) {
    return "Fuseau horaire invalide.";
  }
}

/**
 * streamResponse
 * 
 * - Retourne un générateur asynchrone qui envoie les morceaux de texte renvoyés par GPT en streaming.
 * - Accumule également les appels de fonction (function calling) dans finalToolCalls.
 * - À la fin du flux, finalToolCalls contiendra la liste des appels de fonction complétés (arguments JSON reconstitués).
 */
export async function* streamResponse(
  model: AIModel,
  apiKey: string,
  messages: { role: string; content: string }[],
  finalToolCalls: Record<number, { name: string; arguments: string }>
) {
  if (model.id !== 'gpt') {
    throw new Error('Le streaming n\'est supporté que pour GPT-4');
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });

  const stream = await openai.chat.completions.create({
    model: model.defaultModel,
    messages: messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    })),
    stream: true,
    tools: tools,
    store: true,
  });

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    
    // Si on reçoit du texte
    if (choice?.delta?.content) {
      const contentPart = choice.delta.content;
      console.log(`Chunk: ${contentPart}`);
      yield contentPart;
    }

    // Si on reçoit un (ou plusieurs) appels de fonction
    if (choice?.delta?.tool_calls) {
      const calls = choice.delta.tool_calls;
      const callArray = Array.isArray(calls) ? calls : [calls];
      for (const singleCall of callArray) {
        const index = singleCall.index;
        if (index === undefined) continue;

        // Initialisation de la structure de stockage si besoin
        if (!finalToolCalls[index]) {
          finalToolCalls[index] = {
            name: singleCall?.function?.name || '',
            arguments: singleCall?.function?.arguments || ''
          };
        } else {
          // Accumulation des arguments (ils arrivent en fragments)
          finalToolCalls[index].arguments += singleCall?.function?.arguments || '';
        }

        // Mise à jour du nom de fonction si on le reçoit plus tard
        if (!finalToolCalls[index].name && singleCall?.function?.name) {
          finalToolCalls[index].name = singleCall.function.name;
        }
      }
    }
  }
}

/**
 * Exécute un éventuel appel de fonction en local,
 * puis renvoie la réponse finale. 
 */
export async function handleFunctionCallsAndRespond(
  model: AIModel,
  apiKey: string,
  conversationSoFar: { role: string; content: string }[],
  finalToolCalls: Record<number, { name: string; arguments: string }>
): Promise<string> {
  console.log('DEBUG: handleFunctionCallsAndRespond -> finalToolCalls =', finalToolCalls);

  // On exécute pour chaque fonction identifiée
  const callsResults: string[] = [];
  for (const indexString in finalToolCalls) {
    const call = finalToolCalls[indexString];
    console.log(`DEBUG: Traitement de l'appel de fonction index=${indexString}, name=${call.name}, args="${call.arguments}"`);
    
    if (call.name === 'get_current_time') {
      try {
        const params = JSON.parse(call.arguments || '{}');
        const timezone = params.timezone || 'UTC';
        const result = get_current_time(timezone);
        callsResults.push(`Pour le fuseau "${timezone}", l'heure est: ${result}`);
        console.log(`DEBUG: Résultat get_current_time("${timezone}") = ${result}`);
      } catch (e) {
        const errMsg = `Erreur de parsing pour get_current_time: ${e}`;
        callsResults.push(errMsg);
        console.log('DEBUG:', errMsg);
      }
    } else {
      console.log(`DEBUG: Appel de fonction non géré: ${call.name}`);
    }
  }

  if (callsResults.length === 0) {
    console.log('DEBUG: Aucune fonction valide n’a été appelée ou finalisée (callsResults vide).');
    return '';
  }

  const newAssistantMessage = `
Voici les résultats des fonctions appelées :

${callsResults.join('\n')}

Tu dois IMPÉRATIVEMENT intégrer ces informations (sans t'en excuser ou les ignorer) dans ta réponse finale. 
`.trim();

  console.log('DEBUG: Envoi d’un nouveau message (ROLE=system) à GPT avec le résultat des fonctions:\n', newAssistantMessage);

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Remplacez le rôle "assistant" par "system" pour imposer plus fortement la directive 
  const newConversation = [
    ...conversationSoFar,
    { role: 'system', content: newAssistantMessage }
  ];

  const completion = await openai.chat.completions.create({
    model: model.defaultModel,
    messages: newConversation,
    store: true,
    stream: false
  });

  const finalContent = completion.choices[0]?.message?.content || '';
  console.log('DEBUG: GPT renvoie (après fonction) =', finalContent);
  return finalContent;
}


/**
 * sendMessage
 * 
 * Fonction pour l'appel unique (sans streaming) ou usage standard. 
 * Si useStreaming = true, la fonction n'est plus appelée
 * (vous utilisez handleSubmit dans ChatWindow qui appelle streamResponse).
 */
export async function sendMessage(
  model: AIModel,
  apiKey: string,
  messages: { role: string; content: string; selectedImages?: string[] }[],
  chatImages?: { id: string; description: string }[],
  useStreaming: boolean = false
) {
  if (!apiKey) {
    throw new Error(`Veuillez fournir une clé API pour ${model.name}`);
  }

  const processedMessages = messages.map(msg => {
    if (msg.selectedImages?.length && chatImages) {
      let content = msg.content;
      msg.selectedImages.forEach(imgId => {
        const image = chatImages.find(img => img.id === imgId);
        if (image) {
          const imageRef = `[Image ${image.id}]`;
          content = content.replace(imageRef, `[Image: ${image.description}]`);
        }
      });
      return { role: msg.role, content };
    }
    return { role: msg.role, content: msg.content };
  });

  if (useStreaming && model.supportsStreaming) {
    // On n'utilise plus sendMessage en streaming dans l'exemple,
    // handleSubmit de ChatWindow.tsx appelle directement streamResponse.
    // Vous pourriez néanmoins l'adapter si besoin.
    throw new Error('Le streaming direct n’est plus géré ici. Utilisez streamResponse et handleFunctionCallsAndRespond.');
  }

  switch (model.id) {
    case 'gpt': {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true
      });
      const response = await openai.chat.completions.create({
        model: model.defaultModel,
        messages: processedMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        tools: model.supportsFunctionCalling ? tools : undefined,
        store: true,
        stream: false,
      });
      return response.choices[0]?.message?.content || '';
    }
    case 'claude': {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      const body = {
        model: model.defaultModel,
        messages: processedMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      };
      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Erreur avec ${model.name}`);
      }
      return data.content[0]?.text || '';
    }
    case 'mistral': {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      const body = {
        model: model.defaultModel,
        messages: processedMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      };
      const response = await fetch(model.apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Erreur avec ${model.name}`);
      }
      return data.choices[0]?.message?.content || '';
    }
    default:
      throw new Error('Modèle d\'IA non supporté');
  }
}

export { AI_MODELS };
