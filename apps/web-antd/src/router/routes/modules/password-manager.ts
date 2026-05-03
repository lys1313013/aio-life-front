import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:key-outlined',
      order: 10,
      title: '密码管理',
    },
    name: 'PasswordManager',
    path: '/password-manager',
    component: () => import('#/views/password-manager/index.vue'),
  },
];

export default routes;
