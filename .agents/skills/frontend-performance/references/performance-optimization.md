# Performance Optimization Guide

## Bundle Size Optimization

### Dynamic Imports
```javascript
// Code splitting with React.lazy
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Route-based code splitting
const Dashboard = React.lazy(() => import('../pages/Dashboard'));

// Feature-based splitting
const handleAdvancedFeature = async () => {
  const { advancedFunction } = await import('../utils/advanced');
  return advancedFunction();
};
```

### Tree Shaking
```javascript
// ✅ Good - allows tree shaking
import { debounce } from 'lodash/debounce';

// ❌ Bad - imports entire library
import _ from 'lodash';
```

## Runtime Performance

### React Optimization Patterns
```javascript
// Memoize expensive calculations
const ExpensiveComponent = ({ items, filters }) => {
  const filteredItems = useMemo(() =>
    items.filter(item => filters.includes(item.category)),
    [items, filters]
  );

  const handleClick = useCallback((id) => {
    // Handle click logic
  }, []);

  return (
    <div>
      {filteredItems.map(item =>
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleClick}
        />
      )}
    </div>
  );
};

// Prevent unnecessary re-renders
const ItemComponent = React.memo(({ item, onClick }) => {
  return (
    <div onClick={() => onClick(item.id)}>
      {item.name}
    </div>
  );
});
```

### Virtual Scrolling
```javascript
// For large lists, use virtual scrolling
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={35}
    >
      {Row}
    </List>
  );
};
```

## Image Optimization

### Lazy Loading
```javascript
// Native lazy loading
<img src="image.jpg" loading="lazy" alt="Description" />

// React component with IntersectionObserver
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
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} {...props}>
      {loaded && <img src={src} alt={alt} />}
    </div>
  );
};
```

## CSS Performance

### Efficient Selectors
```css
/* ✅ Good - specific and efficient */
.card-title { font-size: 1.2rem; }
.btn-primary { background: blue; }

/* ❌ Bad - overly specific */
div.container > div.row > div.col > .card > .card-header > .card-title {
  font-size: 1.2rem;
}
```

### Animation Performance
```css
/* ✅ Good - uses GPU acceleration */
.slide-in {
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}
.slide-in.active {
  transform: translateX(0);
}

/* ❌ Bad - causes layout thrashing */
.slide-in {
  left: -100px;
  transition: left 0.3s ease;
}
.slide-in.active {
  left: 0;
}
```

## Monitoring & Metrics

### Web Vitals
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Send to analytics
getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### Performance Observer
```javascript
// Monitor long tasks
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    if (entry.duration > 50) {
      console.warn('Long task detected:', entry);
    }
  });
});
observer.observe({ entryTypes: ['longtask'] });
```