import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:gift-outlined',
      order: 9,
      title: '会员',
    },
    name: 'Membership',
    path: '/membership',
    component: () => import('#/views/membership/index.vue'),
  },
];

export default routes;
