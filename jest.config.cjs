module.exports = {
  // Test environment
  testEnvironment: "@happy-dom/jest-environment",

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],

  // Module name mapper for aliases and static assets
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@components/(.*)$": "<rootDir>/src/components/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
    "^@hooks/(.*)$": "<rootDir>/src/hooks/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/src/test/__mocks__/fileMock.js",
    "^(.+)\\.js$": "$1",
  },

  // File extensions to consider
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Transform files with TypeScript
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },

  globals: { __GOOGLE_CLIENT_ID__: "" },

  // Test file patterns
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)",
    "<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)",
  ],

  // Coverage configuration - ENFORCED THRESHOLDS
  // collectCoverage is NOT set here so it only activates with --coverage flag (e.g. test:coverage)
  // Excludes untested components - add them here when tests are written
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/test/**",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    "!src/**/*.stories.tsx",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
    "!src/components/MapPanel.tsx",
    "!src/App.tsx",
    "!src/services/timelineWorker.ts",
    "!src/services/parseTimelineFile.ts",
    "!src/sw/serviceWorker.ts",
  ],

  // Skip coverage instrumentation for these paths
  testPathIgnorePatterns: ["/node_modules/"],

  // Coverage instrumentation settings - use v8 for cleaner output without minimatch issues
  coverageProvider: "v8",

  // COVERAGE GATES - Applied to tested files only (see collectCoverageFrom exclusions)
  coverageThreshold: {
    global: {
      lines: 95, // 95% line coverage required
      branches: 90, // 90% branch coverage required
      functions: 100, // 100% function coverage required
      statements: 95, // 95% statement coverage required
    },
  },

  // Coverage output formats
  coverageReporters: [
    "text", // Console output
    "lcov", // For Codecov integration
    "html", // HTML report
    "cobertura", // For GitHub Actions comments
    "json-summary", // For programmatic access
  ],

  // Coverage directory
  coverageDirectory: "coverage",

  // Test timeout
  testTimeout: 10000,

  // Verbose output for CI
  verbose: process.env.CI === "true",

  // Fail fast in CI
  bail: process.env.CI === "true" ? 1 : 0,

  // Performance options
  maxWorkers: process.env.CI === "true" ? 2 : "50%",
};
