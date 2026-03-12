import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/message',
    name: 'Message',
    component: () => import('#/views/message/index.vue'),
    meta: {
      order: 10,
      icon: 'ant-design:message-outlined',
      title: '消息中心',
      hideInMenu: true,
      fullPathKey: false,
    },
  },
];

export default routes;
