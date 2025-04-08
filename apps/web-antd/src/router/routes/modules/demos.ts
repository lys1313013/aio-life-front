import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ic:baseline-view-in-ar',
      keepAlive: true,
      order: 1000,
      title: $t('demos.title'),
    },
    name: 'Demos',
    path: '/demos',
    children: [
      {
        meta: {
          title: $t('demos.antd'),
        },
        name: 'AntDesignDemos',
        path: '/demos/ant-design',
        component: () => import('#/views/demos/antd/index.vue'),
      },
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
          title: '测试界面',
        },
        name: 'test',
        path: '/demos/test',
        component: () => import('#/views/demos/test/index.vue'),
      },
    ],
  },
];

export default routes;
