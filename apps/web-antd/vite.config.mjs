import { defineConfig } from '@vben/vite-config';
export default defineConfig(async () => {
    return {
        application: {},
        vite: {
            server: {
                proxy: {
                    '/api': {
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/api/, ''),
                        target: 'http://localhost:45678/api',
                        ws: true,
                    },
                    '/leetcode-api': {
                        changeOrigin: true,
                        rewrite: (path) => path.replace(/^\/leetcode-api/, ''),
                        target: 'https://leetcode.cn',
                        ws: true,
                        headers: {
                            Referer: 'https://leetcode.cn/',
                            Origin: 'https://leetcode.cn',
                        },
                    },
                },
            },
        },
    };
});
