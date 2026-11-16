import { defineConfig, build } from "vite";
import react from "@vitejs/plugin-react";

const basePath = process.env.BASE_PATH;
const buildTime = new Date().toISOString();

function serviceWorker() {
  let outDir = "dist";
  let bundled = [];
  return {
    name: "kaffeine-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle(_, bundle) {
      bundled = Object.keys(bundle).filter(
        (file) => !file.endsWith(".map") && file !== "index.html",
      );
    },
    async closeBundle() {
      await build({
        configFile: false,
        logLevel: "warn",
        define: {
          __SW_VERSION__: JSON.stringify(buildTime),
          __SW_PRECACHE__: JSON.stringify(bundled),
        },
        build: {
          outDir,
          emptyOutDir: false,
          sourcemap: false,
          copyPublicDir: false,
          lib: {
            entry: "src/sw/serviceWorker.ts",
            formats: ["iife"],
            name: "kaffeineServiceWorker",
            fileName: () => "sw.js",
          },
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorker()],

  base: basePath ?? "./",

  build: {
    outDir: "dist",
    assetsDir: "assets",

    rollupOptions: {
      output: {
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

    chunkSizeWarningLimit: 1600,

    sourcemap: !basePath,
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },

  server: {
    port: 3000,
  },

  preview: {
    port: 4173,
  },
});
