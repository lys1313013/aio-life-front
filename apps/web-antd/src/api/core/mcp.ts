import { requestClient } from '#/api/request';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
    definitions?: Record<string, any>;
  };
}

export async function getMcpToolsApi() {
  return requestClient.get<McpToolInfo[]>('/mcp/tools');
}

export interface McpToolCallResult {
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

export async function callMcpToolApi(name: string, args: Record<string, any>) {
  return requestClient.post<McpToolCallResult>('/mcp/tools/call', { name, arguments: args });
}
