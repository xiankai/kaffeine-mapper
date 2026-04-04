---
name: frontend-code-quality
description: "React component architecture, state management, TypeScript patterns, and code quality standards. Use for reviewing component design, hooks usage, prop patterns, and code structure."
argument-hint: "Optional: specify component files or directories to focus the review"
---

# Frontend Code Quality

## When to Use

- Reviewing React component architecture
- Validating state management patterns
- Checking TypeScript implementation
- Auditing component APIs and prop design
- Ensuring React best practices compliance

## Code Quality Checklist

### React Component Architecture

**Component Structure**

- [ ] Single responsibility principle - each component has one clear purpose
- [ ] Proper component composition vs inheritance
- [ ] Appropriate use of functional vs class components
- [ ] Custom hooks for reusable logic
- [ ] Proper prop drilling vs context usage
- [ ] Components are testable and isolated

**State Management**

- [ ] Local state vs global state decisions are appropriate
- [ ] useState/useReducer used correctly for complex state
- [ ] No unnecessary re-renders (check with React DevTools)
- [ ] State updates are batched where possible
- [ ] Derived state computed with useMemo when needed
- [ ] State lifting done appropriately

**Props & APIs**

- [ ] PropTypes or TypeScript interfaces defined
- [ ] Required vs optional props clearly marked
- [ ] Props destructured consistently
- [ ] Default values provided for optional props
- [ ] Component API is intuitive and flexible
- [ ] Prop naming follows conventions

**Hooks Usage**

- [ ] Custom hooks follow naming convention (useXxx)
- [ ] useEffect dependencies are complete and correct
- [ ] useCallback/useMemo used appropriately (not over-optimized)
- [ ] Hooks follow Rules of Hooks
- [ ] No hooks called conditionally
- [ ] Custom hooks are properly abstracted

**TypeScript Patterns**

- [ ] Strong typing for props, state, and function parameters
- [ ] Generic components typed appropriately
- [ ] Union types used for variants/states
- [ ] Utility types leveraged (Partial, Pick, Omit)
- [ ] Type assertions used sparingly and safely
- [ ] No `any` types without justification

## Code Quality Commands

**Quick Check Script**

```bash
# Run focused code quality checks
chmod +x .agents/skills/_shared/scripts/frontend-check.sh
./.agents/skills/_shared/scripts/frontend-check.sh code
```

🤖 See [Shared Frontend Check Script](../_shared/scripts/frontend-check.sh) for automated validation across all frontend skills.

**Linting & Type Checking**

```bash
# ESLint with React rules
npx eslint src/ --ext .js,.jsx,.ts,.tsx

# TypeScript type checking
npx tsc --noEmit

# React-specific linting
npx eslint src/ --rule 'react-hooks/exhaustive-deps: error'
```

**Testing**

```bash
# Run component tests
npm test -- --coverage

# Test React components
npm test -- --testNamePattern="Component"
```

**Analysis Tools**

```bash
# React DevTools Profiler analysis
# Open browser DevTools → Profiler tab

# Bundle analysis for component code
npx vite-bundle-analyzer
# Alternative: rollup-plugin-analyzer for any build setup
npm install -g @rollup/plugin-analyzer
```

## Review Process

1. **Architecture Review**
   - Check component hierarchy and composition
   - Verify single responsibility adherence
   - Validate prop interfaces and data flow

2. **State & Effects Audit**
   - Review useState/useReducer usage
   - Check useEffect dependencies
   - Verify no side effects in render

3. **TypeScript Validation**
   - Ensure strong typing throughout
   - Check for proper generic usage
   - Validate interface contracts

4. **Testing Coverage**
   - Verify components are testable
   - Check for proper test isolation
   - Validate mock usage

## Common React Antipatterns

**State Management Issues**

- Mutating props or state directly
- Over-use of useEffect for state synchronization
- Lifting state too high or keeping it too low
- Complex state in useState instead of useReducer

**Component Design Problems**

- Components doing too many things
- Prop drilling through many levels
- Inconsistent naming patterns
- Missing error boundaries

**Performance Antipatterns**

- Using array indices as keys in dynamic lists
- Creating objects/functions in render
- Over-memoization with useCallback/useMemo
- Missing React.memo for expensive components

**TypeScript Issues**

- Overuse of `any` type
- Missing return types on functions
- Weak prop typing
- Not leveraging union types for variants

## Best Practice Examples

**Well-Structured Component**

```typescript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
  variant?: 'compact' | 'detailed';
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  variant = 'detailed',
  className
}) => {
  const handleEditClick = useCallback(() => {
    onEdit?.(user);
  }, [onEdit, user]);

  return (
    <div className={clsx('user-card', `user-card--${variant}`, className)}>
      <UserAvatar user={user} />
      <UserDetails user={user} variant={variant} />
      {onEdit && (
        <Button onClick={handleEditClick}>
          Edit
        </Button>
      )}
    </div>
  );
};
```

**Custom Hook Pattern**

```typescript
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

const useApi = <T>(url: string): UseApiState<T> => {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const data = await fetch(url).then((res) => res.json());
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
      }
    };

    fetchData();
  }, [url]);

  return state;
};
```

Remember: Quality code is readable, maintainable, performant, and follows established patterns. Each component should be easy to understand, test, and modify.
