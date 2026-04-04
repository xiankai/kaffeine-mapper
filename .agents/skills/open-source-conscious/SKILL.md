---
name: open-source-conscious
description: "License management and open source compliance. Use for managing project licenses, tracking dependency licenses, and ensuring legal compliance when adding or updating dependencies."
argument-hint: "Optional: specify dependencies or license types to focus review on"
---

# Open Source Conscious Development

## When to Use

- Setting up appropriate licenses for new projects
- Adding or updating project dependencies
- Conducting license compliance audits
- Preparing for commercial distribution or deployment
- Reviewing dependency license compatibility

## License Management Checklist

### Project License Selection

**License Type Assessment**

- [ ] Project goals and distribution model defined
- [ ] Commercial vs non-commercial use requirements considered
- [ ] Copyleft vs permissive license implications understood
- [ ] Contributor requirements and attribution preferences decided
- [ ] Patent protection and liability concerns addressed
- [ ] International usage and jurisdiction considerations reviewed

**Common License Options**

- [ ] **MIT License** - Permissive, minimal restrictions, commercial-friendly
- [ ] **Apache 2.0** - Permissive with patent protection and contributor agreement
- [ ] **GPL v3** - Copyleft, requires derivative works to be open source
- [ ] **LGPL v3** - Lesser copyleft, allows linking in proprietary software
- [ ] **BSD 3-Clause** - Permissive with attribution and endorsement clauses
- [ ] **Creative Commons** - For documentation, assets, and non-code content

### Dependency License Tracking

**License Inventory Management**

- [ ] All direct dependencies have identified licenses
- [ ] Transitive dependency licenses tracked and documented
- [ ] License compatibility matrix maintained
- [ ] Incompatible license combinations identified and avoided
- [ ] License changes monitored during dependency updates
- [ ] Commercial license requirements documented

**Automated License Checking**

- [ ] License scanning tools integrated into CI/CD pipeline
- [ ] New dependency additions trigger license review
- [ ] License policy violations block builds/deployments
- [ ] License reports generated automatically
- [ ] License change alerts configured
- [ ] Whitelist/blacklist of acceptable licenses maintained

### Legal Compliance Requirements

**Attribution & Notice Requirements**

- [ ] LICENSE file included in project root
- [ ] Third-party licenses properly attributed
- [ ] Copyright notices maintained and updated
- [ ] Attribution requirements met in distributed software
- [ ] Notice files generated for binary distributions
- [ ] Open source acknowledgments page created (for web apps)

**Distribution Compliance**

- [ ] Source code availability requirements met (GPL/LGPL)
- [ ] Binary distribution includes required notices
- [ ] Modification tracking documented where required
- [ ] Patent grant requirements understood and met
- [ ] Export control regulations considered
- [ ] Data protection and privacy law compliance

### Contributing & Governance

**Contributor Management**

- [ ] Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO)
- [ ] Copyright assignment or retention policy defined
- [ ] Contribution guidelines document license requirements
- [ ] Code of conduct established
- [ ] Maintainer permissions and responsibilities documented
- [ ] Fork and contribution workflow established

## License Management Implementation

### Project License Setup

```text
# MIT License Template (most common for permissive projects)
# Save as LICENSE file in project root

MIT License

Copyright (c) 2026 [Your Name or Organization]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Package.json License Configuration

```json
{
  "name": "your-project",
  "version": "1.0.0",
  "license": "MIT",
  "author": "Your Name <your.email@example.com>",
  "homepage": "https://github.com/yourusername/your-project",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/your-project.git"
  },
  "bugs": {
    "url": "https://github.com/yourusername/your-project/issues"
  },
  "private": false,
  "scripts": {
    "license-check": "license-checker --summary --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'",
    "license-report": "license-checker --csv --out licenses.csv",
    "license-audit": "npm audit licenses"
  }
}
```

### Automated License Checking Setup

```bash
# Install license checking tools
npm install --save-dev license-checker
npm install --save-dev license-compliance-checker
npm install --save-dev npm-license-crawler

