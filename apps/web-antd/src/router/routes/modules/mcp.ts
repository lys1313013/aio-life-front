import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'carbon:tools',
      keepAlive: true,
      order: 5,
      title: 'AI 接入',
    },
    name: 'MCP',
    path: '/ai',
    children: [
      {
        meta: {
          icon: 'carbon:cube',
          title: '连接器（MCP）',
        },
        name: 'mcpTools',
        path: '/mcp/tools',
        component: () => import('#/views/mcp/tools/index.vue'),
      },
      {
        meta: {
          icon: 'ant-design:key-outlined',
          title: 'API Key 管理',
        },
        name: 'mcpApiKeys',
        path: '/mcp/api-keys',
        component: () => import('#/views/mcp/api-keys/index.vue'),
      },
    ],
  },
];

export default routes;
