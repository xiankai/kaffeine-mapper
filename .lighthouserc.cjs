module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:3000/"],
      numberOfRuns: 3,
      settings: {
        chromeFlags:
          "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
