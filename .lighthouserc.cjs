module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/kaffeine-mapper/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags:
          "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      preset: "lighthouse:no-pwa",
      assertions: {
        "categories:performance": ["error", { minScore: 0.5 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "first-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "unused-javascript": "off",
        "render-blocking-resources": "warn",
        "csp-xss": "off",
        "errors-in-console": "off",
        "tap-targets": "off",
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
