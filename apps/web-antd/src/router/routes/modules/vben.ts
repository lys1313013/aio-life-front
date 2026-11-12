import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'ProfileCategoryManagement',
    path: '/profile/category-management',
    meta: { title: '分类管理', icon: 'mdi:tag-multiple-outline', hideInMenu: true },
    children: [
      {
        name: 'exerciseCategoryConfig',
        path: '/my-hub/exercise/category-config',
        component: () => import('#/views/my-hub/exercise/category-config/index.vue'),
        meta: { title: '通用分类', icon: 'mdi:format-list-bulleted-type' },
      },
      {
        name: 'CategoryConfig',
        path: '/time/my-categories',
        component: () => import('#/views/time/time-tracker/category-config/index.vue'),
        meta: { title: '时迹分类', icon: 'mdi:tag-multiple-outline' },
      },
    ],
  },
  {
    name: 'VbenAbout',
    path: '/vben-admin/about',
    component: () => import('#/views/_core/about/index.vue'),
    meta: {
      icon: 'lucide:copyright',
      title: $t('demos.vben.about'),
      order: 9999,
      authority: ['admin'],
    },
  },
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      fullPathKey: false,
      hideInTab: true,
      icon: 'lucide:user',
      hideInMenu: true,
      title: $t('page.auth.profile'),
    },
  },
];

export default routes;
