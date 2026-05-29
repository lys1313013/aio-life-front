import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'carbon:tools',
      keepAlive: true,
      order: 5,
      title: 'MCP',
    },
    name: 'MCP',
    path: '/mcp',
    children: [
      {
        meta: {
          icon: 'carbon:cube',
          title: '工具列表',
          backTop: false,
        },
        name: 'mcpTools',
        path: '/mcp/tools',
        component: () => import('#/views/mcp/tools/index.vue'),
      },
    ],
  },
];

export default routes;
