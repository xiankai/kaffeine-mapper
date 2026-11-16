import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const basePath = process.env.BASE_PATH;

export default defineConfig({
  plugins: [react()],

  base: basePath ?? "./",

  build: {
    outDir: "dist",
    assetsDir: "assets",

    // Optimize for production deployment
    rollupOptions: {
      output: {
        // Asset naming for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const extType = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(extType)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },

    // Chunk splitting for better caching
    chunkSizeWarningLimit: 1600,

    sourcemap: !basePath,
  },

  define: {
    // Environment variables
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  server: {
    port: 3000,
  },

  preview: {
    port: 4173,
  },
});
