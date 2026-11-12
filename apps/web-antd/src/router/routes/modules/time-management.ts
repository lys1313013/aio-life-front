import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:clock-outline',
      keepAlive: true,
      order: 2,
      title: '时间',
    },
    name: 'TimeManagement',
    path: '/time-management',
    children: [
      {
        meta: {
          icon: 'mdi:history',
          title: '时迹',
          keepAlive: true,
          maxIdleTime: 60,
        },
        name: 'TimeTracker',
        path: '/time/time-tracker',
        component: () => import('#/views/time/time-tracker/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:view-dashboard-outline',
          title: '看板',
          keepAlive: true,
        },
        name: 'TimeTrackerDashboard',
        path: '/time/dashboard',
        component: () => import('#/views/time/dashboard/index.vue'),
      },
    ],
  },
];

export default routes;
