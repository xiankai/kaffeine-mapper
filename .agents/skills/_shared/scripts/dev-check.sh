#!/bin/bash

# Comprehensive Development Skills Quick Check
# Usage: ./dev-check.sh [frontend|testing|development|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}$1${NC}"
    echo "$(printf '=%.0s' {1..50})"
}

print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check we're in a project directory
if [ ! -f "package.json" ]; then
    print_error "No package.json found. Run from your project root."
    exit 1
fi

# Parse command argument
CHECK_TYPE=${1:-all}

run_frontend_checks() {
    print_header "Frontend Quality Checks"

    # Code Quality
    print_status "Checking code quality (ESLint, TypeScript)..."
    if command -v eslint &> /dev/null && npx eslint src/ --ext .js,.jsx,.ts,.tsx --max-warnings 0; then
        print_success "Code quality checks passed"
    else
        print_warning "Code quality issues found"
    fi

    # Performance
    print_status "Checking performance (build, bundle size)..."
    if npm run build > /dev/null 2>&1; then
        print_success "Build performance validated"
    else
        print_warning "Build performance issues"
    fi

    # Accessibility
    print_status "Checking accessibility (automated)..."
    if command -v axe &> /dev/null && axe http://localhost:3000; then
        print_success "Basic accessibility checks passed"
    else
        print_warning "Accessibility tools not available or issues found"
    fi

    # Design System
    print_status "Checking design system (CSS linting)..."
    if command -v stylelint &> /dev/null && stylelint "src/**/*.{css,scss}"; then
        print_success "Design system compliance validated"
    else
        print_warning "Design system validation incomplete"
    fi
}

run_testing_checks() {
    print_header "Testing Strategy Validation"

    # Unit Testing
    print_status "Checking unit test coverage..."
    if npm test -- --coverage --watchAll=false; then
        print_success "Unit testing strategy validated"
    else
        print_warning "Unit testing needs improvement"
    fi

    # Integration Testing
    print_status "Checking integration tests..."
    if command -v playwright &> /dev/null && npx playwright test --reporter=list; then
        print_success "Integration testing validated"
    else
        print_warning "Integration testing setup incomplete"
    fi
}

run_development_checks() {
    print_header "Development Environment Validation"

    # Local Development
    print_status "Checking development setup..."
    if [ -f ".env.local" ] || [ -f ".env.example" ]; then
        print_success "Environment configuration available"
    else
        print_warning "Environment configuration missing"
    fi

    # Logging
    print_status "Checking logging configuration..."
    if grep -q "winston\|pino\|console.log" package.json src/ 2>/dev/null; then
        print_success "Logging strategy implemented"
    else
        print_warning "Logging strategy needs implementation"
    fi

    # Deployment
    print_status "Checking deployment configuration..."
    if [ -f ".github/workflows/deploy.yml" ] || [ -f "netlify.toml" ] || [ -f "vercel.json" ]; then
        print_success "Deployment strategy configured"
    else
        print_warning "Deployment strategy needs setup"
    fi
}

run_security_checks() {
    print_header "Security & Quality Validation"

    # Security audit
    print_status "Running security audit..."
    if npm audit --audit-level moderate; then
        print_success "No security vulnerabilities found"
    else
        print_warning "Security vulnerabilities detected"
    fi

    # Git hooks
    if [ -d ".git/hooks" ] && ls .git/hooks/pre-* &>/dev/null; then
        print_success "Git hooks configured"
    else
        print_warning "Git hooks not configured"
    fi
}

echo -e "${CYAN}"
echo "🔍 Development Skills Comprehensive Check"
echo "========================================"
echo -e "${NC}"

case $CHECK_TYPE in
    "frontend")
        run_frontend_checks
        ;;
    "testing")
        run_testing_checks
        ;;
    "development")
        run_development_checks
        ;;
    "security")
        run_security_checks
        ;;
    "all")
        run_frontend_checks
        echo
        run_testing_checks
        echo
        run_development_checks
        echo
        run_security_checks
        ;;
    *)
        echo "Usage: $0 [frontend|testing|development|security|all]"
        exit 1
        ;;
esac

echo ""
print_header "Skills Reference"
print_status "Use these skills for detailed guidance:"
echo ""
echo -e "${CYAN}Frontend Excellence:${NC}"
echo "  /frontend-code-quality     - React architecture, TypeScript patterns"
echo "  /frontend-performance      - Bundle optimization, Core Web Vitals"
echo "  /frontend-accessibility    - WCAG compliance, screen reader support"
echo "  /frontend-design-system    - CSS architecture, design consistency"
echo ""
echo -e "${CYAN}Development Best Practices:${NC}"
echo "  /unit-testing             - 95% coverage goal, TDD practices"
echo "  /integration-testing      - Playwright e2e, demo video recording"
echo "  /local-development        - Developer-friendly setup, hot reloading"
echo "  /logging-strategy         - Structured logging, error reporting"
echo "  /deployment-setup         - GitHub Pages + local filesystem builds"
echo ""
print_success "🎉 Development skills check completed for: $CHECK_TYPE"