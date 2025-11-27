import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      title: '个人中心',
    },
    name: 'Demos',
    path: '/demos',
    children: [
      {
        meta: {
          icon: 'mdi:book-settings-outline',
          title: '字典管理',
        },
        name: 'sysDictType',
        path: '/demos/sysDictType',
        component: () => import('#/views/demos/sysDictType/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:database-search-outline',
          title: '字典数据',
        },
        name: 'sysDictData',
        path: '/demos/sysDictData',
        component: () => import('#/views/demos/sysDictData/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:clipboard-text-clock-outline',
          title: '待办看板',
        },
        name: 'todo',
        path: '/demos/todo',
        component: () => import('#/views/demos/todo/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:monitor-dashboard',
          title: '设备墙',
        },
        name: 'device',
        path: '/demos/device',
        component: () => import('#/views/demos/device/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:chart-line-variant',
          title: '演出数据',
        },
        name: 'performance',
        path: '/demos/performance',
        component: () => import('#/views/demos/performance/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:run-fast',
          title: '运动',
        },
        name: 'sysDictType',
        path: '/demos/sysDictType',
        component: () => import('#/views/demos/sysDictType/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:video-vintage',
          title: '视频学习记录',
        },
        name: 'bilibiliVideo',
        path: '/demos/bilibili-video',
        component: () => import('#/views/demos/bilibili-video/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:timeline-clock-outline',
          title: '时迹',
          backTop: false,
        },
        name: 'timeTracker',
        path: '/demos/time-tracker',
        component: () => import('#/views/demos/time-tracker/index.vue'),
      },
      {
        meta: {
          title: '思考卡片',
          icon: 'mdi:lightbulb-on-outline',
        },
        name: 'think',
        path: '/demos/think',
        component: () => import('#/views/demos/think/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:flask-outline',
          title: '测试界面',
        },
        name: 'test',
        path: '/demos/test',
        component: () => import('#/views/demos/test/index.vue'),
      },
    ],
  },
  {
    meta: {
      icon: 'ri:money-cny-circle-line',
      keepAlive: true,
      order: 999,
      title: '收支管理',
    },
    name: 'finance',
    path: '/finance',
    children: [
      {
        meta: {
          icon: 'mdi:cash-plus',
          title: '收入',
        },
        name: 'income',
        path: '/finance/income',
        component: () => import('#/views/demos/income/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:chart-bar',
          title: '收入看板',
        },
        name: 'incomeDashboard',
        path: '/finance/incomeDashboard',
        component: () => import('#/views/demos/income/dashboard.vue'),
      },
      {
        meta: {
          icon: 'mdi:cash-minus',
          title: '支出',
        },
        name: 'exp',
        path: '/finance/expense',
        component: () => import('#/views/demos/expense/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:chart-bell-curve',
          title: '支出看板',
        },
        name: 'expenseDashboard',
        path: '/finance/expenseDashboard',
        component: () => import('#/views/demos/expense/dashboard.vue'),
      },
      {
        meta: {
          icon: 'mdi:finance',
          title: '收支综合看板',
        },
        name: 'financeDashboard',
        path: '/finance/finance-dashboard',
        component: () => import('#/views/demos/finance-dashboard/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:import',
          title: '外部账单导入',
        },
        name: 'alipayImport',
        path: '/finance/alipay-import',
        component: () => import('#/views/demos/expense/alipay-import.vue'),
      },
    ],
  },
];

export default routes;
