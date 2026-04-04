---
name: frontend-accessibility
description: "Web accessibility compliance, WCAG standards, screen reader support, and keyboard navigation. Use for a11y audits, accessibility testing, and ensuring inclusive user experiences."
argument-hint: "Optional: specify components/pages to focus accessibility review on"
---

# Frontend Accessibility

## When to Use

- Conducting accessibility audits (a11y)
- Ensuring WCAG compliance
- Testing screen reader compatibility
- Validating keyboard navigation
- Reviewing inclusive design implementation

## Accessibility Checklist

### Semantic HTML Foundation

**Document Structure**

- [ ] Proper heading hierarchy (h1-h6) with no skipped levels
- [ ] Semantic elements used (nav, main, section, article, aside)
- [ ] Landmarks identify page regions clearly
- [ ] Page has unique, descriptive title
- [ ] Meta description provides page summary

**Form Accessibility**

- [ ] Form labels associated correctly (for/id or aria-labelledby)
- [ ] Required fields marked with aria-required or required attribute
- [ ] Field validation errors announced to screen readers
- [ ] Fieldsets group related form controls
- [ ] Form submission feedback provided

**Interactive Elements**

- [ ] Button vs anchor usage appropriate (buttons for actions, links for navigation)
- [ ] Lists use proper ul/ol/li structure
- [ ] Tables have proper headers and captions
- [ ] Interactive elements have accessible names
- [ ] Form controls have visible labels

### ARIA & Screen Reader Support

**ARIA Labels & Descriptions**

- [ ] ARIA labels provided for custom components without native semantics
- [ ] Complex interactions have ARIA descriptions
- [ ] Icon-only buttons have accessible names
- [ ] Form fields have clear, descriptive labels
- [ ] Error messages associated with form fields

**Live Regions**

- [ ] Dynamic content changes announced with aria-live
- [ ] Status messages use appropriate politeness (polite/assertive)
- [ ] Loading states communicated to assistive technology
- [ ] Error messages announced when they appear
- [ ] Success confirmations provided to screen readers

**ARIA Roles & States**

- [ ] Custom widgets use appropriate ARIA roles
- [ ] Interactive states (expanded, selected, checked) properly marked
- [ ] Hidden content marked with aria-hidden="true"
- [ ] Screen reader-only text added where needed
- [ ] ARIA attributes used correctly (not redundant with semantic HTML)

### Keyboard Navigation

**Focus Management**

- [ ] All interactive elements keyboard accessible
- [ ] Tab order logical and intuitive
- [ ] Focus indicators visible and clear
- [ ] No keyboard traps (except in modals)
- [ ] Skip links provided for main content

**Keyboard Interactions**

- [ ] Enter activates buttons and links
- [ ] Space activates buttons, checks checkboxes
- [ ] Arrow keys work in custom widgets (menus, tabs, carousels)
- [ ] Escape key closes modals/menus/dropdowns
- [ ] Home/End keys work in appropriate widgets

**Modal & Dialog Focus**

- [ ] Focus trapped within modal when open
- [ ] Focus returns to trigger element when modal closes
- [ ] First focusable element receives focus on modal open
- [ ] Tab cycles through modal elements only
- [ ] Escape key always closes modal

### Visual Accessibility

**Color & Contrast**

- [ ] Color contrast meets WCAG AA standards (4.5:1 for normal text)
- [ ] Large text meets 3:1 contrast ratio (18pt+ or 14pt+ bold)
- [ ] Information not conveyed by color alone
- [ ] Focus indicators have sufficient contrast
- [ ] Error states visible without relying on color only

**Layout & Zoom**

- [ ] Text scales up to 200% without horizontal scrolling
- [ ] Content reflows appropriately at different zoom levels
- [ ] Focus indicators don't get cut off at high zoom
- [ ] Touch targets meet minimum size requirements (44px)
- [ ] Content remains usable in landscape and portrait orientations

**Motion & Animation**

- [ ] Respects prefers-reduced-motion setting
- [ ] Animations can be paused or disabled
- [ ] No auto-playing media with sound
- [ ] Animations don't cause seizures (no more than 3 flashes per second)
- [ ] Parallax effects minimized or optional

## Accessibility Testing Tools

**Automated Testing**

```bash
# axe-core command line
npm install -g @axe-core/cli
axe http://localhost:3000

# Pa11y accessibility testing
npm install -g pa11y pa11y-ci
pa11y http://localhost:3000

# Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility --view
```

**Browser Extensions**

