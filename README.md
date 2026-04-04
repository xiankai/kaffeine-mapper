# kaffeine-mapper

Coffee shop mapping and discovery application with automated quality gates.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 🎯 Quality Gates

This project enforces **6 automated quality gates** that ensure code excellence:

- 🧪 **95% Test Coverage** - Comprehensive testing required
- ⚡ **Performance** - Core Web Vitals < 2.5s LCP, < 0.1 CLS
- ♿ **Accessibility** - WCAG AA compliance, Lighthouse ≥90
- 📝 **Code Quality** - ESLint strict, TypeScript strict mode
- 🔒 **Security** - No vulnerabilities, dependency scanning
- 📄 **License Compliance** - Only approved open source licenses

See [**QUALITY_GATES.md**](./QUALITY_GATES.md) for detailed documentation.

### Run Quality Checks
```bash
npm run quality:fast    # Quick pre-commit style checks
npm run quality:all     # Full validation
```

*Quality gates run automatically on commit/push and in CI/CD pipeline.*