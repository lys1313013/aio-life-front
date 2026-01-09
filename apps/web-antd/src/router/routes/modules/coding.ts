import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:code-2',
      keepAlive: true,
      order: 2000,
      title: '编程看板',
    },
    name: 'Coding',
    path: '/coding',
    children: [
      {
        meta: {
          icon: 'mdi:github',
          title: 'Github',
          backTop: false,
        },
        name: 'GithubGraph',
        path: '/coding/github',
        component: () => import('#/views/coding/github/index.vue'),
      },
      {
        meta: {
          icon: 'simple-icons:leetcode',
          title: 'LeetCode',
        },
        name: 'LeetCode',
        path: '/coding/leetcode',
        component: () => import('#/views/coding/leetcode/index.vue'),
      },
    ],
  },
];

export default routes;
