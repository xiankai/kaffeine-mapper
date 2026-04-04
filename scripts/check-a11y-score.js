#!/usr/bin/env node

/**
 * Accessibility Score Gate - Enforces Lighthouse accessibility score ≥90
 * Fails CI if accessibility standards not met
 */

const fs = require("fs");
const path = require("path");

const ACCESSIBILITY_THRESHOLD = 90; // Minimum score required

function checkAccessibilityScore() {
  const reportPath = path.join(process.cwd(), "lighthouse-a11y.json");

  if (!fs.existsSync(reportPath)) {
    console.error("❌ Lighthouse accessibility report not found.");
    console.error(
      "   Run: npx lighthouse http://localhost:3000 --only-categories=accessibility --output=json --output-path=./lighthouse-a11y.json",
    );
    process.exit(1);
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch (error) {
    console.error("❌ Failed to parse Lighthouse report:", error.message);
    process.exit(1);
  }

  const accessibilityScore = Math.round(
    report.categories.accessibility.score * 100,
  );
  const audits = report.audits;

  console.log("\n♿ Accessibility Score Analysis\n");

  // Overall score check
  const scoreStatus =
    accessibilityScore >= ACCESSIBILITY_THRESHOLD ? "✅" : "❌";
  console.log(
    `${scoreStatus} Accessibility Score: ${accessibilityScore}/100 (required: ≥${ACCESSIBILITY_THRESHOLD})`,
  );

  // Critical accessibility failures
  const criticalFailures = Object.entries(audits).filter(
    ([key, audit]) =>
      audit.score !== null &&
      audit.score < 1 &&
      [
        "color-contrast",
        "image-alt",
        "label",
        "link-name",
        "button-name",
      ].includes(key),
  );

  if (criticalFailures.length > 0) {
    console.log("\n❌ Critical Accessibility Issues:");
    criticalFailures.forEach(([key, audit]) => {
      console.log(`   • ${audit.title}`);
      if (audit.description) {
        console.log(`     ${audit.description}`);
      }
    });
  }

  // WCAG compliance check
  const wcagAudits = {
    "color-contrast": "Color contrast meets WCAG AA (4.5:1)",
    "image-alt": "Images have alt attributes",
    label: "Form elements have labels",
    "link-name": "Links have descriptive text",
    "button-name": "Buttons have accessible names",
    "heading-order": "Headings are in logical order",
    "landmark-one-main": "Page has main landmark",
    "focus-traps": "Focus is properly trapped",
  };

  console.log("\n📋 WCAG Compliance Check:");
  Object.entries(wcagAudits).forEach(([auditKey, description]) => {
    const audit = audits[auditKey];
    if (audit) {
      const status = audit.score === 1 ? "✅" : "❌";
      console.log(`   ${status} ${description}`);
    }
  });

  // Touch target size check
  const touchTargets = audits["tap-targets"];
  if (touchTargets) {
    const status = touchTargets.score === 1 ? "✅" : "❌";
    console.log(`   ${status} Touch targets meet minimum size (44px)`);
  }

  if (
    accessibilityScore < ACCESSIBILITY_THRESHOLD ||
    criticalFailures.length > 0
  ) {
    console.log("\n❌ Accessibility gate FAILED.");
    console.log("\n💡 Fix these issues:");
    console.log("   - Ensure color contrast meets 4.5:1 ratio");
    console.log("   - Add alt text to all images");
    console.log("   - Label all form elements");
    console.log("   - Use semantic HTML elements");
    console.log("   - Test with screen readers");
    console.log("\n   Run: npm run a11y:test for detailed analysis");
    process.exit(1);
  }

  console.log("\n✅ Accessibility gate PASSED");
}

if (require.main === module) {
  checkAccessibilityScore();
}

module.exports = checkAccessibilityScore;
