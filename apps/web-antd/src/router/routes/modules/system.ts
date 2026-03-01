import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:shield-account-outline',
      keepAlive: true,
      order: 10,
      title: '系统管理',
      roles: ['admin'],
    },
    name: 'System',
    path: '/system',
    children: [
      {
        meta: {
          icon: 'mdi:account-group-outline',
          title: '用户中心',
        },
        name: 'UserCenter',
        path: '/system/user',
        component: () => import('#/views/system/user/index.vue'),
      },
    ],
  },
];

export default routes;
