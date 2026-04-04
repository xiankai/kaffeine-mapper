---
name: frontend-design-system
description: "CSS architecture, design system implementation, responsive design, and UI consistency. Use for validating design adherence, CSS patterns, styling approaches, and visual quality."
argument-hint: "Optional: specify components/styles to focus design system review on"
---

# Frontend Design System

## When to Use

- Reviewing design system implementation
- Validating CSS architecture and patterns
- Ensuring design specification adherence
- Auditing responsive design implementation
- Checking UI consistency across components

## Design System Checklist

### CSS Architecture

**Organization & Structure**

- [ ] Consistent naming convention (BEM, camelCase, CSS Modules)
- [ ] No global CSS pollution or unintended cascading
- [ ] CSS-in-JS or CSS Modules used appropriately
- [ ] Logical file organization (components, utilities, globals)
- [ ] Design tokens/variables defined and used consistently
- [ ] CSS custom properties used for theming

**Maintainability**

- [ ] Selectors are specific but not overly complex
- [ ] Styles are composable and reusable
- [ ] No hardcoded values - uses design system tokens
- [ ] Consistent spacing scale throughout
- [ ] Color palette sourced from design system
- [ ] Typography scale follows design specifications

**Performance**

- [ ] Critical CSS optimized and inlined when appropriate
- [ ] Unused CSS identified and removed
- [ ] CSS bundle size monitored and optimized
- [ ] Styles grouped efficiently for caching
- [ ] PostCSS or similar for vendor prefixing

### Layout & Positioning

**Modern Layout Techniques**

- [ ] Flexbox used appropriately for 1D layouts
- [ ] CSS Grid used for 2D layout systems
- [ ] Floats and absolute positioning minimized
- [ ] Logical properties used where appropriate (margin-inline vs margin-left)
- [ ] Container queries considered for component-level responsiveness
- [ ] Aspect ratio maintained with aspect-ratio property

**Spacing & Rhythm**

- [ ] Consistent spacing scale (4px, 8px, 16px, etc.)
- [ ] Vertical rhythm maintained throughout
- [ ] No magic numbers - all spacing uses design tokens
- [ ] Margins and padding applied systematically
- [ ] Component spacing follows design system rules
- [ ] White space used effectively for visual hierarchy

### Responsive Design

**Breakpoint Strategy**

- [ ] Breakpoints align with design system standards
- [ ] Mobile-first approach implemented
- [ ] Content hierarchy maintained across screen sizes
- [ ] Touch targets meet minimum size requirements (44px)
- [ ] Horizontal scrolling avoided at all breakpoints
- [ ] Layout adapts gracefully between breakpoints

**Flexible Design**

- [ ] Text remains readable at all zoom levels (up to 200%)
- [ ] Images and media scale appropriately
- [ ] Containers use relative units where appropriate
- [ ] Flexible typography with clamp() or responsive units
- [ ] Component layouts adapt to available space
- [ ] Print styles defined for important content

### UI/UX Implementation

**Design Adherence**

- [ ] Pixel-perfect match to design specifications
- [ ] Spacing and typography consistent with design system
- [ ] Color usage follows brand guidelines exactly
- [ ] Component variants implemented as designed
- [ ] Icon usage consistent with design system
- [ ] Shadows and borders match design specifications

**Interactive States**

- [ ] Hover states implemented for interactive elements
- [ ] Focus states clearly visible and accessible
- [ ] Active states provide immediate feedback
- [ ] Disabled states appropriately styled
- [ ] Loading states designed and implemented
- [ ] Error states clearly distinguishable

**Animations & Transitions**

- [ ] Animations enhance UX without being distracting
- [ ] Transition durations feel natural (200-500ms for most UI)
- [ ] Easing curves provide smooth, realistic motion
- [ ] Animations respect prefers-reduced-motion
- [ ] Performance impact of animations considered
- [ ] Animations provide meaningful feedback

### Component Design Patterns

**Consistency**

- [ ] Button styles consistent across all variants
- [ ] Form elements follow consistent styling patterns
- [ ] Card components use consistent structure and spacing
- [ ] Navigation styling cohesive throughout application
- [ ] Modal and overlay components follow design standards
- [ ] Typography hierarchy implemented consistently

**Flexibility**

- [ ] Components accept theme/variant props appropriately
- [ ] Styling can be extended without breaking existing patterns
- [ ] Components work well in different contexts
- [ ] Size variants implemented as designed
- [ ] Color variants follow brand guidelines
- [ ] Layout components adapt to content

## Design System Tools

**CSS Development**

