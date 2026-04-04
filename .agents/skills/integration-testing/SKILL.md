---
name: integration-testing
description: "Playwright integration testing with mandatory happy path coverage and demo video recording. Use for end-to-end testing strategy, user journey validation, and automated demo generation."
argument-hint: "Optional: specify user flows/features to focus integration testing on"
---

# Integration Testing Strategy

## When to Use

- Implementing end-to-end testing with Playwright
- Recording demo videos for user flows
- Validating critical user journeys
- Setting up automated integration test suites
- Documenting application workflows through recorded demos

## Integration Testing Checklist

### Happy Path Coverage (Mandatory)

**Critical User Journeys**

- [ ] User registration and onboarding flow
- [ ] Login and authentication process
- [ ] Primary feature workflows (core business value)
- [ ] Payment/transaction flows (if applicable)
- [ ] Data creation, editing, and deletion operations
- [ ] Search and filtering functionality

**Demo Video Requirements**

- [ ] Every happy path has recorded demo video
- [ ] Videos show real user interactions
- [ ] Audio narration explaining each step (optional but recommended)
- [ ] Videos updated when UI/UX changes
- [ ] Demo videos accessible to stakeholders
- [ ] Performance metrics captured during recording

### Test Coverage Strategy

**Scope Definition**

- [ ] All critical business workflows covered
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness tested
- [ ] Different user roles and permissions tested
- [ ] API integration points validated
- [ ] Third-party service integrations verified

**Test Data Management**

- [ ] Test database seeded with realistic data
- [ ] User accounts with different permission levels
- [ ] Test data isolated between test runs
- [ ] Data cleanup after each test suite
- [ ] Mock external services when necessary
- [ ] Test data versioning for consistency

### Playwright Implementation

**Test Structure**

- [ ] Page Object Model (POM) implemented
- [ ] Reusable test helpers and utilities
- [ ] Custom fixtures for common setups
- [ ] Parallel test execution configured
- [ ] Test retry policies defined
- [ ] Proper test isolation and cleanup

**Assertions & Validations**

- [ ] Visual regression testing implemented
- [ ] Performance metrics tracked
- [ ] Accessibility checks integrated
- [ ] Network request/response validation
- [ ] Database state verification
- [ ] Email/notification delivery confirmed

## Playwright Setup & Configuration

**Installation & Setup**

```bash
# Install Playwright
npm init playwright@latest
# or
npm install --save-dev @playwright/test

# Install browsers
npx playwright install

# Generate test files
npx playwright codegen http://localhost:3000
```

**Playwright Configuration**

```javascript
// playwright.config.js
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Global test timeout
  timeout: 30000,
  expect: { timeout: 5000 },

  // Demo video recording for all tests
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Test different browsers and devices
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  // Web server for development
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

**Demo Video Recording Setup**

```javascript
// Record demos for happy paths
import { test, expect } from "@playwright/test";

test.describe("Happy Path Demos", () => {
  test.use({
    video: "on", // Always record video for demos
    trace: "on", // Capture detailed traces
  });

  test("User Registration Journey @demo", async ({ page }) => {
    // Start recording with context
    await page.goto("/");

    // Add metadata for demo video
    await page.addInitScript(() => {
      window.__demo_metadata = {
        title: "User Registration Flow",
        description:
          "Complete user registration from landing page to dashboard",
        version: "1.0.0",
        date: new Date().toISOString(),
      };
    });

    // Step-by-step demo with pauses for clarity
    await page.getByRole("link", { name: "Sign Up" }).click();
    await page.waitForTimeout(1000); // Pause for demo clarity

    await page.fill('[data-testid="email"]', "demo@example.com");
    await page.waitForTimeout(500);

    await page.fill('[data-testid="password"]', "securePassword123");
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: "Create Account" }).click();

    // Verify successful registration
    await expect(page.getByText("Welcome to the platform!")).toBeVisible();
    await expect(page.url()).toContain("/dashboard");

    // Hold on dashboard for demo
    await page.waitForTimeout(2000);
  });
});
```

## Page Object Model Implementation

**Base Page Class**

```javascript
// pages/basePage.js
export class BasePage {
  constructor(page) {
    this.page = page;
  }

  async navigateTo(url) {
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async screenshot(name) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}
```

**Feature-Specific Page Objects**

```javascript
// pages/loginPage.js
import { BasePage } from "./basePage.js";

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);

    // Selectors
    this.emailInput = '[data-testid="email"]';
    this.passwordInput = '[data-testid="password"]';
    this.loginButton = '[data-testid="login-button"]';
    this.errorMessage = '[data-testid="error-message"]';
  }

  async login(email, password) {
    await this.page.fill(this.emailInput, email);
    await this.page.fill(this.passwordInput, password);
    await this.page.click(this.loginButton);
  }

  async getErrorMessage() {
    return await this.page.textContent(this.errorMessage);
  }

  async isLoggedIn() {
    return await this.page.url().includes("/dashboard");
  }
}
```

**Test Implementation with Page Objects**

```javascript
// tests/authentication.spec.js
import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/loginPage.js";
import { DashboardPage } from "../pages/dashboardPage.js";

