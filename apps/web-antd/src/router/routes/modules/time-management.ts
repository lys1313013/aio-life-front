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
        component: () =>
          import('#/views/time-management/time-tracker/index.vue'),
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
      {
        meta: {
          icon: 'mdi:tag-multiple-outline',
          title: '我的分类',
          backTop: false,
        },
        name: 'CategoryConfig',
        path: '/time-management/my-categories',
        component: () =>
          import('#/views/time-management/time-tracker/category-config/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:shield-account-outline',
          title: '分类管理（管理员）',
          backTop: false,
          authority: ['admin'],
        },
        name: 'TimeTrackerCategoryAdmin',
        path: '/time-management/category-admin',
        component: () =>
          import('#/views/time-management/time-tracker/admin/index.vue'),
      },
    ],
  },
];

export default routes;
