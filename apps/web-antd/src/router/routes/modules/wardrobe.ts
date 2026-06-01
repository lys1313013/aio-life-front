import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:book-outlined',
      order: 9,
      title: '衣柜',
    },
    name: 'Wardrobe',
    path: '/wardrobe',
    component: () => import('#/views/wardrobe/index.vue'),
  },
];

export default routes;
