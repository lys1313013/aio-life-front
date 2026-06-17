import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');

  if (import.meta.env.PROD) {
    await registerServiceWorker();
  }
}

async function registerServiceWorker() {
  if (import.meta.env.VITE_PWA !== 'true') return;

  const [{ registerSW }, { Button, notification }, { h }] = await Promise.all([
    import('virtual:pwa-register'),
    import('ant-design-vue'),
    import('vue'),
  ]);

  const updateSW = registerSW({
    onNeedRefresh() {
      const key = 'pwa-update';
      notification.info({
        key,
        message: '发现新版本',
        description: '点击刷新以使用最新版本',
        duration: 0,
        btn: () =>
          h(
            Button,
            {
              type: 'primary',
              size: 'small',
              onClick: () => {
                notification.close(key);
                updateSW(true);
              },
            },
            { default: () => '立即刷新' },
          ),
      });
    },
    onOfflineReady() {
      // 离线就绪，不需要弹窗提醒
    },
    onRegistered(r) {
      // 每小时检查一次更新
      r &&
        setInterval(
          () => {
            r.update();
          },
          60 * 60 * 1000,
        );
    },
  });
}

export { bootstrap };
