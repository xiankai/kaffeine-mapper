---
name: unit-testing
description: "Comprehensive unit testing strategy with 95% coverage goal. Use for test planning, test-driven development, coverage analysis, and ensuring robust testing practices across any codebase."
argument-hint: "Optional: specify files/modules to focus testing review on"
---

# Unit Testing Strategy

## When to Use

- Planning comprehensive test coverage for new features
- Reviewing existing test suites for completeness
- Implementing test-driven development (TDD) practices
- Achieving and maintaining 95% code coverage targets
- Establishing testing standards across the codebase

## Testing Strategy Checklist

### Coverage Goals & Standards

**Coverage Targets (95% Goal)**

- [ ] Line coverage ≥ 95%
- [ ] Branch coverage ≥ 90%
- [ ] Function coverage = 100%
- [ ] Statement coverage ≥ 95%
- [ ] Critical paths have 100% coverage
- [ ] Edge cases and error conditions covered

**Coverage Analysis**

- [ ] Coverage reports generated and reviewed regularly
- [ ] Uncovered lines identified and justified
- [ ] Coverage trends tracked over time
- [ ] Pull requests include coverage diff analysis
- [ ] Coverage gates enforced in CI/CD pipeline
- [ ] Coverage exclusions documented and minimal

### Test Structure & Organization

**Test File Organization**

- [ ] Test files co-located with source code or in dedicated test directories
- [ ] Consistent naming convention (_.test.js, _.spec.ts, etc.)
- [ ] Test suites logically organized by feature/module
- [ ] Shared test utilities and helpers extracted
- [ ] Test data and fixtures managed centrally
- [ ] Mock and stub definitions reusable

**Test Case Design**

- [ ] Each function/method has dedicated test suite
- [ ] Happy path scenarios thoroughly tested
- [ ] Edge cases and boundary conditions covered
- [ ] Error conditions and exception handling tested
- [ ] Input validation and sanitization verified
- [ ] Output formats and return values validated

### Test Quality Standards

**Test Characteristics**

- [ ] Tests are fast (unit tests < 100ms each)
- [ ] Tests are independent and can run in any order
- [ ] Tests are deterministic (no flaky tests)
- [ ] Tests have clear, descriptive names
- [ ] Test failures provide actionable error messages
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)

**Mocking & Isolation**

- [ ] External dependencies mocked appropriately
- [ ] Database calls stubbed in unit tests
- [ ] API calls intercepted and mocked
- [ ] File system operations mocked
- [ ] Time-dependent code uses controllable time
- [ ] Random number generation made deterministic

### Test-Driven Development

**TDD Workflow**

- [ ] Red-Green-Refactor cycle followed
- [ ] Tests written before implementation code
- [ ] Minimal code written to make tests pass
- [ ] Refactoring done with test safety net
- [ ] Test cases drive API design decisions
- [ ] Edge cases identified during test writing

**TDD Benefits Achieved**

- [ ] High confidence in code correctness
- [ ] Better API design through test-first approach
- [ ] Comprehensive test coverage by design
- [ ] Easier refactoring with test safety net
- [ ] Documentation through executable examples
- [ ] Reduced debugging time

## Testing Tools & Setup

**JavaScript/TypeScript**

```bash
# Jest testing framework
npm install --save-dev jest @types/jest
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Coverage reporting
npm install --save-dev @istanbuljs/nyc

# Test configuration in package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  },
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!src/index.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 90,
        "functions": 100,
        "lines": 95,
        "statements": 95
      }
    }
  }
}
```

**Python**

```bash
# pytest and coverage tools
pip install pytest pytest-cov pytest-mock

# Configuration in pyproject.toml
[tool.pytest.ini_options]
minversion = "6.0"
testpaths = ["tests"]
addopts = "--cov=src --cov-report=html --cov-report=term-missing --cov-fail-under=95"

[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/test_*.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError"
]
```

**Coverage Analysis Commands**

```bash
# Generate coverage reports
npm run test:coverage
pytest --cov=src --cov-report=html

# Open coverage report in browser
open coverage/lcov-report/index.html  # JavaScript
open htmlcov/index.html              # Python

# Coverage badges for README
npx coverage-badges-cli --output ./badges
```

## Test Patterns & Examples

### Unit Test Structure (JavaScript)

