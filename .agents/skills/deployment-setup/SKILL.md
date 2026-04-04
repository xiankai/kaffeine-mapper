---
name: deployment-setup
description: "Deployment strategy for GitHub Pages static sites with local filesystem access support. Use for configuring build processes, GitHub Actions, and dual deployment targets (web + local)."
argument-hint: "Optional: specify deployment target or platform to focus configuration on"
---

# Deployment Setup

## When to Use

- Deploying static sites to GitHub Pages
- Configuring dual deployment targets (web + local filesystem)
- Setting up automated deployment pipelines
- Optimizing builds for different deployment environments
- Implementing deployment strategies and rollback procedures

## Deployment Strategy Checklist

### GitHub Pages Static Site Deployment

**GitHub Pages Configuration**

- [ ] Repository configured for GitHub Pages deployment
- [ ] Build artifacts generated in correct directory structure
- [ ] Static assets properly referenced with relative paths
- [ ] Base URL configuration for subdirectory deployment
- [ ] Custom domain setup (if applicable)
- [ ] HTTPS enforcement enabled

**Build Optimization for Static Hosting**

- [ ] Bundle size optimized for web delivery
- [ ] Asset compression and minification enabled
- [ ] Image optimization and WebP conversion
- [ ] Cache-busting implemented for assets
- [ ] Service worker for offline functionality (optional)
- [ ] SEO meta tags and Open Graph data included

### Local Filesystem Access Support

**Local Build Configuration**

- [ ] Build process generates filesystem-accessible output
- [ ] File protocol (file://) support enabled
- [ ] Absolute paths converted to relative paths
- [ ] Local storage and IndexedDB fallbacks implemented
- [ ] Cross-origin restrictions handled for local files
- [ ] Electron/Tauri packaging support (if applicable)

**Dual Build Targets**

- [ ] Environment-specific build configurations
- [ ] Conditional asset loading based on deployment target
- [ ] API endpoint configuration per environment
- [ ] Feature flags for web vs local functionality
- [ ] Different routing strategies per target
- [ ] Error handling adapted for each environment

### Automated Deployment Pipeline

**GitHub Actions Workflow**

- [ ] Automated builds triggered on push to main branch
- [ ] Pull request preview deployments configured
- [ ] Build caching for faster deployments
- [ ] Test validation before deployment
- [ ] Environment secrets properly configured
- [ ] Deployment status notifications set up

**Release Management**

- [ ] Semantic versioning implemented
- [ ] Changelog generation automated
- [ ] Release artifacts created and tagged
- [ ] Rollback procedures documented and tested
- [ ] Deployment monitoring and health checks
- [ ] Blue-green or canary deployment strategy (if applicable)

## GitHub Pages Deployment Configuration

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch: # Allow manual triggers

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build for GitHub Pages
        run: npm run build:gh-pages
        env:
          NODE_ENV: production
          PUBLIC_URL: /kaffeine-mapper # Replace with your repo name

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

### Build Configuration for Multiple Targets

```javascript
// vite.config.js
import { defineConfig } from "vite";
import { resolve } from "path";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const isLocal = process.env.TARGET === "local";

export default defineConfig({
  base: isGitHubPages ? "/kaffeine-mapper/" : "./",

  build: {
    outDir: "dist",
    assetsDir: "assets",

    // Generate different builds for different targets
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        ...(isLocal && {
          local: resolve(__dirname, "local.html"),
        }),
      },

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
      },
    },

    // Target-specific optimizations
    target: isLocal ? "esnext" : "es2015",
    minify: !isLocal,
    sourcemap: isLocal ? true : false,

    // Chunk splitting for better caching
    chunkSizeWarningLimit: 1600,
  },

  define: {
    // Environment-specific constants
    __IS_LOCAL_BUILD__: JSON.stringify(isLocal),
    __IS_GITHUB_PAGES__: JSON.stringify(isGitHubPages),
    __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version),
  },

  // Plugin configuration
  plugins: [
    // Add plugins based on build target
    ...(isGitHubPages
      ? [
          // Plugins for GitHub Pages optimization
        ]
      : []),

    ...(isLocal
      ? [
          // Plugins for local build optimization
        ]
      : []),
  ],
});
```

### Package.json Build Scripts

```json
{
  "scripts": {
    "build": "npm run build:web",
    "build:web": "vite build",
    "build:gh-pages": "GITHUB_PAGES=true vite build",
    "build:local": "TARGET=local vite build",
    "build:all": "npm run build:web && npm run build:local",

    "preview": "vite preview",
    "preview:local": "npm run build:local && vite preview --port 4173",

    "deploy": "npm run build:gh-pages && gh-pages -d dist",
    "deploy:local": "npm run build:local && npm run package:local",

    "package:local": "node scripts/package-local.js"
  }
}
```

## Local Filesystem Build Optimization

### Path Resolution for File Protocol

```javascript
// src/utils/pathResolver.js
export class PathResolver {
  static isLocalBuild() {
    return window.location.protocol === "file:" || __IS_LOCAL_BUILD__;
  }

  static resolveAssetPath(path) {
    if (this.isLocalBuild()) {
      // Convert to relative path for file:// protocol
      return path.startsWith("/") ? `.${path}` : path;
    }

    // Web deployment with base URL
    const baseURL = import.meta.env.BASE_URL || "/";
    return `${baseURL}${path}`.replace("//", "/");
  }

  static resolveApiEndpoint(endpoint) {
    if (this.isLocalBuild()) {
      // Use mock data or local JSON files
      return `./api-mock${endpoint}.json`;
    }

    // Production API endpoints
    return `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
  }
}

