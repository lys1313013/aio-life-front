import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'ant-design:team-outlined',
      order: 8,
      title: '关系图谱',
    },
    name: 'Relationship',
    path: '/relationship',
    component: () => import('#/views/relationship/index.vue'),
  },
];

export default routes;
