module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:3000/kaffeine-mapper/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags: "--no-sandbox --disable-setuid-sandbox",
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
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
