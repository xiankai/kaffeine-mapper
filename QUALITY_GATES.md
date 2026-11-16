# Quality gates

| Gate         | Fails when                                                                                      | Local                                                | CI                |
| ------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------- |
| Coverage     | lines or statements < 95%, branches < 90%, any function uncovered                               | `pnpm run test:coverage`                             | coverage-gate     |
| Code quality | ESLint or TypeScript errors; complexity > 12, nesting > 4, functions > 100 lines (tests exempt) | `pnpm run lint:check`, `type-check`, `imports:check` | code-quality-gate |
| Security     | any advisory in a runtime dependency, or a high/critical advisory in any dependency             | `pnpm run security:audit`                            | security-gate     |
| Licenses     | a production dependency outside the allowlist in `scripts/check-licenses.js`                    | `pnpm run license:check`                             | license-gate      |
| Bundle size  | the built bundle exceeds the limits in `scripts/check-bundle-size.js`                           | `pnpm run build && pnpm run analyze:bundle`          | performance-gate  |
| Lighthouse   | performance < 0.5 or accessibility < 0.9 (`.lighthouserc.cjs`)                                  | `pnpm run perf:audit`                                | performance-gate  |

## Hooks

- **pre-commit:** lint-staged (ESLint fix, Prettier, type-check, related tests).
- **pre-push:** `pnpm run quality:all` (lint, types, coverage, audit, licenses), then a build and the bundle-size check.

## Fixing a failed audit

`pnpm audit` lists each advisory with the path that pulls it in. Prefer upgrading or removing the package that brings it in over adding an entry to `overrides` in `pnpm-workspace.yaml`; an override is for a transitive fix the parent hasn't released yet, and should be removed once it has.
