import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      compress: true,
    },
    vite: {
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              echarts: ['echarts'],
              'ant-design-vue': ['ant-design-vue', '@ant-design/icons-vue'],
              'vendor-core': ['vue', 'vue-router', 'pinia', '@vueuse/core', 'dayjs'],
              'vendor-vben': ['@vben/access', '@vben/common-ui', '@vben/constants', '@vben/hooks', '@vben/icons', '@vben/layouts', '@vben/locales', '@vben/plugins', '@vben/preferences', '@vben/request', '@vben/stores', '@vben/styles', '@vben/types', '@vben/utils'],
            },
          },
        },
      },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://localhost:45678/api',
            ws: true,
          },
        },
      },
    },
  };
});
