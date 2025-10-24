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
          title: '字典管理',
        },
        name: 'sysDictType',
        path: '/demos/sysDictType',
        component: () => import('#/views/demos/sysDictType/index.vue'),
      },
      {
        meta: {
          title: '字典数据',
        },
        name: 'sysDictData',
        path: '/demos/sysDictData',
        component: () => import('#/views/demos/sysDictData/index.vue'),
      },
      {
        meta: {
          title: '待办看板',
        },
        name: 'todo',
        path: '/demos/todo',
        component: () => import('#/views/demos/todo/index.vue'),
      },
      {
        meta: {
          title: '设备墙',
        },
        name: 'device',
        path: '/demos/device',
        component: () => import('#/views/demos/device/index.vue'),
      },
      {
        meta: {
          title: '演出数据',
        },
        name: 'performance',
        path: '/demos/performance',
        component: () => import('#/views/demos/performance/index.vue'),
      },
      {
        meta: {
          title: '运动',
        },
        name: 'sysDictType',
        path: '/demos/sysDictType',
        component: () => import('#/views/demos/sysDictType/index.vue'),
      },
      {
        meta: {
          title: 'b站学习记录',
        },
        name: 'bilibiliVideo',
        path: '/demos/bilibili-video',
        component: () => import('#/views/demos/bilibili-video/index.vue'),
      },
      {
        meta: {
          title: '测试界面',
        },
        name: 'test',
        path: '/demos/test',
        component: () => import('#/views/demos/test/index.vue'),
      },
      {
        meta: {
          title: '时间轴记录',
        },
        name: 'timeTracker',
        path: '/demos/time-tracker',
        component: () => import('#/views/demos/time-tracker/index.vue'),
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
          title: '收入',
        },
        name: 'income',
        path: '/finance/income',
        component: () => import('#/views/demos/income/index.vue'),
      },
      {
        meta: {
          title: '收入看板',
        },
        name: 'incomeDashboard',
        path: '/finance/incomeDashboard',
        component: () => import('#/views/demos/income/dashboard.vue'),
      },
      {
        meta: {
          title: '支出',
        },
        name: 'exp',
        path: '/finance/expense',
        component: () => import('#/views/demos/expense/index.vue'),
      },
      {
        meta: {
          title: '支出看板',
        },
        name: 'expenseDashboard',
        path: '/finance/expenseDashboard',
        component: () => import('#/views/demos/expense/dashboard.vue'),
      },
      {
        meta: {
          title: '收支综合看板',
        },
        name: 'financeDashboard',
        path: '/finance/finance-dashboard',
        component: () => import('#/views/demos/finance-dashboard/index.vue'),
      },
      {
        meta: {
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
