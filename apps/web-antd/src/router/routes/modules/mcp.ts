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
          icon: 'mdi:database-search-outline',
          title: '查询工作台',
          fullPathKey: false,
          keepAlive: false,
        },
        name: 'QueryWorkbench',
        path: '/query/workbench',
        component: () => import('#/views/data-query/workbench/index.vue'),
      },
      {
        meta: {
          icon: 'lucide:library',
          title: '数据模型',
          fullPathKey: false,
          keepAlive: false,
        },
        name: 'QueryModels',
        path: '/query/models',
        component: () => import('#/views/data-query/models/index.vue'),
      },
      {
        meta: {
          authority: ['admin'],
          icon: 'lucide:network',
          keepAlive: false,
          title: '数据库关系图谱',
        },
        name: 'QuerySchema',
        path: '/query/schema',
        component: () => import('#/views/data-query/schema/index.vue'),
      },
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
