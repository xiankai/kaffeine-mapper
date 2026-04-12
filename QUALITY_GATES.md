# 🎯 Quality Gates & Automated Hooks

This project enforces quality standards through automated hooks that run during development, pre-commit, and CI/CD pipeline.

## 📋 Quality Gates Overview

### ✅ **5 Automated Hooks** (Fail CI if thresholds not met)

| Hook                  | Threshold                                 | Trigger                | Purpose                       |
| --------------------- | ----------------------------------------- | ---------------------- | ----------------------------- |
| **Coverage Gate**     | ≥95% line, 90% branch, 100% function      | CI, pre-push           | Ensures comprehensive testing |
| **Performance Gate**  | LCP <2.5s, CLS <0.1, FID <100ms           | CI, pre-deploy         | Validates Core Web Vitals     |
| **Code Quality Gate** | ESLint strict, TypeScript strict          | pre-commit, CI         | Enforces coding standards     |
| **Security Gate**     | No high vulnerabilities, deps scanned     | CI, pre-push           | Prevents security issues      |
| **License Gate**      | Only approved licenses (MIT, Apache, etc) | CI, dependency updates | Legal compliance              |

---

## 🚀 Quick Start

### 1. **Setup Hooks**

```bash
npm install          # Installs husky hooks automatically
npm run prepare      # Manual hook setup if needed
```

### 2. **Run Quality Checks Locally**

```bash
# Quick checks (pre-commit style)
npm run quality:fast

# Full validation (pre-push style)
npm run quality:all

# Individual gates
npm run test:coverage        # Coverage gate
npm run perf:audit          # Performance gate
npm run a11y:check          # Accessibility gate
npm run lint:check          # Code quality gate
npm run security:audit      # Security gate
npm run license:check       # License gate
```

---

## 🔧 Hook Details

### 🧪 **Coverage Gate (95% Required)**

```bash
# Local testing
npm run test:coverage

# CI enforcement
jest --coverageThreshold='{"global":{"lines":95,"branches":90,"functions":100,"statements":95}}'
```

**Fails if:** Line coverage <95%, branch coverage <90%, any function uncovered

### ⚡ **Performance & Accessibility Gate**

```bash
# Local testing
npm run build && npm run analyze:bundle
npm run perf:audit
npm run a11y:audit          # Lighthouse accessibility

# CI enforcement
lhci autorun  # Uses .lighthouserc.cjs thresholds
```

**Fails if:** LCP >2.5s, CLS >0.1, FID >100ms, bundle >1.2MB total, Lighthouse accessibility <90

### 📝 **Code Quality Gate**

```bash
# Local testing
npm run lint:check          # ESLint strict rules
npm run type-check          # TypeScript strict mode
npm run imports:check       # Import organization

# CI enforcement
eslint src/ --max-warnings 0
```

**Fails if:** ESLint errors, TypeScript errors, complexity >10, missing types

### 🔒 **Security Gate**

```bash
# Local testing
npm run security:audit      # npm audit
npm run security:scan       # Snyk scan
npm run security:deps       # Dependency audit

# CI enforcement
npm audit --audit-level high
snyk test --severity-threshold=high
```

**Fails if:** High/critical vulnerabilities, malicious dependencies, insecure patterns

### 📄 **License Gate**

```bash
# Local testing
npm run license:check       # Compatibility check
npm run license:report      # Generate report

# CI enforcement
license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'
```

**Fails if:** GPL/copyleft licenses, incompatible licenses, missing LICENSE file

---

## 🕰️ When Hooks Run

### **Pre-commit** (Fast checks - ~30s)

- ✅ Lint staged files (ESLint + Prettier)
- ✅ TypeScript type check
- ✅ Tests for changed files only
- ✅ Basic security scan

### **Pre-push** (Full validation - ~2-3min)

- ✅ Full test suite with coverage gate
- ✅ Bundle size analysis
- ✅ Security audit
- ✅ License compliance check

### **CI/CD Pipeline** (Complete validation - ~5-8min)

- ✅ All 5 quality gates enforced
- ✅ Performance & accessibility audit on live build
- ✅ Security scanning (Semgrep)
- ✅ License compliance validation

---

## 🛠️ Configuration Files

| File                                         | Purpose                     | Enforced Thresholds                       |
| -------------------------------------------- | --------------------------- | ----------------------------------------- |
| [`jest.config.js`](./jest.config.js)         | Coverage thresholds         | Lines ≥95%, branches ≥90%, functions 100% |
| [`.eslintrc.js`](./.eslintrc.js)             | Code quality rules          | Max complexity 10, strict TypeScript      |
| [`tsconfig.json`](./tsconfig.json)           | TypeScript settings         | Strict mode, no implicit any              |
| [`.lighthouserc.cjs`](./.lighthouserc.cjs)   | Performance & accessibility | LCP <2.5s, CLS <0.1, FID <100ms, A11y ≥90 |
| [`.lintstagedrc.json`](./.lintstagedrc.json) | Pre-commit rules            | Auto-fix on commit                        |

---

## 🚨 Troubleshooting Failed Gates

### **Coverage Gate Failed**

```bash
# Generate detailed coverage report
npm run test:coverage -- --verbose

# View HTML coverage report
open coverage/lcov-report/index.html

# Fix: Add missing tests for uncovered lines
```

### **Performance Gate Failed**

```bash
# Analyze bundle size
npm run build:analyze

# Check Core Web Vitals & Accessibility
npm run perf:audit
npm run a11y:audit

# Fix: Code splitting, lazy loading, optimize images, improve accessibility
```

### **Code Quality Gate Failed**

```bash
# Auto-fix linting issues
npm run lint:fix

# Check specific TypeScript errors
npm run type-check

# Fix: Address ESLint errors, add missing types
```

### **Security Gate Failed**

```bash
# View detailed vulnerabilities
npm audit

# Fix high-priority issues
npm audit fix --force

# Update vulnerable dependencies
npm update
```

### **License Gate Failed**

```bash
# View problematic licenses
npm run license:report

# Fix: Replace GPL dependencies with MIT alternatives
```

---

## 🎯 Benefits

✅ **Catches issues early** - Problems found at commit time, not in production
✅ **Consistency** - Same quality standards across all developers
✅ **Automated** - No manual checklist, enforced by tooling
✅ **Fast feedback** - Pre-commit hooks run in ~30 seconds
✅ **Comprehensive** - Covers code quality, performance, security, accessibility, legal compliance

---

## 🔧 Customizing Thresholds

Edit these files to adjust quality gate thresholds:

- **Coverage**: [`jest.config.js`](./jest.config.js) → `coverageThreshold`
- **Performance & Accessibility**: [`.lighthouserc.cjs`](./.lighthouserc.cjs) → `assert.assertions`
- **Bundle Size**: [`scripts/check-bundle-size.js`](./scripts/check-bundle-size.js) → `THRESHOLDS`
- **Code Quality**: [`.eslintrc.js`](./.eslintrc.js) → `rules`

---

_Quality gates ensure code excellence without slowing down development. All gates are designed to run fast and provide actionable feedback._
