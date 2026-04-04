#!/bin/bash

# Frontend Skills Quick Check Script
# Usage: ./frontend-check.sh [code|performance|accessibility|design|all]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

run_code_quality_checks() {
    print_status "Running code quality checks..."

    # ESLint
    if command -v eslint &> /dev/null; then
        eslint src/ --ext .js,.jsx,.ts,.tsx --max-warnings 0
        print_success "ESLint passed"
    else
        print_warning "ESLint not found"
    fi

    # TypeScript
    if [ -f "tsconfig.json" ]; then
        npx tsc --noEmit
        print_success "TypeScript check passed"
    fi

    # Tests
    npm test -- --watchAll=false --coverage
    print_success "Tests passed"
}

run_performance_checks() {
    print_status "Running performance checks..."

    # Build check
    npm run build > /dev/null 2>&1
    print_success "Build completed"

    # Bundle size
    if command -v bundlesize &> /dev/null; then
        bundlesize
        print_success "Bundle size OK"
    else
        print_warning "bundlesize not configured"
    fi

    # Lighthouse (if available)
    if command -v lighthouse &> /dev/null; then
        print_status "Running Lighthouse audit..."
        lighthouse http://localhost:3000 --only-categories=performance --quiet
        print_success "Lighthouse audit completed"
    fi
}

run_accessibility_checks() {
    print_status "Running accessibility checks..."

    # axe-core
    if command -v axe &> /dev/null; then
        axe http://localhost:3000
        print_success "axe accessibility check passed"
    else
        print_warning "axe-core not installed"
    fi

    # pa11y
    if command -v pa11y &> /dev/null; then
        pa11y http://localhost:3000
        print_success "pa11y check passed"
    else
        print_warning "pa11y not installed"
    fi
}

run_design_checks() {
    print_status "Running design system checks..."

    # Stylelint
    if command -v stylelint &> /dev/null; then
        stylelint "src/**/*.{css,scss,less}"
        print_success "Stylelint passed"
    else
        print_warning "stylelint not found"
    fi

    print_success "Design checks completed"
}

echo "🔍 Frontend Skills Quick Check"
echo "=============================="

case $CHECK_TYPE in
    "code")
        run_code_quality_checks
        ;;
    "performance")
        run_performance_checks
        ;;
    "accessibility")
        run_accessibility_checks
        ;;
    "design")
        run_design_checks
        ;;
    "all")
        run_code_quality_checks
        run_performance_checks
        run_accessibility_checks
        run_design_checks
        ;;
    *)
        echo "Usage: $0 [code|performance|accessibility|design|all]"
        exit 1
        ;;
esac

echo ""
print_success "🎉 Frontend checks completed for: $CHECK_TYPE"
echo ""
print_status "💡 Use specialized skills for detailed reviews:"
echo "  Frontend Skills:"
echo "    /frontend-code-quality - React patterns, TypeScript, architecture"
echo "    /frontend-performance - Bundle size, Core Web Vitals, optimization"
echo "    /frontend-accessibility - a11y compliance, WCAG, screen readers"
echo "    /frontend-design-system - CSS architecture, design adherence"
echo ""
echo "  Development Skills:"
echo "    /unit-testing - Test coverage, TDD practices (95% goal)"
echo "    /integration-testing - Playwright e2e tests with demo videos"
echo "    /local-development - Developer-friendly setup and workflows"
echo "    /logging-strategy - Structured logging, error reporting"
echo "    /deployment-setup - GitHub Pages + local filesystem builds"