# FOSSA CLI for comprehensive license scanning
curl -H 'Cache-Control: no-cache' https://raw.githubusercontent.com/fossas/fossa-cli/master/install.sh | bash
```

### License Configuration File

```json
// .licenserc.json - License policy configuration
{
  "allowedLicenses": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Python-2.0",
    "Zlib",
    "Unlicense"
  ],
  "blockedLicenses": [
    "GPL-2.0",
    "GPL-3.0",
    "LGPL-2.1",
    "LGPL-3.0",
    "AGPL-3.0",
    "CPAL-1.0",
    "WTFPL"
  ],
  "allowedPackages": {
    // Specific packages with normally blocked licenses that are approved
    "some-gpl-package": "GPL-3.0"
  },
  "excludePackages": [
    // Internal or development-only packages to exclude from checking
    "@types/*",
    "*-dev",
    "test-*"
  ],
  "checkTransitiveDependencies": true,
  "failOnBlocked": true,
  "generateReport": true,
  "reportPath": "./reports/licenses.json"
}
```

### License Checking Script

```javascript
// scripts/check-licenses.js
const licenseChecker = require("license-checker");
const fs = require("fs");
const path = require("path");

const config = require("../.licenserc.json");

class LicenseAuditor {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.violations = [];
    this.report = {
      timestamp: new Date().toISOString(),
      summary: {},
      dependencies: {},
      violations: [],
    };
  }

  async auditLicenses() {
    return new Promise((resolve, reject) => {
      licenseChecker.init(
        {
          start: process.cwd(),
          production: true, // Only check production dependencies
          excludePrivatePackages: true,
          onlyAllow: this.config.allowedLicenses.join(";"),
          failOn: this.config.blockedLicenses.join(";"),
          customPath: {
            licenses: "licenses",
            licenseFile: "licenseFile",
            name: "name",
            version: "version",
          },
        },
        (err, packages) => {
          if (err) {
            reject(err);
            return;
          }

          this.processPackages(packages);
          this.generateReport();

          if (this.violations.length > 0 && this.config.failOnBlocked) {
            reject(
              new Error(`License violations found: ${this.violations.length}`),
            );
          } else {
            resolve(this.report);
          }
        },
      );
    });
  }

  processPackages(packages) {
    const licenseCount = {};

    Object.entries(packages).forEach(([packageName, info]) => {
      const [name] = packageName.split("@");

      // Skip excluded packages
      if (this.isExcluded(name)) {
        return;
      }

      const licenses = Array.isArray(info.licenses)
        ? info.licenses
        : [info.licenses];

      licenses.forEach((license) => {
        licenseCount[license] = (licenseCount[license] || 0) + 1;

        // Check for violations
        if (
          this.isLicenseBlocked(license) &&
          !this.isPackageAllowed(name, license)
        ) {
          this.violations.push({
            package: packageName,
            license,
            reason: "Blocked license type",
            info,
          });
        }
      });

      this.report.dependencies[packageName] = {
        licenses,
        licenseFile: info.licenseFile,
        version: info.version,
        compliant: !this.violations.find((v) => v.package === packageName),
      };
    });

    this.report.summary = {
      totalPackages: Object.keys(packages).length,
      licenseDistribution: licenseCount,
      violations: this.violations.length,
      compliant: this.violations.length === 0,
    };
  }

  isExcluded(packageName) {
    return this.config.excludePackages.some((pattern) => {
      if (pattern.includes("*")) {
        const regex = new RegExp(pattern.replace(/\*/g, ".*"));
        return regex.test(packageName);
      }
      return packageName === pattern;
    });
  }

  isLicenseBlocked(license) {
    return this.config.blockedLicenses.includes(license);
  }

  isPackageAllowed(packageName, license) {
    return this.config.allowedPackages[packageName] === license;
  }

  generateReport() {
    if (this.config.generateReport) {
      const reportDir = path.dirname(this.config.reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      fs.writeFileSync(
        this.config.reportPath,
        JSON.stringify(this.report, null, 2),
      );

      // Generate human-readable summary
      this.generateSummaryReport();
    }

    // Log summary to console
    console.log("\n📋 License Audit Summary:");
    console.log(`   Total Dependencies: ${this.report.summary.totalPackages}`);
    console.log(`   License Violations: ${this.violations.length}`);
    console.log(
      `   Compliance Status: ${this.report.summary.compliant ? "✅ PASS" : "❌ FAIL"}`,
    );

    if (this.violations.length > 0) {
      console.log("\n❌ License Violations:");
      this.violations.forEach((violation) => {
        console.log(
          `   ${violation.package}: ${violation.license} (${violation.reason})`,
        );
      });
    }
  }

  generateSummaryReport() {
    const summaryPath = this.config.reportPath.replace(".json", "-summary.md");

    const markdown = `
# License Audit Report

**Generated:** ${this.report.timestamp}
**Total Dependencies:** ${this.report.summary.totalPackages}
**License Violations:** ${this.violations.length}
**Status:** ${this.report.summary.compliant ? "✅ COMPLIANT" : "❌ NON-COMPLIANT"}

## License Distribution

${Object.entries(this.report.summary.licenseDistribution)
  .sort(([, a], [, b]) => b - a)
  .map(([license, count]) => `- **${license}**: ${count} packages`)
  .join("\n")}

${
  this.violations.length > 0
    ? `
## Violations

${this.violations
  .map(
    (v) => `
### ${v.package}
- **License:** ${v.license}
- **Reason:** ${v.reason}
- **Action Required:** Review license compatibility or replace dependency
`,
  )
  .join("")}
`
    : ""
}

## Recommendations

- Review all GPL/LGPL dependencies for compliance requirements
- Consider replacing copyleft dependencies with permissive alternatives
- Ensure proper attribution for all dependencies in final distribution
- Set up automated license monitoring for future dependency changes
`;

    fs.writeFileSync(summaryPath, markdown.trim());
  }
}

