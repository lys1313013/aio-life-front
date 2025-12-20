import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 800,
      title: '个人中心',
    },
    name: 'Demos',
    path: '/my-hub',
    children: [
      {
        meta: {
          icon: 'mdi:clipboard-text-clock-outline',
          title: '待办看板',
        },
        name: 'todo',
        path: '/my-hub/todo',
        component: () => import('#/views/my-hub/todo/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:monitor-dashboard',
          title: '设备墙',
        },
        name: 'device',
        path: '/my-hub/device',
        component: () => import('#/views/my-hub/device/index.vue'),
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
          title: '视频学习记录',
        },
        name: 'bilibiliVideo',
        path: '/my-hub/bilibili-video',
        component: () => import('#/views/my-hub/bilibili-video/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:history',
          title: '时迹',
          backTop: false,
        },
        name: 'timeTracker',
        path: '/my-hub/time-tracker',
        component: () => import('#/views/my-hub/time-tracker/index.vue'),
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
          icon: 'mdi:flask-outline',
          title: '测试界面',
        },
        name: 'test',
        path: '/my-hub/test',
        component: () => import('#/views/my-hub/test/index.vue'),
      },
    ],
  },
];

export default routes;
