# Accessibility Testing Guide

## Automated Testing

### Jest + Testing Library
```javascript
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Test screen reader announcements
test('announces status changes', async () => {
  render(<StatusComponent />);

  const liveRegion = screen.getByRole('status');
  expect(liveRegion).toBeInTheDocument();

  // Trigger status change
  fireEvent.click(screen.getByRole('button'));

  await waitFor(() => {
    expect(liveRegion).toHaveTextContent('Success!');
  });
});
```

### ESLint Plugin
```json
// .eslintrc.json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["jsx-a11y"]
}
```

## Manual Testing

### Keyboard Navigation Checklist
- [ ] Tab reaches all interactive elements
- [ ] Shift+Tab reverses navigation order
- [ ] Enter activates buttons and links
- [ ] Space activates buttons, checks checkboxes
- [ ] Arrow keys navigate within widgets (menus, tabs)
- [ ] Escape closes modals, menus, dropdowns
- [ ] Focus is trapped within modals
- [ ] Focus returns to trigger after closing

### Screen Reader Testing
```javascript
// Proper ARIA labeling
const SearchForm = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  return (
    <form role="search" aria-label="Site search">
      <label htmlFor="search-input">Search products:</label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-describedby="search-help"
      />
      <div id="search-help" className="sr-only">
        Enter keywords to search our product catalog
      </div>

      {/* Live region for results */}
      <div
        role="status"
        aria-live="polite"
        aria-label={`Search results`}
      >
        {loading && 'Searching...'}
        {!loading && results.length > 0 &&
          `Found ${results.length} results`
        }
      </div>

      <ul role="listbox" aria-label="Search results">
        {results.map((result, index) => (
          <li
            key={result.id}
            role="option"
            tabIndex={-1}
            aria-selected={false}
          >
            {result.name}
          </li>
        ))}
      </ul>
    </form>
  );
};
```

## WCAG Guidelines Quick Reference

### Level A (Minimum)
- [ ] Images have alt text
- [ ] Videos have captions
- [ ] Content is keyboard accessible
- [ ] No seizure-inducing flashes
- [ ] Page has proper headings

### Level AA (Standard)
- [ ] Color contrast ratio ≥ 4.5:1 for normal text
- [ ] Color contrast ratio ≥ 3:1 for large text (18pt+)
- [ ] Text can resize to 200% without horizontal scrolling
- [ ] Focus indicators are visible
- [ ] No auto-playing audio >3 seconds

### Level AAA (Enhanced)
- [ ] Color contrast ratio ≥ 7:1 for normal text
- [ ] Color contrast ratio ≥ 4.5:1 for large text
- [ ] No background audio in content
- [ ] Text can resize to 200% without assistive technology

## Common ARIA Patterns

### Modal Dialog
```javascript
const Modal = ({ isOpen, onClose, title, children }) => {
  const modalRef = useRef();
  const previousFocusRef = useRef();

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      modalRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal-content"
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

### Dropdown Menu
```javascript
const Dropdown = ({ trigger, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Enter':
      case ' ':
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
      >
        {trigger}
      </button>

      {isOpen && (
        <ul
          role="menu"
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => (
            <li key={index}>
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

## Testing Tools

### Browser Extensions
- **axe DevTools** - Automated accessibility testing
- **WAVE** - Web accessibility evaluation
- **Lighthouse** - Built into Chrome DevTools
- **Colour Contrast Analyser** - Color contrast checking

### Screen Readers
- **NVDA** (Windows, free)
- **JAWS** (Windows, paid)
- **VoiceOver** (macOS, built-in)
- **TalkBack** (Android, built-in)

### Command Line Tools
```bash
# Pa11y - Command line accessibility testing
npm install -g pa11y
pa11y http://localhost:3000

# axe-core CLI
npm install -g @axe-core/cli
axe http://localhost:3000

# Lighthouse CI
npm install -g @lhci/cli
lhci autorun
```