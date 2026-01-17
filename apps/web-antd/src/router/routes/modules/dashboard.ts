import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'Analytics',
    path: '/analytics',
    component: () => import('#/views/dashboard/home/index.vue'),
    meta: {
      order: -1,
      affixTab: true,
      icon: 'lucide:home',
      title: '主页',
      keepAlive: true,
      maxIdleTime: 60,
    },
  },
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 0,
      title: $t('page.dashboard.title'),
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        name: 'Workspace',
        path: '/workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          icon: 'carbon:workspace',
          title: $t('page.dashboard.workspace'),
        },
      },
    ],
  },
];

export default routes;
