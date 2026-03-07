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
          backTop: false,
          keepAlive: true,
          maxIdleTime: 60,
        },
        name: 'TimeTracker',
        path: '/time-management/time-tracker',
        component: () => import('#/views/time-management/time-tracker/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:cog-outline',
          title: '分类配置',
          backTop: false,
          hideInMenu: true,
        },
        name: 'TimeTrackerCategoryConfig',
        path: '/time-management/time-tracker/category-config',
        component: () =>
          import('#/views/time-management/time-tracker/category-config/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:view-dashboard-outline',
          title: '看板',
          backTop: false,
          keepAlive: true,
        },
        name: 'TimeTrackerDashboard',
        path: '/time-management/dashboard',
        component: () => import('#/views/time-management/dashboard/index.vue'),
      },
    ],
  },
];

export default routes;
