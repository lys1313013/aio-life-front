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

              while (true) {
                const doneIndex = buffer.indexOf('[DONE]');
                const errorIndex = buffer.indexOf('[ERROR] ');

                if (doneIndex !== -1) {
                  const beforeDone = buffer.slice(0, doneIndex);
                  const cleanBeforeDone = beforeDone
                    .replaceAll('data:', '')
                    .trim();
                  if (cleanBeforeDone) {
                    onData?.(cleanBeforeDone);
                  }
                  onDone?.();
                  return;
                }

                if (errorIndex !== -1) {
                  const beforeError = buffer.slice(0, errorIndex);
                  const cleanBeforeError = beforeError
                    .replaceAll('data:', '')
                    .trim();
                  if (cleanBeforeError) {
                    onData?.(cleanBeforeError);
                  }
                  const errorMsg = buffer.slice(errorIndex + 8);
                  onError?.(errorMsg.replaceAll('data:', '').trim());
                  return;
                }

                const nextDataIndex = buffer.indexOf('data:', 5);

                if (nextDataIndex === -1) {
                  break;
                }

                const chunk = buffer.slice(0, nextDataIndex);
                const cleanChunk = chunk.replaceAll('data:', '').trim();

                if (cleanChunk) {
                  onData?.(cleanChunk);
                }

                buffer = buffer.slice(nextDataIndex);
              }
            }
          }

          if (buffer.trim()) {
            const cleanBuffer = buffer.replaceAll('data:', '').trim();
            if (
              cleanBuffer &&
              cleanBuffer !== '[DONE]' &&
              !cleanBuffer.startsWith('[ERROR] ')
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
