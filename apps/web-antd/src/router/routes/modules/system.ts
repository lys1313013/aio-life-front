import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:shield-account-outline',
      keepAlive: true,
      order: 10,
      title: '系统管理',
      authority: ['admin'],
    },
    name: 'System',
    path: '/system',
    children: [
      {
        meta: {
          icon: 'lucide:crown',
          title: '会员平台',
          authority: ['admin'],
        },
        name: 'MembershipProviderAdmin',
        path: '/system/membership-providers',
        component: () =>
          import('#/views/system/membership-providers/index.vue'),
      },
      {
        meta: {
          icon: 'lucide:credit-card',
          title: '银行卡卡面',
          authority: ['admin'],
        },
        name: 'BankCardCoverAdmin',
        path: '/system/bank-card-covers',
        component: () => import('#/views/system/bank-card-covers/index.vue'),
      },
      {
        meta: {
          icon: 'lucide:folder',
          title: '对象存储',
          authority: ['admin'],
        },
        name: 'StorageAdmin',
        path: '/system/storage',
        component: () => import('#/views/system/storage/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:clipboard-text-clock-outline',
          title: '操作日志',
          authority: ['admin'],
        },
        name: 'OperationLog',
        path: '/system/operation-log',
        component: () => import('#/views/system/operation-log/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:login-variant',
          title: '访问日志',
          authority: ['admin'],
        },
        name: 'AccessLog',
        path: '/system/access-log',
        component: () => import('#/views/system/access-log/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:account-group-outline',
          title: '用户中心',
        },
        name: 'UserCenter',
        path: '/system/user',
        component: () => import('#/views/system/user/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:menu-open',
          title: '权限菜单',
          authority: ['admin'],
        },
        name: 'MenuManagement',
        path: '/system/menu',
        component: () => import('#/views/system/menu/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:book-open-page-variant',
          title: '用户字典管理',
          authority: ['admin'],
        },
        name: 'UserDictAdmin',
        path: '/system/user-dict',
        component: () => import('#/views/system/user-dict/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:message-alert-outline',
          title: '反馈管理',
          authority: ['admin'],
        },
        name: 'FeedbackAdmin',
        path: '/system/feedback',
        component: () => import('#/views/system/feedback/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:cog-outline',
          title: '系统配置',
          authority: ['admin'],
        },
        name: 'SystemConfig',
        path: '/system/config',
        component: () => import('#/views/system/config/index.vue'),
      },
    ],
  },
];

export default routes;