// CLI usage
if (require.main === module) {
  const auditor = new LicenseAuditor();
  auditor
    .auditLicenses()
    .then((report) => {
      console.log("\n✅ License audit completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ License audit failed:", error.message);
      process.exit(1);
    });
}

module.exports = LicenseAuditor;
```

### GitHub Actions License Monitoring

```yaml
# .github/workflows/license-check.yml
name: License Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 2 * * 1" # Weekly on Monday at 2 AM

jobs:
  license-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Check licenses
        run: |
          npm run license-check
          node scripts/check-licenses.js

      - name: Upload license report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: license-report
          path: |
            reports/licenses.json
            reports/licenses-summary.md

      - name: Comment on PR with license changes
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            if (fs.existsSync('reports/licenses-summary.md')) {
              const report = fs.readFileSync('reports/licenses-summary.md', 'utf8');
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `## License Audit Report\n\n${report}`
              });
            }
```

### FOSSA Integration for Enterprise

```yaml
# .fossa.yml - FOSSA configuration for comprehensive license tracking
version: 3

targets:
  - name: npm
    type: npm
    path: .

policies:
  - name: default-policy
    type: licensing
    rules:
      - license-allowlist:
          - MIT
          - Apache-2.0
          - BSD-2-Clause
          - BSD-3-Clause
          - ISC
      - license-denylist:
          - GPL-2.0+
          - GPL-3.0+
          - LGPL-2.1+
          - LGPL-3.0+
          - AGPL-3.0+

project:
  name: "Your Project Name"
  team: "Development Team"
  policy: "default-policy"

# CLI command: fossa analyze && fossa test
```

## License Documentation Templates

### NOTICE File Template

```text
# NOTICE

This software contains open source software packages from third parties.

## Direct Dependencies

### React (MIT License)
Copyright (c) Meta Platforms, Inc. and affiliates.
License: MIT
Source: https://github.com/facebook/react

### Express (MIT License)
Copyright (c) 2009-2014 TJ Holowaychuk <tj@vision-media.ca>
Copyright (c) 2013-2014 Roman Shtylman <shtylman+expressjs@gmail.com>
Copyright (c) 2014-2015 Douglas Christopher Wilson <doug@somethingdoug.com>
License: MIT
Source: https://github.com/expressjs/express

[Continue for all dependencies...]

## Full License Texts