```bash
# Sass/SCSS compilation
npm install sass
npm run sass:watch

# PostCSS with plugins
npm install postcss autoprefixer cssnano
npx postcss src/styles --use autoprefixer --dir build/

# Stylelint for CSS linting
npm install stylelint stylelint-config-standard
npx stylelint "src/**/*.css"
```

**Design Token Tools**

```bash
# Style Dictionary for design tokens
npm install style-dictionary
style-dictionary build

# Figma to code tools
npm install figma-to-code
npx figma-to-code --token YOUR_FIGMA_TOKEN
```

**Visual Testing**

```bash
# Chromatic for visual regression testing
npm install chromatic
npx chromatic --project-token YOUR_TOKEN

# Percy for visual testing
npm install @percy/cli @percy/cypress
npx percy exec -- cypress run
```

## Design System Examples

### Design Token Structure

```css
/* Design tokens as CSS custom properties */
:root {
  /* Color palette */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;

  /* Spacing scale */
  --space-xs: 0.25rem; /* 4px */
  --space-sm: 0.5rem; /* 8px */
  --space-md: 1rem; /* 16px */
  --space-lg: 1.5rem; /* 24px */
  --space-xl: 2rem; /* 32px */

  /* Typography scale */
  --font-size-xs: 0.75rem; /* 12px */
  --font-size-sm: 0.875rem; /* 14px */
  --font-size-base: 1rem; /* 16px */
  --font-size-lg: 1.125rem; /* 18px */
  --font-size-xl: 1.25rem; /* 20px */

  /* Border radius */
  --radius-sm: 0.125rem; /* 2px */
  --radius-md: 0.25rem; /* 4px */
  --radius-lg: 0.5rem; /* 8px */
  --radius-full: 9999px; /* Full rounded */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### Component Pattern Example

```css
/* Button component following design system */
.btn {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;

  /* Size variants */
  &--sm {
    padding: var(--space-xs) var(--space-sm);
    font-size: var(--font-size-sm);
    min-height: 2rem;
  }

  &--md {
    padding: var(--space-sm) var(--space-md);
    font-size: var(--font-size-base);
    min-height: 2.5rem;
  }

  &--lg {
    padding: var(--space-md) var(--space-lg);
    font-size: var(--font-size-lg);
    min-height: 3rem;
  }

  /* Color variants */
  &--primary {
    background-color: var(--color-primary-500);
    color: white;

    &:hover {
      background-color: var(--color-primary-600);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
    }
  }

  &--secondary {
    background-color: transparent;
    color: var(--color-primary-500);
    border: 1px solid var(--color-primary-300);

    &:hover {
      background-color: var(--color-primary-50);
    }
  }

  /* States */
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
}
```

### Responsive Layout Pattern

```css
/* Card grid using CSS Grid */
.card-grid {
  display: grid;
  gap: var(--space-lg);

  /* Mobile first - single column */
  grid-template-columns: 1fr;

  /* Tablet - 2 columns */
  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  /* Desktop - 3 columns */
  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Large desktop - 4 columns */
  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Container with max width and centering */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-md);

  @media (min-width: 768px) {
    padding: 0 var(--space-lg);
  }
}
```

## Design Review Process

1. **Design Specification Review**
   - Compare implementation to original designs
   - Verify spacing, colors, and typography match exactly
   - Check all component states are implemented

2. **Cross-Browser Testing**
   - Test in major browsers (Chrome, Firefox, Safari, Edge)
   - Verify CSS Grid and Flexbox work consistently
   - Check for vendor prefix requirements

3. **Responsive Assessment**
   - Test at multiple screen sizes and zoom levels
   - Verify touch targets on mobile devices
   - Check content reflow and readability

4. **Design System Compliance**
   - Ensure design tokens are used consistently
   - Verify no hardcoded values outside the system
   - Check component patterns follow established conventions

## Common Design System Issues

**CSS Architecture Problems**

- Inconsistent naming conventions across components
- Overly specific selectors causing maintenance issues
- Global styles leaking into component scope
- Hardcoded values instead of design tokens

**Design Inconsistencies**

- Spacing that doesn't follow the defined scale
- Colors not sourced from the design system palette
- Typography hierarchy not matching specifications
- Component variants missing or incorrectly implemented

**Responsive Issues**

- Fixed widths preventing proper responsive behavior
- Touch targets too small for mobile interaction
- Content overlapping or becoming unreadable
- Horizontal scrolling on mobile devices

**Performance Impact**

- Unused CSS increasing bundle size
- Inefficient selectors causing layout thrashing
- Missing critical CSS optimization
- Animations causing performance issues

Remember: A good design system enables consistency, efficiency, and maintainability. It should make it easier to build cohesive, accessible, and performant user interfaces while reducing design and development friction.
