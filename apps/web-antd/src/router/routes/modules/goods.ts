import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:package',
      keepAlive: true,
      order: 3000,
      title: '物品中心',
    },
    name: 'Goods',
    path: '/goods',
    children: [
      {
        meta: {
          icon: 'mdi:monitor-dashboard',
          title: '设备墙',
          backTop: false,
        },
        name: 'device',
        path: '/my-hub/device',
        component: () => import('#/views/my-hub/device/index.vue'),
      },
    ],
  },
];

export default routes;
