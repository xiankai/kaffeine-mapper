---
name: local-development
description: "Developer-friendly local setup with easy startup, hot reloading, debugging tools, and streamlined development workflow. Use for optimizing development experience, onboarding, and productivity."
argument-hint: "Optional: specify development environment or platform to focus setup on"
---

# Local Development Setup

## When to Use

- Setting up developer-friendly local environments
- Optimizing development workflow and productivity
- Creating smooth onboarding experience for new developers
- Implementing hot reloading and live development features
- Establishing debugging and development tooling standards

## Development Experience Checklist

### Easy Startup (One-Command Setup Goal)

**Quick Start Requirements**

- [ ] Single command to start entire development environment
- [ ] Automated dependency installation and setup
- [ ] Environment variables automatically configured
- [ ] Database/services start automatically
- [ ] Hot reloading enabled by default
- [ ] Development server starts on consistent port

**Onboarding Experience**

- [ ] Clear README with setup instructions
- [ ] Prerequisites check script
- [ ] Sample data and test users provided
- [ ] Development vs production configuration clearly separated
- [ ] Troubleshooting guide for common issues
- [ ] Video walkthrough or setup documentation

### Development Workflow

**Hot Reloading & Live Updates**

- [ ] Code changes reflected immediately without manual restart
- [ ] CSS/styling updates without page refresh
- [ ] API changes trigger automatic server restart
- [ ] Database schema changes handled gracefully
- [ ] Asset changes (images, fonts) hot-reloaded
- [ ] Configuration changes detected and applied

**Developer Tools Integration**

- [ ] Source maps enabled for debugging
- [ ] Browser developer tools integration
- [ ] VSCode/IDE debugging configuration provided
- [ ] Linting and formatting on file save
- [ ] Type checking in real-time
- [ ] Git hooks for code quality enforcement

**Local Testing Environment**

- [ ] Test database seeded with realistic data
- [ ] Mock external services for offline development
- [ ] Feature flags for testing different scenarios
- [ ] Local SSL/HTTPS setup when needed
- [ ] Cross-browser testing tools available
- [ ] Performance profiling tools integrated

### Environment Configuration

**Configuration Management**

- [ ] Environment variables documented and templated
- [ ] Sensitive credentials handled securely (not in repo)
- [ ] Different configurations for development/staging/production
- [ ] Easy switching between environment configurations
- [ ] Configuration validation on startup
- [ ] Default values provided for optional settings

**Service Dependencies**

- [ ] Database containerized or easily installable
- [ ] External APIs mocked or stubbed for offline work
- [ ] Message queues and caches run locally
- [ ] File storage simulated locally
- [ ] Third-party services have development alternatives
- [ ] Dependency health checks included

## Development Setup Examples

### Package.json Development Scripts

```json
{
  "scripts": {
    "setup": "npm install && npm run setup:env && npm run setup:db && npm run setup:data",
    "setup:env": "cp .env.example .env.local && echo 'Please configure .env.local with your settings'",
    "setup:db": "docker-compose up -d postgres && npm run db:migrate",
    "setup:data": "npm run db:seed",

    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:watch\"",
    "dev:server": "nodemon --watch src --ext js,ts,json src/server.js",
    "dev:client": "vite --port 3000 --host",
    "dev:watch": "tsc --watch",

    "start": "npm run setup && npm run dev",
    "check": "npm run check:deps && npm run check:env && npm run check:services",
    "check:deps": "node scripts/check-prerequisites.js",
    "check:env": "node scripts/validate-config.js",
    "check:services": "node scripts/health-check.js",

    "clean": "npm run clean:deps && npm run clean:data && npm run clean:cache",
    "clean:deps": "rm -rf node_modules package-lock.json",
    "clean:data": "docker-compose down -v",
    "clean:cache": "rm -rf .vite dist coverage .nyc_output",

    "format": "prettier --write .",
    "lint": "eslint . --fix",
    "typecheck": "tsc --noEmit"
  }
}
```

### Docker Compose for Services

```yaml
# docker-compose.dev.yml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: app_development
      POSTGRES_USER: developer
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025" # SMTP
      - "8025:8025" # Web interface

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000" # API
      - "9001:9001" # Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### Environment Configuration

```bash
# .env.example
# Copy to .env.local and configure

# Application
NODE_ENV=development
PORT=3001
HOST=localhost

# Database
DATABASE_URL=postgresql://developer:dev_password@localhost:5432/app_development

# Redis
REDIS_URL=redis://localhost:6379

# File Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# Email (development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@localhost

# External APIs (use mock/sandbox environments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
GITHUB_CLIENT_ID=development_client_id

# Feature Flags
FEATURE_NEW_DASHBOARD=true
FEATURE_BETA_SEARCH=false

# Debug Settings
DEBUG=app:*
LOG_LEVEL=debug
ENABLE_QUERY_LOGGING=true
```

### Prerequisites Check Script

```javascript
// scripts/check-prerequisites.js
const { execSync } = require("child_process");
const fs = require("fs");

const requirements = [
  {
    name: "Node.js",
    command: "node --version",
    version: "18.0.0",
    install: "Install from https://nodejs.org or use nvm",
  },
  {
    name: "Docker",
    command: "docker --version",
    version: "20.0.0",
    install: "Install Docker Desktop from https://docker.com",
  },
  {
    name: "Git",
    command: "git --version",
    version: "2.30.0",
    install: "Install from https://git-scm.com",
  },
];

