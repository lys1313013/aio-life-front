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
          title: '设备墙',
        },
        name: 'device',
        path: '/demos/device',
        component: () => import('#/views/demos/device/index.vue'),
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