[Include full license texts for all dependencies as required by their licenses]
```

### Contributing Guidelines with License Requirements

```markdown
# Contributing Guidelines

## License Agreement

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

### Developer Certificate of Origin

We require all contributors to certify that they have the right to contribute the code by signing off on the Developer Certificate of Origin (DCO). Add the following line to your commit messages:
```

Signed-off-by: Your Name <your.email@example.com>

```

### Adding New Dependencies

Before adding new dependencies:

1. Check the dependency's license compatibility
2. Ensure it's on our approved license list
3. Run `npm run license-check` to verify compliance
4. Update documentation if new license types are introduced

### Approved Licenses

- MIT
- Apache-2.0
- BSD-2-Clause
- BSD-3-Clause
- ISC

### Restricted Licenses

Dependencies with these licenses require special approval:
- GPL (any version)
- LGPL (any version)
- AGPL (any version)
- Commercial/Proprietary licenses
```

### License Compatibility Matrix

```javascript
// licenseCompatibility.js
const LICENSE_COMPATIBILITY = {
  // Key: Project License, Value: Compatible dependency licenses
  MIT: [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Unlicense",
    "CC0-1.0",
  ],
  "Apache-2.0": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Unlicense",
  ],
  "GPL-3.0": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "GPL-2.0+",
    "GPL-3.0+",
    "LGPL-2.1+",
    "LGPL-3.0+",
  ],
  "LGPL-3.0": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "LGPL-2.1+",
    "LGPL-3.0+",
  ],
  "BSD-3-Clause": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC",
    "Unlicense",
  ],
};

const COPYLEFT_LICENSES = [
  "GPL-2.0",
  "GPL-3.0",
  "LGPL-2.1",
  "LGPL-3.0",
  "AGPL-3.0",
];
const PERMISSIVE_LICENSES = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
];

const checkCompatibility = (projectLicense, dependencyLicense) => {
  const compatible = LICENSE_COMPATIBILITY[projectLicense] || [];
  return compatible.includes(dependencyLicense);
};

const isCommercialFriendly = (license) => {
  return PERMISSIVE_LICENSES.includes(license);
};

const requiresSourceDistribution = (license) => {
  return COPYLEFT_LICENSES.includes(license);
};

module.exports = {
  LICENSE_COMPATIBILITY,
  COPYLEFT_LICENSES,
  PERMISSIVE_LICENSES,
  checkCompatibility,
  isCommercialFriendly,
  requiresSourceDistribution,
};
```

## License Review Process

1. **New Project Setup**
   - Choose appropriate license based on project goals
   - Document license decision rationale
   - Set up license checking tools and policies
   - Create contributing guidelines

2. **Dependency Addition/Updates**
   - Check new dependency licenses before installation
   - Verify compatibility with project license
   - Update license inventory and reports
   - Document any special requirements or considerations

3. **Regular License Audits**
   - Weekly automated license scans
   - Quarterly comprehensive license reviews
   - Annual license policy updates
   - Monitor for license changes in existing dependencies

4. **Distribution Preparation**
   - Generate complete license notices
   - Verify attribution requirements are met
   - Check compliance with copyleft obligations
   - Create distribution-ready license documentation

## Common License Issues

**Incompatible License Mixing**

- GPL dependencies in MIT projects without proper isolation
- Mixing copyleft and proprietary components incorrectly
- Using AGPL dependencies in SaaS applications
- Not understanding license compatibility requirements

**Attribution Failures**

- Missing copyright notices in distributions
- Incomplete third-party license attribution
- Not including required license texts
- Failing to track license changes in dependency updates

**Copyleft Compliance Issues**

- Not providing source code when required by GPL/LGPL
- Improper handling of modified copyleft components
- Missing contributor license agreements
- Not understanding viral nature of copyleft licenses

**Commercial Distribution Problems**

- Using GPL components in commercial products
- Not understanding patent implications of licenses
- Missing export control considerations
- Inadequate legal review for commercial use

Remember: License compliance is not just about avoiding legal issues - it's about respecting the open source community and maintaining trust. When in doubt, consult with legal counsel, especially for commercial projects or complex license scenarios.