function checkRequirements() {
  console.log("🔍 Checking development prerequisites...\n");

  let allSatisfied = true;

  requirements.forEach((req) => {
    try {
      const output = execSync(req.command, { encoding: "utf8" });
      const installedVersion = output.match(/(\d+\.\d+\.\d+)/)?.[1];

      if (
        installedVersion &&
        compareVersions(installedVersion, req.version) >= 0
      ) {
        console.log(`✅ ${req.name}: ${installedVersion}`);
      } else {
        console.log(
          `❌ ${req.name}: ${installedVersion || "Unknown"} (requires ${req.version}+)`,
        );
        console.log(`   ${req.install}\n`);
        allSatisfied = false;
      }
    } catch (error) {
      console.log(`❌ ${req.name}: Not found`);
      console.log(`   ${req.install}\n`);
      allSatisfied = false;
    }
  });

  // Check for environment file
  if (!fs.existsSync(".env.local")) {
    console.log("⚠️  No .env.local file found");
    console.log("   Run: cp .env.example .env.local\n");
    allSatisfied = false;
  }

  if (allSatisfied) {
    console.log("🎉 All prerequisites satisfied! Run npm run start to begin.");
  } else {
    console.log("❌ Please install missing prerequisites and try again.");
    process.exit(1);
  }
}

function compareVersions(a, b) {
  const aParts = a.split(".").map(Number);
  const bParts = b.split(".").map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}

checkRequirements();
```

### Vite Development Configuration

```javascript
// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    host: true, // Allow external connections
    open: true, // Open browser on start

    // Hot reload configuration
    hmr: {
      overlay: true, // Show errors in browser overlay
    },

    // Proxy API calls to backend
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },

  // Source maps for debugging
  build: {
    sourcemap: true,
  },

  // Path aliases for cleaner imports
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@utils": "/src/utils",
    },
  },

  // Environment variable prefix
  envPrefix: "VITE_",
});
```

### VSCode Development Configuration

```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.css": "postcss"
  }
}

// .vscode/launch.json (debugging configuration)
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Node Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "restart": true,
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Development Workflow Optimization

### Git Hooks Setup

```bash
# package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run typecheck && npm test"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss,md}": ["prettier --write"]
  }
}
```

### Development Database Seeding

```javascript
// scripts/seed-dev-data.js
const seedDevelopmentData = async () => {
  console.log("🌱 Seeding development database...");

  // Create test users with different roles
  const users = await createTestUsers([
    { email: "admin@dev.local", role: "admin", name: "Admin User" },
    { email: "user@dev.local", role: "user", name: "Regular User" },
    { email: "editor@dev.local", role: "editor", name: "Editor User" },
  ]);

  // Create sample content
  const posts = await createSamplePosts(users);
  const comments = await createSampleComments(posts, users);

  console.log(
    `✅ Created ${users.length} users, ${posts.length} posts, ${comments.length} comments`,
  );
  console.log("\n📋 Test Accounts:");
  users.forEach((user) => {
    console.log(`   ${user.email} (${user.role}) - password: password123`);
  });
};
```

### Live Reload for Full-Stack

```javascript
// nodemon.json
{
  "watch": ["src", "config"],
  "ext": "js,ts,json,yml",
  "ignore": ["src/**/*.test.js", "node_modules"],
  "exec": "node -r dotenv/config src/server.js",
  "env": {
    "NODE_ENV": "development"
  },
  "events": {
    "start": "echo 'Server starting...'",
    "restart": "echo 'Server restarted due to file changes'"
  }
}
```

## Development Productivity Features

### Auto-formatting and Linting

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}

// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
```

### Development Shortcuts and Aliases

```bash
# Add to package.json scripts for convenience
{
  "scripts": {
    "reset": "npm run clean && npm run setup",
    "fresh": "npm run reset && npm run dev",
    "db:reset": "npm run db:drop && npm run db:create && npm run db:migrate && npm run db:seed",
    "logs": "docker-compose logs -f",
    "shell": "docker-compose exec postgres psql -U developer -d app_development"
  }
}
```

## Development Review Process

1. **Environment Setup Validation**
   - Test one-command setup on clean machine
   - Verify all services start correctly
   - Validate development data seeding

2. **Developer Experience Assessment**
   - Time from clone to running application
   - Hot reload functionality across all changes
   - Debugging tools accessibility and effectiveness

3. **Documentation Review**
   - Setup instructions clarity and completeness
   - Troubleshooting coverage for common issues
   - Development workflow documentation

4. **Onboarding Test**
   - New developer can set up and start contributing quickly
   - Common development tasks are streamlined
   - Development environment matches production behavior

## Common Development Issues

**Slow Startup**

- Heavy dependency installation on every setup
- Services starting sequentially instead of parallel
- Database migrations running unnecessarily
- Missing development optimizations

**Poor Developer Experience**

- Manual restart required for code changes
- Difficult debugging setup
- Inconsistent environment configuration
- Missing development tooling integration

**Environment Drift**

- Development environment doesn't match production
- Inconsistent service versions across developers
- Missing or outdated sample data
- Configuration differences causing hard-to-reproduce bugs

Remember: The best development environment is invisible - developers should focus on building features, not fighting with setup and tooling. Invest in automation and developer experience early for long-term productivity gains.
