import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export interface LLMKey {
  id: string;
  userId: number;
  modelName: string;
  apiKey: string;
  baseUrl: string;
  isDefault: number;
  createTime: string;
  updateTime: string;
}

export interface ChatSession {
  id: string;
  userId: number;
  title: string;
  createTime: string;
  updateTime: string;
}

export interface ChatMessage {
  id: string;
  userId: number;
  conversationId?: string;
  role: 'assistant' | 'user';
  content: string;
  modelName: string;
  createTime: string;
}

export async function getLLMKeyListApi() {
  return requestClient.get<LLMKey[]>('/llm/key/list');
}

export async function getDefaultLLMKeyApi() {
  return requestClient.get<LLMKey>('/llm/key/default');
}

export async function saveLLMKeyApi(data: Partial<LLMKey>) {
  return requestClient.post('/llm/key', data);
}

export async function updateLLMKeyApi(data: Partial<LLMKey>) {
  return requestClient.put('/llm/key', data);
}

export async function deleteLLMKeyApi(id: string) {
  return requestClient.delete(`/llm/key/${id}`);
}

export async function setDefaultLLMKeyApi(id: string) {
  return requestClient.put(`/llm/key/default/${id}`);
}

export async function chatWithLLMApi(
  prompt: string,
  context?: string,
  conversationId?: string,
) {
  return requestClient.post<string>('/llm/chat', {
    prompt,
    context,
    conversationId,
  });
}

export async function summarizeTimeRecordsApi(type: 'today' | 'week') {
  return requestClient.post<string>('/llm/summarize/time-records', { type });
}

export async function getChatSessionsApi() {
  return requestClient.get<ChatSession[]>('/llm/sessions');
}

export async function createChatSessionApi(title: string) {
  return requestClient.post<ChatSession>('/llm/sessions', { title });
}

export async function updateChatSessionApi(id: string, title: string) {
  return requestClient.put(`/llm/sessions/${id}`, { title });
}

export async function deleteChatSessionApi(id: string) {
  return requestClient.delete(`/llm/sessions/${id}`);
}

export async function getChatHistoryApi(conversationId?: string) {
  return requestClient.get<ChatMessage[]>('/llm/chat/history', {
    params: { conversationId },
  });
}

export async function clearChatHistoryApi(conversationId?: string) {
  return requestClient.delete('/llm/chat/history', {
    params: { conversationId },
  });
}

export function chatWithLLMStreamApi(
  prompt: string,
  context?: string,
  conversationId?: string,
  onData?: (token: string) => void,
  onDone?: () => void,
  onError?: (error: string) => void,
) {
  return {
    start: () => {
      const accessStore = useAccessStore();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      };

      if (accessStore.accessToken) {
        headers.Authorization = `Bearer ${accessStore.accessToken}`;
      }

      fetch('/api/llm/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, context, conversationId }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) {
            throw new Error('No reader available');
          }

          let done = false;
          let buffer = '';

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
              buffer += decoder.decode(value, { stream: true });

              let newlineIndex;
              while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
                const eventStr = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 2);

                const cleanChunk = eventStr
                  .split('\n')
                  .map((line) => line.replace(/^data: ?/, ''))
                  .join('\n');
                const trimmedChunk = cleanChunk.trim();

                if (trimmedChunk === '[DONE]') {
                  onDone?.();
                  return;
                }

                if (trimmedChunk.startsWith('[ERROR] ')) {
                  onError?.(trimmedChunk.replace('[ERROR] ', '').trim());
                  return;
                }

                if (cleanChunk) {
                  onData?.(cleanChunk);
                }
              }
            }
          }

          if (buffer.trim()) {
            const cleanBuffer = buffer
              .split('\n')
              .map((line) => line.replace(/^data: ?/, ''))
              .join('\n');
            const trimmedBuffer = cleanBuffer.trim();
            if (
              cleanBuffer &&
              trimmedBuffer !== '[DONE]' &&
              !trimmedBuffer.startsWith('[ERROR] ')
            ) {
              onData?.(cleanBuffer);
            }
          }

          onDone?.();
        })
        .catch((error) => {
          onError?.(error.message);
        });
    },
  };
}