// Usage in components
const imageSrc = PathResolver.resolveAssetPath("/images/logo.png");
const apiUrl = PathResolver.resolveApiEndpoint("/users");
```

### Local Storage Polyfill for File Protocol

```javascript
// src/utils/localStorage.js
class LocalStoragePolyfill {
  constructor() {
    this.data = new Map();
    this.storageFile = "./data/localStorage.json";

    // Try to load existing data for local builds
    if (PathResolver.isLocalBuild()) {
      this.loadFromFile();
    }
  }

  getItem(key) {
    if (this.isWebContext()) {
      return localStorage.getItem(key);
    }
    return this.data.get(key) || null;
  }

  setItem(key, value) {
    if (this.isWebContext()) {
      localStorage.setItem(key, value);
      return;
    }

    this.data.set(key, value);
    this.saveToFile();
  }

  removeItem(key) {
    if (this.isWebContext()) {
      localStorage.removeItem(key);
      return;
    }

    this.data.delete(key);
    this.saveToFile();
  }

  isWebContext() {
    return (
      typeof Storage !== "undefined" && window.location.protocol !== "file:"
    );
  }

  async loadFromFile() {
    try {
      const response = await fetch(this.storageFile);
      if (response.ok) {
        const data = await response.json();
        this.data = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn("Could not load local storage data:", error);
    }
  }

  saveToFile() {
    // For file protocol, we can't actually save files
    // This would need Electron or similar for true local storage
    console.log("Local storage data:", Object.fromEntries(this.data));
  }
}

export const storage = new LocalStoragePolyfill();
```

### Router Configuration for Both Targets

```javascript
// src/router/index.js
import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from "vue-router";

const isLocalBuild = PathResolver.isLocalBuild();

const router = createRouter({
  // Use hash mode for local builds to avoid file path issues
  history: isLocalBuild
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL),

  routes: [
    {
      path: "/",
      name: "Home",
      component: () => import("../views/Home.vue"),
    },
    {
      path: "/about",
      name: "About",
      component: () => import("../views/About.vue"),
    },
  ],
});

// Handle local build navigation
if (isLocalBuild) {
  router.beforeEach((to, from, next) => {
    // Handle any special local navigation logic
    next();
  });
}

export default router;
```

## Packaging and Distribution

### Local Package Generation Script

```javascript
// scripts/package-local.js
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

async function packageLocalBuild() {
  const distDir = path.join(__dirname, "..", "dist");
  const packageDir = path.join(__dirname, "..", "packages");

  // Ensure package directory exists
  await fs.ensureDir(packageDir);

  // Create package info
  const packageInfo = {
    name: "Kaffeine Mapper Local",
    version: process.env.npm_package_version || "1.0.0",
    description: "Local offline version of Kaffeine Mapper",
    instructions: "Open index.html in your browser to start the application",
    build_date: new Date().toISOString(),
    files: await getFileList(distDir),
  };

  // Write package info
  await fs.writeJSON(path.join(distDir, "package-info.json"), packageInfo, {
    spaces: 2,
  });

  // Create installation instructions
  const instructions = `
# Kaffeine Mapper - Local Installation

## Installation
1. Extract all files to a directory of your choice
2. Open 'index.html' in your web browser
3. The application will run locally without internet connection

## Features
- Full offline functionality
- Local data storage
- No server required

## Browser Compatibility
- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

## Troubleshooting
- If images don't load, make sure to extract all files
- For best performance, use Chrome or Firefox
- Some features may be limited compared to the web version

Version: ${packageInfo.version}
Build Date: ${packageInfo.build_date}
  `;

  await fs.writeFile(path.join(distDir, "README.txt"), instructions.trim());

  // Create ZIP package
  const zipPath = path.join(
    packageDir,
    `kaffeine-mapper-local-v${packageInfo.version}.zip`,
  );
  await createZipArchive(distDir, zipPath);

  console.log(`📦 Local package created: ${zipPath}`);
  console.log(
    `📋 Package info written to: ${path.join(distDir, "package-info.json")}`,
  );
}

