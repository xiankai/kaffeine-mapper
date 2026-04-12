#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Bundle Size Gate - Enforces bundle size thresholds
 * Fails CI if bundles exceed defined limits
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundle size thresholds (in KB)
const THRESHOLDS = {
  main: 500, // Main bundle max 500KB
  vendor: 800, // Vendor bundle max 800KB
  total: 1200, // Total bundle max 1.2MB
};

function analyzeBundleSize() {
  const buildPath = path.join(process.cwd(), "dist");

  if (!fs.existsSync(buildPath)) {
    console.error("❌ Build directory not found. Run `npm run build` first.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(buildPath, { recursive: true })
    .filter((file) => file.endsWith(".js") && !file.includes(".map"))
    .map((file) => {
      const filePath = path.join(buildPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);

      return {
        name: file,
        path: filePath,
        size: stats.size,
        sizeKB,
      };
    });

  // Calculate bundle categories
  const mainBundle = files.find(
    (f) => f.name.includes("main") || f.name.includes("index"),
  );
  const vendorBundles = files.filter(
    (f) => f.name.includes("vendor") || f.name.includes("chunk"),
  );
  const totalSize = files.reduce((sum, f) => sum + f.sizeKB, 0);

  console.log("\n📦 Bundle Size Analysis\n");

  let hasFailures = false;

  // Check main bundle
  if (mainBundle) {
    const status = mainBundle.sizeKB <= THRESHOLDS.main ? "✅" : "❌";
    console.log(
      `${status} Main Bundle: ${mainBundle.sizeKB}KB (limit: ${THRESHOLDS.main}KB)`,
    );
    if (mainBundle.sizeKB > THRESHOLDS.main) hasFailures = true;
  }

  // Check vendor bundles
  const vendorSize = vendorBundles.reduce((sum, f) => sum + f.sizeKB, 0);
  if (vendorSize > 0) {
    const status = vendorSize <= THRESHOLDS.vendor ? "✅" : "❌";
    console.log(
      `${status} Vendor Bundles: ${vendorSize}KB (limit: ${THRESHOLDS.vendor}KB)`,
    );
    if (vendorSize > THRESHOLDS.vendor) hasFailures = true;
  }

  // Check total size
  const totalStatus = totalSize <= THRESHOLDS.total ? "✅" : "❌";
  console.log(
    `${totalStatus} Total Bundle: ${totalSize}KB (limit: ${THRESHOLDS.total}KB)`,
  );
  if (totalSize > THRESHOLDS.total) hasFailures = true;

  // Individual file breakdown
  console.log("\n📋 Individual Files:");
  files.forEach((file) => {
    console.log(`   ${file.name}: ${file.sizeKB}KB`);
  });

  if (hasFailures) {
    console.log(
      "\n❌ Bundle size gate FAILED. Optimize bundles before merging.",
    );
    console.log("\n💡 Optimization suggestions:");
    console.log("   - Use dynamic imports for code splitting");
    console.log("   - Enable tree shaking");
    console.log("   - Analyze bundle with `npm run analyze:bundle`");
    console.log("   - Consider lazy loading heavy dependencies");
    process.exit(1);
  }

  console.log("\n✅ Bundle size gate PASSED");
}

analyzeBundleSize();