- **axe DevTools** - Comprehensive accessibility testing
- **WAVE** - Web accessibility evaluation tool
- **Lighthouse** - Built into Chrome DevTools
- **Colour Contrast Analyser** - Color contrast validation
- **Headings Map** - Document outline validation

**Screen Reader Testing**

- **NVDA** (Windows, free) - Most commonly used
- **JAWS** (Windows, commercial) - Professional standard
- **VoiceOver** (macOS, built-in) - Test with Cmd+F5
- **TalkBack** (Android, built-in) - Mobile testing
- **Orca** (Linux, free) - Open source option

📖 See [Accessibility Testing Guide](./references/accessibility-testing.md) for comprehensive testing setup, ARIA patterns, and automated testing strategies.

## WCAG 2.1 Compliance Levels

### Level A (Minimum)

- [ ] Images have appropriate alt text
- [ ] Videos have captions for dialogue
- [ ] Audio content has transcripts
- [ ] Content is keyboard accessible
- [ ] No seizure-inducing flashes
- [ ] Page structure uses proper headings

### Level AA (Standard)

- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Color contrast ratio ≥ 3:1 for large text (18pt+)
- [ ] Text can resize to 200% without horizontal scrolling
- [ ] Focus indicators are clearly visible
- [ ] No auto-playing audio longer than 3 seconds
- [ ] Moving content can be paused

### Level AAA (Enhanced)

- [ ] Color contrast ratio ≥ 7:1 for normal text
- [ ] Color contrast ratio ≥ 4.5:1 for large text
- [ ] No background audio in speech content
- [ ] Text spacing can be adjusted without loss of functionality
- [ ] Content can be presented without loss in two dimensions

## Common ARIA Patterns

### Modal Dialog Implementation

```jsx
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();
  const previousFocusRef = useRef();

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
      // Trap focus within modal
      document.addEventListener("keydown", handleKeyDown);
    } else {
      previousFocusRef.current?.focus();
      document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
    // Implement focus trap logic here
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="modal-close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
```

### Accessible Form with Validation

```jsx
const AccessibleForm = () => {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  return (
    <form noValidate onSubmit={handleSubmit} role="form">
      <fieldset>
        <legend>Contact Information</legend>

        <div className="field">
          <label htmlFor="email">
            Email Address
            <span aria-label="required">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            aria-required="true"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : "email-help"}
          />
          <div id="email-help" className="field-help">
            We'll never share your email address
          </div>
          {errors.email && (
            <div id="email-error" role="alert" className="field-error">
              {errors.email}
            </div>
          )}
        </div>
      </fieldset>

      {submitted && (
        <div role="status" aria-live="polite" className="success-message">
          Form submitted successfully!
        </div>
      )}

      <button type="submit">Submit Form</button>
    </form>
  );
};
```

### Accessible Navigation Menu

```jsx
const DropdownMenu = ({ items, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        break;
      case "Escape":
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case "Enter":
      case " ":
        if (focusedIndex >= 0) {
          items[focusedIndex].onClick();
          setIsOpen(false);
        }
        break;
    }
  };

  return (
    <div className="dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        id="menu-button"
      >
        {trigger}
      </button>

      {isOpen && (
        <ul role="menu" aria-labelledby="menu-button" onKeyDown={handleKeyDown}>
          {items.map((item, index) => (
            <li key={index} role="none">
              <button
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

## Accessibility Review Process

1. **Automated Scanning**
   - Run axe-core or similar automated tools
   - Check Lighthouse accessibility score
   - Validate HTML semantics

2. **Manual Testing**
   - Navigate site using only keyboard
   - Test with screen reader (NVDA/VoiceOver)
   - Verify color contrast with tools

3. **User Testing**
   - Test with actual users who rely on assistive technology
   - Gather feedback on real-world usability
   - Iterate based on user insights

4. **Ongoing Monitoring**
   - Include accessibility tests in CI/CD
   - Regular accessibility audits
   - Team training on accessibility best practices

## Accessibility Red Flags

**Critical Issues**

- Missing alt text on informative images
- Keyboard traps or inaccessible interactive elements
- Insufficient color contrast for text
- Missing form labels or error associations
- Auto-playing media with sound

**Major Concerns**

- Poor heading structure or missing landmarks
- Custom widgets without proper ARIA
- Focus management issues in dynamic content
- Motion that can't be reduced or paused
- Information conveyed only through color

Remember: Accessibility is not optional - it's a fundamental requirement for inclusive web experiences. Design and build with accessibility in mind from the start, rather than retrofitting later.
