---
name: frontend-performance
description: "Bundle optimization, runtime performance, Core Web Vitals, and loading experience. Use for performance audits, optimization reviews, and ensuring fast user experiences."
argument-hint: "Optional: specify files/routes to focus performance analysis on"
---

# Frontend Performance

## When to Use

- Conducting performance audits
- Reviewing bundle size impact of changes
- Optimizing runtime performance
- Improving Core Web Vitals scores
- Analyzing loading experience

## Performance Checklist

### Bundle Size Optimization

**Code Splitting**

- [ ] Bundle size impact analyzed for new features
- [ ] Tree shaking working correctly
- [ ] Dynamic imports used for route-based code splitting
- [ ] Heavy dependencies loaded asynchronously
- [ ] Polyfills only included when necessary
- [ ] Unused code eliminated

**Dependencies**

- [ ] Bundle analyzer run to identify large dependencies
- [ ] Alternative smaller libraries considered
- [ ] Moment.js replaced with date-fns or day.js
- [ ] Lodash imports are specific functions only
- [ ] Third-party libraries loaded conditionally when needed

### Runtime Performance

**React Optimization**

- [ ] React.memo used to prevent unnecessary re-renders
- [ ] useCallback/useMemo used appropriately (not over-optimized)
- [ ] Component updates minimized with proper state structure
- [ ] Context providers don't cause excessive re-renders
- [ ] Expensive operations moved out of render cycle

**JavaScript Performance**

- [ ] Heavy computations moved to web workers if needed
- [ ] Virtual scrolling implemented for large lists
- [ ] Debounced user input handling
- [ ] Efficient data structures chosen
- [ ] Memory leaks prevented in long-running apps

**CSS Performance**

- [ ] Critical CSS inlined or prioritized
- [ ] Unused CSS removed from bundles
- [ ] CSS bundling optimized
- [ ] No layout thrashing in animations
- [ ] Will-change property used sparingly
- [ ] GPU acceleration leveraged for animations

### Loading Experience

**Initial Load**

- [ ] Loading states implemented for async operations
- [ ] Skeleton screens or progressive enhancement
- [ ] Critical rendering path optimized
- [ ] Above-the-fold content prioritized
- [ ] Resource hints (preload, prefetch) used strategically

**Images & Media**

- [ ] Images optimized (WebP format when supported)
- [ ] Lazy loading implemented for below-fold images
- [ ] Responsive images with srcset
- [ ] Image dimensions specified to prevent layout shift
- [ ] Video content optimized and lazy loaded

**Error Handling**

- [ ] Error boundaries handle failures gracefully
- [ ] Network failures handled with retry mechanisms
- [ ] Fallback content provided for failed loads
- [ ] Progressive enhancement for critical features

## Performance Analysis Tools

**Bundle Analysis**

```bash
# Vite Bundle Analyzer (for Vite projects)
npx vite-bundle-analyzer

# Universal bundle analyzer (works with any bundler)
npm install -g @rollup/plugin-analyzer

# Bundle size tracking
npm install -g bundlesize
bundlesize

# Source map explorer (works with Vite, esbuild, etc)
npm install -g source-map-explorer
npm run build
npx source-map-explorer dist/**/*.js
```

**Runtime Performance**

```bash
# Lighthouse audit
npx lighthouse http://localhost:3000 --view --chrome-flags="--headless"

# Web Vitals measurement
npm install web-vitals
# Add to your app for real user monitoring
```

📖 See [Performance Optimization Guide](./references/performance-optimization.md) for detailed patterns, code splitting examples, and monitoring strategies.

**Memory & CPU Profiling**

```bash
# React DevTools Profiler
# Open browser DevTools → Profiler tab → Record interaction

# Chrome DevTools Performance tab
# Record → Interact → Analyze main thread activity
```

## Core Web Vitals Targets

**Largest Contentful Paint (LCP)**

- [ ] Target: < 2.5 seconds
- [ ] Optimize server response times
- [ ] Use CDN for static assets
- [ ] Implement efficient caching strategies
- [ ] Optimize critical resources

**First Input Delay (FID)**

- [ ] Target: < 100 milliseconds
- [ ] Break up long-running JavaScript tasks
- [ ] Use web workers for heavy computation
- [ ] Optimize event handlers
- [ ] Reduce JavaScript execution time

**Cumulative Layout Shift (CLS)**

- [ ] Target: < 0.1
- [ ] Include dimensions for images and videos
- [ ] Reserve space for dynamic content
- [ ] Avoid inserting content above existing content
- [ ] Use consistent font loading strategies

## Optimization Strategies

### Code Splitting Patterns

```javascript
// Route-based splitting
const Dashboard = lazy(() => import("../pages/Dashboard"));
const Profile = lazy(() => import("../pages/Profile"));

// Feature-based splitting
const AdvancedChart = lazy(() => import("../components/AdvancedChart"));

// Vendor splitting
const handlePDFGeneration = async () => {
  const { default: jsPDF } = await import("jspdf");
  return new jsPDF();
};
```

### Performance Monitoring

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

// Send to analytics
const sendToAnalytics = (metric) => {
  // Send to your analytics service
  gtag("event", metric.name, {
    value: Math.round(metric.value),
    event_label: metric.id,
  });
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Image Optimization

```javascript
// Lazy loading with Intersection Observer
const LazyImage = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} {...props}>
      {loaded && <img src={src} alt={alt} loading="lazy" />}
    </div>
  );
};
```

## Performance Review Process

1. **Baseline Measurement**
   - Run Lighthouse audit on current state
   - Measure Core Web Vitals
   - Analyze bundle size breakdown

2. **Bottleneck Identification**
   - Profile with React DevTools
   - Identify render performance issues
   - Check for memory leaks

3. **Optimization Implementation**
   - Apply code splitting where beneficial
   - Optimize critical rendering path
   - Implement performance best practices

4. **Validation**
   - Re-run performance audits
   - Compare before/after metrics
   - Test on various devices and networks

## Performance Red Flags

**Bundle Issues**

- Bundle size increased significantly without new features
- Multiple versions of same library included
- Large dependencies imported but minimally used
- No code splitting for large application sections

**Runtime Problems**

- Components re-rendering excessively
- Long tasks blocking main thread (>50ms)
- Memory usage growing over time
- Animations causing jank (frame drops)

**Loading Issues**

- No loading states for async operations
- Critical resources not prioritized
- Images without optimization
- Synchronous scripts blocking rendering

Remember: Performance is a feature. Fast applications provide better user experiences, improve conversion rates, and rank better in search results.
