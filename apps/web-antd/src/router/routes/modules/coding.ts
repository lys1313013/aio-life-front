import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:code-2',
      keepAlive: true,
      order: 2000,
      title: '编程中心',
    },
    name: 'Coding',
    path: '/coding',
    children: [
      {
        meta: {
          icon: 'mdi:github',
          title: 'Github',
        },
        name: 'GithubGraph',
        path: '/coding/github',
        component: () => import('#/views/coding/github/index.vue'),
      },
    ],
  },
];

export default routes;
