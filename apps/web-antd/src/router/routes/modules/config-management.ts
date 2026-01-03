import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'mdi:cog-outline',
      keepAlive: true,
      order: 9000,
      title: '配置管理',
    },
    name: 'ConfigManagement',
    path: '/config-management',
    children: [
      {
        meta: {
          icon: 'mdi:book-settings-outline',
          title: '字典类型',
          backTop: false,
        },
        name: 'sysDictType',
        path: '/config-management/sysDictType',
        component: () =>
          import('#/views/config-management/sysDictType/index.vue'),
      },
      {
        meta: {
          icon: 'mdi:database-search-outline',
          title: '字典数据',
          backTop: false,
        },
        name: 'sysDictData',
        path: '/config-management/sysDictData',
        component: () =>
          import('#/views/config-management/sysDictData/index.vue'),
      },
    ],
  },
];

export default routes;