```javascript
// userService.test.js
import { UserService } from './userService';
import { ApiClient } from './apiClient';

// Mock external dependencies
jest.mock('./apiClient');
const mockApiClient = ApiClient as jest.Mocked<typeof ApiClient>;

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    // Arrange - setup for each test
    mockApiClient.mockClear();
    userService = new UserService(mockApiClient);
  });

  describe('getUserById', () => {
    it('should return user when valid ID provided', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: '123', name: 'John Doe' };
      mockApiClient.get.mockResolvedValue({ data: expectedUser });

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockApiClient.get).toHaveBeenCalledWith(`/users/${userId}`);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const userId = 'nonexistent';
      mockApiClient.get.mockRejectedValue(new Error('User not found'));

      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects.toThrow('User not found');
    });

    it('should handle empty user ID', async () => {
      // Act & Assert
      await expect(userService.getUserById(''))
        .rejects.toThrow('User ID is required');
    });
  });
});
```

### Test Data Factories

```javascript
// testFactories.js
export const createUser = (overrides = {}) => ({
  id: "123",
  name: "Test User",
  email: "test@example.com",
  role: "user",
  createdAt: new Date("2024-01-01"),
  ...overrides,
});

export const createApiResponse = (data, overrides = {}) => ({
  status: 200,
  data,
  headers: {},
  ...overrides,
});

// Usage in tests
const user = createUser({ name: "Alice", role: "admin" });
const response = createApiResponse(user, { status: 201 });
```

### Parameterized Tests

```javascript
// Testing multiple scenarios efficiently
describe("validateEmail", () => {
  test.each([
    ["valid email", "user@example.com", true],
    ["email without @", "userexample.com", false],
    ["email without domain", "user@", false],
    ["empty string", "", false],
    ["null input", null, false],
  ])("should return %s for %s", (description, input, expected) => {
    expect(validateEmail(input)).toBe(expected);
  });
});
```

## Coverage Analysis & Reporting

### Coverage Report Interpretation

```bash
# Example coverage report
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|------------------
src/userService.js  |   95.12 |    88.89 |     100 |   94.74 | 45,67
src/apiClient.js    |   100   |    91.67 |     100 |    100  |
src/utils.js        |   88.24 |    75.00 |     100 |   87.50 | 12,23,34
--------------------|---------|----------|---------|---------|------------------
All files           |   94.67 |    86.11 |     100 |   94.12 |
```

**Coverage Action Items**

- [ ] Lines 45,67 in userService.js need test coverage
- [ ] Branch coverage in utils.js needs improvement
- [ ] Overall coverage meets 95% target
- [ ] Functions have 100% coverage (excellent)

### CI/CD Integration

```yaml
# GitHub Actions example
name: Test Coverage
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - run: npm ci
      - run: npm run test:ci

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

      - name: Coverage Comment
        uses: 5monkeys/cobertura-action@master
        with:
          path: coverage/cobertura-coverage.xml
          minimum_coverage: 95
```

## Testing Review Process

1. **Test Planning**
   - Identify critical paths and edge cases
   - Plan test scenarios before writing code
   - Define acceptance criteria with testable outcomes

2. **Test Implementation**
   - Write tests first (TDD) or alongside code
   - Ensure meaningful test names and clear assertions
   - Mock external dependencies appropriately

3. **Coverage Analysis**
   - Run coverage reports after test implementation
   - Identify and address coverage gaps
   - Document any intentional coverage exclusions

4. **Test Maintenance**
   - Keep tests updated with code changes
   - Refactor tests when code structure changes
   - Remove obsolete tests for removed functionality

## Common Testing Antipatterns

**Poor Test Design**

- Testing implementation details instead of behavior
- Writing overly complex tests that are hard to maintain
- Creating interdependent tests that fail together
- Not testing error conditions and edge cases

**Coverage Gaming**

- Writing tests that execute code without meaningful assertions
- Focusing on coverage percentage over test quality
- Excluding too much code from coverage analysis
- Not testing the most critical application paths

**Mock Overuse**

- Mocking everything including simple data structures
- Creating mocks that don't behave like real implementations
- Not testing integration points between modules
- Overly complicated mock setups that mask real issues

Remember: The goal is not just 95% coverage, but 95% confidence in your code's correctness. Quality tests that catch real bugs are worth more than quantity for coverage metrics alone.
