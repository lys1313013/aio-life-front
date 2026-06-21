import { get, post } from '@/utils/request';

export interface McpToolInfo {
  name: string;
  description: string;
  inputSchema: any;
}

export async function getMcpToolsApi() {
  return get<McpToolInfo[]>('/mcp/tools');
}

export async function callMcpToolApi(name: string, args: Record<string, any>) {
  return post('/mcp/tools/call', {
    name,
    arguments: args,
  });
}
