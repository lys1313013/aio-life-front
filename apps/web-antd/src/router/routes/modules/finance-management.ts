import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:finance',
      keepAlive: true,
      order: 2000,
      title: '财务中心',
    },
    name: 'FinanceManagement',
    path: '/finance-management',
    children: [
      {
        meta: {
          icon: 'mdi:chart-areaspline',
          title: '概览',
          backTop: false,
        },
        name: 'financeDashboard',
        path: '/finance-management/dashboard',
        component: () => import('#/views/my-hub/finance-dashboard/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:cash-plus',
          title: '收入',
          backTop: false,
        },
        name: 'incomeManagement',
        path: '/finance-management/income',
        component: () => import('#/views/my-hub/income/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:cash-minus',
          title: '支出',
          backTop: false,
        },
        name: 'expenseManagement',
        path: '/finance-management/expense',
        component: () => import('#/views/my-hub/expense/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:import',
          title: '账单导入',
          backTop: false,
        },
        name: 'alipayImport',
        path: '/finance-management/alipay-import',
        component: () => import('#/views/my-hub/expense/import.vue'),
      },
    ],
  },
];

export default routes;
