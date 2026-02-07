import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 800,
      title: '足迹',
    },
    name: 'Demos',
    path: '/my-hub',
    children: [
      {
        meta: {
          icon: 'mdi:history',
          title: '时迹',
          backTop: false,
          keepAlive: true,
          maxIdleTime: 60,
        },
        name: 'timeTracker',
        path: '/my-hub/time-tracker',
        component: () => import('#/views/my-hub/time-tracker/index.vue'),
      },

      {
        meta: {
          icon: 'mdi:run-fast',
          title: '运动',
        },
        name: 'exercise',
        path: '/my-hub/exercise',
        component: () => import('#/views/my-hub/exercise/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:video-vintage',
          title: '视频观看',
          backTop: false,
        },
        name: 'videoWatch',
        path: '/my-hub/videoWatch',
        component: () => import('#/views/my-hub/videoWatch/index.vue'),
      },
      {
        meta: {
          title: '闪念',
          icon: 'mdi:lightbulb-on-outline',
        },
        name: 'think',
        path: '/my-hub/think',
        component: () => import('#/views/my-hub/think/index.vue'),
      },
      {
        meta: {
          title: '笔记',
          icon: 'mdi:note-text-outline',
        },
        name: 'memo',
        path: '/my-hub/memo',
        component: () => import('#/views/my-hub/memo/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:chart-line-variant',
          title: '演出',
        },
        name: 'performance',
        path: '/my-hub/performance',
        component: () => import('#/views/my-hub/performance/index.vue'),
      },
      {
        meta: {
          title: '里程碑',
          icon: 'mdi:flag-variant',
        },
        name: 'milestone',
        path: '/my-hub/milestone',
        component: () => import('#/views/my-hub/milestone/index.vue'),
      },
      {
        meta: {
          title: '纪念日',
          icon: 'mdi:calendar-heart',
        },
        name: 'anniversary',
        path: '/my-hub/anniversary',
        component: () => import('#/views/my-hub/anniversary/index.vue'),
      },
    ],
  },
];

export default routes;
