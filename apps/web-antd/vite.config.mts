import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {
      compress: true,
      pwaOptions: {
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: { enabled: true },
        includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        manifest: {
          name: 'AIO-LIFE',
          short_name: 'AIO',
          description: '个人生活全能管家 - 衣柜、日程、记账、健康一体化',
          theme_color: '#1677ff',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          lang: 'zh-CN',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      },
    },
    vite: {
      optimizeDeps: {
        exclude: ['@nuxt/kit', 'jiti', 'c12', 'unconfig', 'nitropack'],
      },
      plugins: [
        {
          name: 'vite:leetcode-proxy',
          enforce: 'pre',
          configureServer(server) {
            server.middlewares.use((req: any, res: any, next: any) => {
              const url = req?.url || '';
              if (!url.startsWith('/leetcode-api/graphql')) {
                next();
                return;
              }

              if (req.method === 'OPTIONS') {
                res.setHeader(
                  'Access-Control-Allow-Headers',
                  'content-type, x-leetcode-cookie',
                );
                res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
                res.statusCode = 204;
                res.end();
                return;
              }

              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.end();
                return;
              }

              (async () => {
                const chunks: Buffer[] = [];
                await new Promise<void>((resolve, reject) => {
                  req.on('data', (chunk: Buffer) => chunks.push(chunk));
                  req.on('end', () => resolve());
                  req.on('error', (err: any) => reject(err));
                });
                const body = Buffer.concat(chunks).toString('utf-8');

                const targetPath = url.replace(/^\/leetcode-api/, '');
                const upstreamUrl = `https://leetcode.cn${targetPath}`;

                const cookie = req.headers['x-leetcode-cookie'];

                const upstream = await fetch(upstreamUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Referer: 'https://leetcode.cn/',
                    Origin: 'https://leetcode.cn',
                    ...(cookie ? { Cookie: cookie as string } : {}),
                  },
                  body,
                });

                const text = await upstream.text().catch(() => '');
                res.statusCode = upstream.status;
                res.setHeader(
                  'Content-Type',
                  upstream.headers.get('content-type') || 'application/json',
                );
                res.end(text);
              })().catch((error) => {
                if (!res.headersSent) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(
                    JSON.stringify({
                      errors: [
                        {
                          message:
                            error instanceof Error
                              ? error.message
                              : 'Upstream request failed',
                        },
                      ],
                    }),
                  );
                  return;
                }
                next(error);
              });
            });
          },
        },
      ],
      build: {
        target: 'es2022',
        rollupOptions: {
          external: (id) =>
            /[\\/]jiti[\\/]/.test(id) || /[\\/]@nuxt[\\/]kit[\\/]/.test(id),
          output: {
            manualChunks: {
              'ant-design-vue': ['ant-design-vue', '@ant-design/icons-vue'],
              'vendor-core': [
                'vue',
                'vue-router',
                'pinia',
                '@vueuse/core',
                'dayjs',
              ],
              'vendor-vben': [
                '@vben/access',
                '@vben/common-ui',
                '@vben/constants',
                '@vben/hooks',
                '@vben/icons',
                '@vben/layouts',
                '@vben/locales',
                '@vben/preferences',
                '@vben/request',
                '@vben/stores',
                '@vben/styles',
                '@vben/types',
                '@vben/utils',
              ],
            },
          },
        },
      },
      server: {
        proxy: {
          '/shanbay-api': {
            target: 'https://www.shanbay.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/shanbay-api/, ''),
            headers: {
              Referer: 'https://www.shanbay.com/',
              Origin: 'https://www.shanbay.com',
            },
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                if (req.headers.cookie) {
                  proxyReq.setHeader('Cookie', req.headers.cookie);
                }
                if (req.headers['user-agent']) {
                  proxyReq.setHeader('User-Agent', req.headers['user-agent']);
                }
              });
            },
          },
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
