# Design Patterns & Code Templates

Reusable patterns for token application, component architecture, responsive design, dark mode, and testing.

---

## Token Application Patterns

### CSS Custom Properties Setup
```css
/* Root tokens — light mode (default) */
:root {
  --background: var(--token-background);
  --foreground: var(--token-foreground);
  --surface-primary: var(--token-surface-primary);
  /* ... all tokens as CSS custom properties */
}

/* Dark mode override */
@media (prefers-color-scheme: dark) {
  :root {
    --background: var(--token-background-dark);
    --foreground: var(--token-foreground-dark);
    --surface-primary: var(--token-surface-primary-dark);
  }
}

/* High contrast override */
@media (prefers-contrast: more) {
  :root {
    --background: var(--token-background-high-contrast);
    --foreground: var(--token-foreground-high-contrast);
  }
}

/* Class-based override (for user toggle) */
.dark {
  --background: var(--token-background-dark);
  --foreground: var(--token-foreground-dark);
}
```

### Never Do This
```css
/* BAD: Hardcoded values */
.card {
  background: #ffffff;
  color: #1a1a1a;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* GOOD: Token variables */
.card {
  background: var(--surface-primary);
  color: var(--foreground);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}
```

---

## Component Variant Patterns

### Variant with CSS Variables
```tsx
// Define variant-specific token mappings
const variantStyles = {
  primary: {
    '--btn-bg': 'var(--button-primary-bg)',
    '--btn-text': 'var(--button-primary-text)',
    '--btn-hover': 'var(--button-primary-hover)',
  },
  secondary: {
    '--btn-bg': 'var(--button-secondary-bg)',
    '--btn-text': 'var(--button-secondary-text)',
    '--btn-hover': 'var(--button-secondary-hover)',
  },
  outline: {
    '--btn-bg': 'transparent',
    '--btn-text': 'var(--button-primary-bg)',
    '--btn-hover': 'var(--button-ghost-hover)',
  },
  ghost: {
    '--btn-bg': 'transparent',
    '--btn-text': 'var(--foreground)',
    '--btn-hover': 'var(--button-ghost-hover)',
  },
} as const;
```

### Size Variant with Tokens
```tsx
const sizeStyles = {
  sm: {
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    fontSize: 'var(--body-sm-size)',
  },
  md: {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--body-md-size)',
  },
  lg: {
    padding: 'var(--spacing-md) var(--spacing-lg)',
    fontSize: 'var(--body-lg-size)',
  },
} as const;
```

---

## Responsive Patterns

### Mobile-First Breakpoints
```css
/* Mobile (default) */
.layout {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--grid-margin-mobile);
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .layout {
    flex-direction: row;
    gap: var(--grid-gutter-tablet);
    padding: var(--grid-margin-tablet);
  }
}

/* Desktop (1280px+) */
@media (min-width: 1280px) {
  .layout {
    max-width: var(--container-xl);
    margin: 0 auto;
    gap: var(--grid-gutter-desktop);
    padding: var(--grid-margin-desktop);
  }
}
```

### Responsive Typography
```css
.heading {
  font-size: var(--heading-h2-size);
  font-weight: var(--heading-h2-weight);
  line-height: var(--heading-h2-line-height);
}

/* Scale up on desktop */
@media (min-width: 1280px) {
  .heading {
    font-size: var(--heading-page-title-size);
    font-weight: var(--heading-page-title-weight);
    line-height: var(--heading-page-title-line-height);
  }
}
```

### Touch Target Safety
```css
/* Ensure minimum 44px touch targets on mobile */
@media (pointer: coarse) {
  .interactive-element {
    min-height: 44px;
    min-width: 44px;
    padding: var(--spacing-sm);
  }
}
```

---

## Dark Mode Patterns

### Token-Based Theme Switching
```tsx
// Theme provider using token system
function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### CSS for Theme Switching
```css
/* Light (default) — tokens set in :root */
:root {
  color-scheme: light dark;
}

/* Dark via class or data attribute */
[data-theme="dark"] {
  --background: var(--background-dark);
  --foreground: var(--foreground-dark);
  --surface-primary: var(--surface-primary-dark);
  /* ... override all color tokens */
}