async function getFileList(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const subFiles = await getFileList(path.join(dir, item.name));
      files.push(...subFiles.map((f) => `${item.name}/${f}`));
    } else {
      files.push(item.name);
    }
  }

  return files;
}

async function createZipArchive(sourceDir, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

// Run if called directly
if (require.main === module) {
  packageLocalBuild().catch(console.error);
}

module.exports = { packageLocalBuild };
```

### Environment-Specific Configuration

```javascript
// src/config/environment.js
const config = {
  // Base configuration
  APP_NAME: "Kaffeine Mapper",
  VERSION: import.meta.env.VITE_APP_VERSION || "1.0.0",

  // Deployment target detection
  IS_LOCAL: PathResolver.isLocalBuild(),
  IS_GITHUB_PAGES: __IS_GITHUB_PAGES__,
  IS_DEVELOPMENT: import.meta.env.DEV,

  // API configuration
  API_BASE_URL: (() => {
    if (PathResolver.isLocalBuild()) {
      return "./api-mock"; // Local JSON files
    }
    if (__IS_GITHUB_PAGES__) {
      return "https://api.example.com"; // Production API
    }
    return "http://localhost:3001/api"; // Development API
  })(),

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: PathResolver.isLocalBuild(),
    ANALYTICS: __IS_GITHUB_PAGES__ && !import.meta.env.DEV,
    DEBUG_MODE: import.meta.env.DEV,
    LOCAL_STORAGE: true,
  },

  // Paths and URLs
  ASSET_PATH: PathResolver.resolveAssetPath("/assets"),
  BASE_URL: import.meta.env.BASE_URL || "/",

  // Performance settings
  CACHE_DURATION: PathResolver.isLocalBuild() ? 0 : 3600000, // 1 hour for web
  LAZY_LOADING: !PathResolver.isLocalBuild(), // Disable for local builds
};

export default config;
```

### Service Worker for Offline Support

```javascript
// public/sw.js - Service Worker for GitHub Pages
const CACHE_NAME = "kaffeine-mapper-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./assets/css/main.css",
  "./assets/js/main.js",
  "./assets/images/logo.png",
  // Add other static assets
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request);
    }),
  );
});
```

## Deployment Monitoring and Health Checks

### GitHub Actions Status Checks

```yaml
# .github/workflows/health-check.yml
name: Health Check

on:
  schedule:
    - cron: "0 */6 * * *" # Every 6 hours
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check GitHub Pages
        run: |
          curl -f https://yourusername.github.io/kaffeine-mapper/ || exit 1

      - name: Check critical pages
        run: |
          curl -f https://yourusername.github.io/kaffeine-mapper/about || exit 1

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Deployment Rollback Strategy

```bash
# scripts/rollback.sh
#!/bin/bash

# Rollback to previous GitHub Pages deployment
echo "🔄 Rolling back deployment..."

# Get previous commit
PREVIOUS_COMMIT=$(git log --oneline -n 2 | tail -n 1 | cut -d' ' -f1)

echo "Rolling back to commit: $PREVIOUS_COMMIT"

# Create rollback branch
git checkout -b rollback-$(date +%s)
git reset --hard $PREVIOUS_COMMIT

# Force push to trigger redeployment
git push origin rollback-$(date +%s) -f

echo "✅ Rollback initiated. Monitor deployment status."
```

## Deployment Review Process

1. **Build Validation**
   - Test builds for both web and local targets
   - Verify asset paths and routing work correctly
   - Validate feature flag configurations

2. **Deployment Testing**
   - Test GitHub Pages deployment in staging
   - Verify local package installation and functionality
   - Check cross-browser compatibility

3. **Performance Monitoring**
   - Monitor build times and bundle sizes
   - Track deployment success rates
   - Validate cache performance and loading times

4. **Rollback Preparedness**
   - Document rollback procedures
   - Test rollback scenarios
   - Ensure monitoring alerts work correctly

## Common Deployment Issues

**Path Resolution Problems**

- Incorrect base URLs for subdirectory deployment
- Asset paths not working with file:// protocol
- Router configuration issues for different targets

**Build Configuration Issues**

- Environment variables not properly configured
- Missing or incorrect feature flags
- Build artifacts not optimized for target environment

**GitHub Pages Limitations**

- Single-page application routing issues
- Custom headers not supported
- Server-side functionality limitations
- Build size limitations

Remember: Deployment is not just about getting code live - it's about delivering a reliable, performant experience across different environments. Plan for both success and failure scenarios.
