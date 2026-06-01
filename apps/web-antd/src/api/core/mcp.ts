import { requestClient } from '#/api/request';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: {
    additionalProperties?: boolean;
    definitions?: Record<string, any>;
    properties: Record<string, any>;
    required?: string[];
    type: string;
  };
}

export async function getMcpToolsApi() {
  return requestClient.get<McpToolInfo[]>('/mcp/tools');
}

export interface McpToolCallResult {
  content: Array<{ text: string; type: string }>;
  isError: boolean;
}

export async function callMcpToolApi(name: string, args: Record<string, any>) {
  return requestClient.post<McpToolCallResult>('/mcp/tools/call', {
    name,
    arguments: args,
  });
}
