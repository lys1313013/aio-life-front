import type { ApiRequests } from '#/api/payload';

import { useAccessStore } from '@vben/stores';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';

export interface LLMKey {
  id: string;
  modelName: string;
  hasApiKey: boolean;
  baseUrl: string;
  isDefault: number;
}

export interface ChatSession {
  id: string;
  title: string;
  updateTime: string;
}

export interface ChatMessage {
  id: string;
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

export async function saveLLMKeyApi(data: ApiRequests['LLMKeyCreateReq']) {
  return requestClient.post('/llm/key', pickPayload('LLMKeyCreateReq', data));
}

export async function updateLLMKeyApi(data: ApiRequests['LLMKeyUpdateReq']) {
  return requestClient.put('/llm/key', pickPayload('LLMKeyUpdateReq', data));
}

export async function deleteLLMKeyApi(id: string) {
  return requestClient.delete(`/llm/key/${id}`);
}

export async function setDefaultLLMKeyApi(id: string) {
  return requestClient.put(`/llm/key/default/${id}`);
}

export async function chatWithLLMApi(
  prompt: string,
  _context?: string,
  conversationId?: string,
) {
  return requestClient.post<string>(
    '/llm/chat',
    pickPayload('ChatReq', {
      prompt,
      conversationId,
    }),
  );
}

export async function summarizeTimeRecordsApi(type: 'today' | 'week') {
  return requestClient.post<string>('/llm/summarize/time-records', { type });
}

export async function getChatSessionsApi() {
  return requestClient.get<ChatSession[]>('/llm/sessions');
}

export async function createChatSessionApi(title: string) {
  return requestClient.post<ChatSession>(
    '/llm/sessions',
    pickPayload('ChatSessionSaveReq', { title }),
  );
}

export async function updateChatSessionApi(id: string, title: string) {
  return requestClient.put(
    `/llm/sessions/${id}`,
    pickPayload('ChatSessionSaveReq', { title }),
  );
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
  _context?: string,
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
        body: JSON.stringify({ prompt, conversationId }),
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

              while (buffer.includes('\n\n')) {
                const newlineIndex = buffer.indexOf('\n\n');
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