/* System preference fallback */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --background: var(--background-dark);
    --foreground: var(--foreground-dark);
    --surface-primary: var(--surface-primary-dark);
  }
}
```

---

## Focus Management Patterns

### Visible Focus Ring
```css
/* Remove default, add token-based focus */
:focus {
  outline: none;
}

:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* High contrast mode: thicker ring */
@media (prefers-contrast: more) {
  :focus-visible {
    outline-width: 3px;
    outline-color: var(--foreground);
  }
}
```

### Focus Trap (Modal)
```tsx
function useFocusTrap(ref: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusable = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    ref.current.addEventListener('keydown', handleKeyDown);
    first?.focus();
    return () => ref.current?.removeEventListener('keydown', handleKeyDown);
  }, [isActive, ref]);
}
```

---

## Reduced Motion Pattern

```css
/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```tsx
// Hook for motion preference
function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

---

## Test Patterns

### Component Render Test
```tsx
describe('Button', () => {
  it('renders with correct semantic element', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button.tagName).toBe('BUTTON');
  });

  it('applies variant-specific token classes', () => {
    render(<Button variant="primary">Submit</Button>);
    const button = screen.getByRole('button');
    // Assert specific token values, not just "has class"
    expect(getComputedStyle(button).getPropertyValue('--btn-bg'))
      .toBe('var(--button-primary-bg)');
  });
});
```

### Accessibility Test
```tsx
describe('Button accessibility', () => {
  it('is focusable via keyboard', () => {
    render(<Button>Action</Button>);
    const button = screen.getByRole('button');
    button.focus();
    expect(document.activeElement).toBe(button);
  });

  it('activates on Enter key', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Action</Button>);
    const button = screen.getByRole('button');
    await userEvent.type(button, '{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('activates on Space key', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Action</Button>);
    const button = screen.getByRole('button');
    await userEvent.type(button, ' ');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows disabled state correctly', () => {
    render(<Button disabled>Can't click</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
```

### Responsive Test
```tsx
describe('Layout responsive behavior', () => {
  it('stacks vertically on mobile', () => {
    // Set viewport to mobile
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    render(<Layout />);
    const container = screen.getByTestId('layout');
    expect(getComputedStyle(container).flexDirection).toBe('column');
  });
});
```

### Dark Mode Test
```tsx
describe('Dark mode', () => {
  it('applies dark tokens when theme is dark', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    render(<Card>Content</Card>);
    const card = screen.getByTestId('card');
    // Verify dark mode token is applied
    const bg = getComputedStyle(card).getPropertyValue('background');
    expect(bg).not.toBe(''); // Has a value from dark tokens
  });
});
```

---

## Anti-Patterns

### Never: Div Soup
```tsx
// BAD
<div onClick={handleClick} className="button">Submit</div>

// GOOD
<button onClick={handleClick} type="submit">Submit</button>
```

### Never: Color-Only Meaning
```tsx
// BAD — red border is the only error indicator
<input style={{ borderColor: hasError ? 'red' : 'gray' }} />

// GOOD — icon + text + color + aria
<div>
  <input
    aria-invalid={hasError}
    aria-describedby={hasError ? 'error-msg' : undefined}
    style={{ borderColor: hasError ? 'var(--destructive)' : 'var(--input-border)' }}
  />
  {hasError && (
    <span id="error-msg" role="alert" className="error">
      <ErrorIcon aria-hidden="true" /> {errorMessage}
    </span>
  )}
</div>
```

### Never: Placeholder-Only Labels
```tsx
// BAD — no label, placeholder disappears on type
<input placeholder="Email" />

// GOOD — visible label associated with input
<label htmlFor="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

### Never: Fixed Pixel Spacing
```tsx
// BAD
<div style={{ padding: '16px', gap: '8px', margin: '24px 0' }}>

// GOOD
<div style={{
  padding: 'var(--spacing-md)',
  gap: 'var(--spacing-sm)',
  margin: 'var(--spacing-lg) 0'
}}>
```