test.describe("Authentication Flow", () => {
  let loginPage, dashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
    await loginPage.navigateTo("/login");
  });

  test("Successful login redirects to dashboard @happy-path @demo", async () => {
    await loginPage.login("user@example.com", "password123");

    await expect(dashboardPage.welcomeMessage).toBeVisible();
    expect(await loginPage.isLoggedIn()).toBe(true);
  });

  test("Invalid credentials show error message", async () => {
    await loginPage.login("invalid@example.com", "wrongpassword");

    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain("Invalid email or password");
  });
});
```

## Advanced Testing Patterns

**API Route Testing**

```javascript
test("API integration with database", async ({ request, page }) => {
  // Test API endpoints directly
  const response = await request.post("/api/users", {
    data: { email: "test@example.com", name: "Test User" },
  });
  expect(response.ok()).toBeTruthy();

  const user = await response.json();

  // Verify UI reflects API changes
  await page.goto("/users");
  await expect(page.getByText(user.name)).toBeVisible();
});
```

**Visual Regression Testing**

```javascript
test("Visual regression test", async ({ page }) => {
  await page.goto("/dashboard");

  // Wait for dynamic content to load
  await page.waitForSelector('[data-testid="charts-loaded"]');

  // Compare against baseline screenshot
  await expect(page).toHaveScreenshot("dashboard-layout.png", {
    fullPage: true,
    threshold: 0.2, // Allow 20% difference
  });
});
```

**Performance Monitoring**

```javascript
test("Performance monitoring during user journey", async ({ page }) => {
  // Start performance monitoring
  await page.coverage.startJSCoverage();
  await page.coverage.startCSSCoverage();

  const startTime = Date.now();

  // Execute user journey
  await page.goto("/");
  await page.getByRole("link", { name: "Products" }).click();
  await page.waitForSelector('[data-testid="product-list"]');

  const loadTime = Date.now() - startTime;

  // Assert performance requirements
  expect(loadTime).toBeLessThan(3000); // Page loads in under 3s

  // Get coverage reports
  const jsCoverage = await page.coverage.stopJSCoverage();
  const cssCoverage = await page.coverage.stopCSSCoverage();

  // Log performance metrics
  console.log(`Page load time: ${loadTime}ms`);
  console.log(`JS Coverage: ${calculateCoverage(jsCoverage)}%`);
});
```

## Demo Video Management

**Automated Demo Generation**

```bash
# Run only demo tests to generate videos
npx playwright test --grep "@demo"

# Generate demo videos with custom naming
npx playwright test --reporter=html --output-dir=demos
```

**Demo Video Organization**

```javascript
// Custom reporter for demo videos
class DemoReporter {
  onTestEnd(test, result) {
    if (test.tags.includes("@demo") && result.attachments) {
      const videoAttachment = result.attachments.find(
        (a) => a.name === "video",
      );
      if (videoAttachment) {
        this.organizeVideoFile(videoAttachment, test);
      }
    }
  }

  organizeVideoFile(attachment, test) {
    const demoName = test.title.replace(/[^a-zA-Z0-9]/g, "_");
    const targetPath = `demos/${demoName}_${new Date().toISOString().split("T")[0]}.webm`;

    // Move and rename video file
    fs.renameSync(attachment.path, targetPath);

    // Generate demo manifest
    this.updateDemoManifest(demoName, targetPath, test);
  }
}
```

**Demo Video Index Generation**

```javascript
// Generate demo index page
const generateDemoIndex = () => {
  const demos = [
    {
      title: "User Registration Flow",
      description: "Complete registration from signup to dashboard",
      video: "./demos/user_registration.webm",
      duration: "2:15",
      lastUpdated: "2024-04-04",
    },
    {
      title: "Product Purchase Journey",
      description: "Browse, select, and purchase products",
      video: "./demos/product_purchase.webm",
      duration: "3:45",
      lastUpdated: "2024-04-04",
    },
  ];

  return generateHTML(demos);
};
```

## Testing Review Process

1. **Test Planning**
   - Identify critical user journeys
   - Define test scenarios and acceptance criteria
   - Plan demo video requirements

2. **Test Implementation**
   - Implement Page Object Model structure
   - Write comprehensive test coverage
   - Set up demo video recording

3. **Validation & Review**
   - Run tests across multiple browsers
   - Review demo videos for clarity
   - Validate test data and cleanup

4. **Maintenance**
   - Update tests when features change
   - Re-record demo videos when UI changes
   - Monitor and fix flaky tests

## Integration Testing Best Practices

**Test Reliability**

- Use data-testid attributes for stable selectors
- Wait for elements properly (avoid hard-coded timeouts)
- Implement proper test isolation and cleanup
- Use realistic test data that reflects production scenarios

**Demo Video Quality**

- Record at consistent resolution and frame rate
- Include meaningful user interactions
- Add pauses for important steps to be visible
- Update videos when user interface changes

**Performance Considerations**

- Run tests in parallel where possible
- Use headless mode for CI/CD
- Implement smart test selection based on changes
- Cache browser installations and dependencies

Remember: Integration tests should validate real user scenarios, not just code functionality. Every critical user journey should have both comprehensive test coverage and an up-to-date demo video showing the happy path.
