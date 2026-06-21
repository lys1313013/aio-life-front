import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  build: {
    rollupOptions: {
      external: ["@vue/devtools-api", "@vue/devtools-kit", "perfect-debounce", "hookable"]
    }
  }
});
