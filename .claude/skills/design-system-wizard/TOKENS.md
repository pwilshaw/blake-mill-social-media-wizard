# Design Token Taxonomy

Complete reference for the Design Systems for Humans token structure. Use this when MCP is unavailable or as a naming guide when mapping UI elements to tokens.

---

## Color Tokens

### Brand Colors
| Token | Purpose | Example |
|-------|---------|---------|
| `--brand-primary` | Primary brand color, CTAs, links | Button backgrounds, active states |
| `--brand-secondary` | Supporting brand color | Secondary buttons, accents |
| `--brand-accent` | Highlight/pop color | Badges, notifications, highlights |
| `--brand-highlight` | Emphasis areas | Selected items, callouts |
| `--brand-muted` | Subdued brand presence | Subtle backgrounds, disabled states |

### Surface & Background Colors
| Token | Purpose |
|-------|---------|
| `--background` | Page/app background |
| `--foreground` | Default text on background |
| `--surface-primary` | Card/panel backgrounds |
| `--surface-secondary` | Nested surface (e.g., sidebar) |
| `--surface-tertiary` | Deeply nested surface |
| `--surface-elevated` | Elevated elements (modals, dropdowns) |

### Interactive Colors
| Token | Purpose |
|-------|---------|
| `--interactive-primary` | Primary action elements |
| `--interactive-primary-hover` | Hover state |
| `--interactive-primary-active` | Pressed/active state |
| `--interactive-secondary` | Secondary action elements |
| `--interactive-secondary-hover` | Hover state |
| `--interactive-disabled` | Disabled interactive elements |
| `--interactive-disabled-text` | Text in disabled elements |

### Semantic Colors
| Token | Purpose |
|-------|---------|
| `--success` | Success states, confirmations |
| `--success-foreground` | Text on success backgrounds |
| `--warning` | Warning states, cautions |
| `--warning-foreground` | Text on warning backgrounds |
| `--destructive` | Error states, destructive actions |
| `--destructive-foreground` | Text on destructive backgrounds |
| `--info` | Informational states |
| `--info-foreground` | Text on info backgrounds |

### Form Colors
| Token | Purpose |
|-------|---------|
| `--input-background` | Input field background |
| `--input-border` | Input border default |
| `--input-border-focus` | Input border on focus |
| `--input-border-error` | Input border on error |
| `--input-placeholder` | Placeholder text |
| `--input-text` | Input value text |
| `--label-text` | Form label text |

### Focus & Navigation
| Token | Purpose |
|-------|---------|
| `--focus-ring` | Focus indicator color |
| `--focus-ring-offset` | Focus ring offset color |
| `--nav-background` | Navigation background |
| `--nav-text` | Navigation text |
| `--nav-active` | Active nav item |
| `--nav-hover` | Hovered nav item |

### Glass UI (Optional)
| Token | Purpose |
|-------|---------|
| `--glass-background` | Glassmorphism backdrop |
| `--glass-border` | Glass element border |
| `--glass-blur` | Backdrop blur amount |

---

## Typography Tokens

### Heading Scale
| Token Prefix | Purpose | Typical Range |
|-------------|---------|---------------|
| `--heading-super-hero-*` | Hero/splash text | 48-72px |
| `--heading-hero-*` | Page hero sections | 36-56px |
| `--heading-page-title-*` | Page titles (h1) | 28-40px |
| `--heading-h2-*` | Section headings | 24-32px |
| `--heading-h3-*` | Subsection headings | 20-28px |
| `--heading-h4-*` | Group headings | 18-24px |
| `--heading-h5-*` | Minor headings | 16-20px |
| `--heading-h6-*` | Smallest heading | 14-18px |

Each heading token has three properties:
- `*-size` — font-size
- `*-weight` — font-weight
- `*-line-height` — line-height

### Body Text Scale
| Token Prefix | Purpose | Typical Range |
|-------------|---------|---------------|
| `--body-xl-*` | Large body text | 20-24px |
| `--body-lg-*` | Emphasis body text | 18-20px |
| `--body-md-*` | Default body text | 16px |
| `--body-sm-*` | Secondary body text | 14px |
| `--body-xs-*` | Caption/fine print | 12px |

Each body token has: `*-size`, `*-weight`, `*-line-height`

### Interactive Text
| Token Prefix | Purpose |
|-------------|---------|
| `--text-button-*` | Button text |
| `--text-link-*` | Link text |
| `--text-nav-*` | Navigation text |
| `--text-form-*` | Form element text |

### Font Families
| Token | Purpose |
|-------|---------|
| `--font-heading` | Heading typeface |
| `--font-body` | Body typeface |
| `--font-mono` | Code/monospace typeface |

---

## Spacing Tokens

Dynamic scale — projects define their own spacing values. Common structure:

| Token | Typical Value | Purpose |
|-------|--------------|---------|
| `--spacing-xxs` | 2px | Hairline gaps |
| `--spacing-xs` | 4px | Tight internal padding |
| `--spacing-sm` | 8px | Small gaps, icon padding |
| `--spacing-md` | 16px | Default padding, gaps |
| `--spacing-lg` | 24px | Section padding |
| `--spacing-xl` | 32px | Large section gaps |
| `--spacing-xxl` | 48px | Page-level spacing |
| `--spacing-xxxl` | 64px | Hero/splash spacing |

---

## Border Tokens

| Token | Purpose |
|-------|---------|
| `--border-radius-none` | Sharp corners (0) |
| `--border-radius-sm` | Subtle rounding (2-4px) |
| `--border-radius-md` | Default rounding (6-8px) |
| `--border-radius-lg` | Prominent rounding (12-16px) |
| `--border-radius-xl` | Very rounded (20-24px) |
| `--border-radius-full` | Pill/circle (9999px) |
| `--border-radius-card-max` | Maximum for cards |
| `--border-radius-image-max` | Maximum for images |
| `--border-width-thin` | 1px borders |
| `--border-width-medium` | 2px borders |
| `--border-width-thick` | 3-4px borders |
| `--border-color-default` | Default border color |
| `--border-color-subtle` | Subtle dividers |
| `--border-color-strong` | Emphasis borders |

---

## Shadow Tokens

| Token | Purpose |
|-------|---------|
| `--shadow-none` | No shadow |
| `--shadow-xs` | Subtle lift (cards, hover prep) |
| `--shadow-sm` | Light elevation (buttons, inputs) |
| `--shadow-md` | Medium elevation (cards, dropdowns) |
| `--shadow-lg` | High elevation (modals, popovers) |
| `--shadow-xl` | Maximum elevation (toasts, dialogs) |
| `--shadow-inner` | Inset shadow (pressed states) |

---

## Button Style Tokens

Buttons have a rich token system:

### Shape
`sharp` | `rounded` | `pill` | `elevated` | `glass`

### Variant
`solid` | `outline` | `ghost` | `gradient`

### Depth
`flat` | `raised` | `floating` | `glow`

### Button-Specific Tokens
| Token | Purpose |
|-------|---------|
| `--button-primary-bg` | Primary button background |
| `--button-primary-text` | Primary button text |
| `--button-primary-hover` | Primary hover state |
| `--button-primary-active` | Primary pressed state |
| `--button-secondary-bg` | Secondary button background |
| `--button-secondary-text` | Secondary button text |
| `--button-outline-border` | Outline button border |
| `--button-ghost-hover` | Ghost button hover background |
| `--button-disabled-bg` | Disabled button background |
| `--button-disabled-text` | Disabled button text |
| `--button-padding-x` | Horizontal padding |
| `--button-padding-y` | Vertical padding |
| `--button-font-size` | Button text size |
| `--button-font-weight` | Button text weight |
| `--button-border-radius` | Button corner radius |
| `--button-transition` | Transition duration |
| `--button-hover-scale` | Scale on hover (e.g., 1.02) |
| `--button-focus-color` | Focus ring color |

---

## Container Tokens

| Token | Purpose |
|-------|---------|
| `--container-xs` | Narrow content (480px) |
| `--container-sm` | Small content (640px) |
| `--container-md` | Default content (768px) |
| `--container-lg` | Wide content (1024px) |
| `--container-xl` | Full content (1280px) |
| `--container-xxl` | Maximum content (1536px) |

---

## Layout Grid Tokens

| Token | Purpose |
|-------|---------|
| `--grid-columns-mobile` | Mobile column count (typically 4) |
| `--grid-columns-tablet` | Tablet column count (typically 8) |
| `--grid-columns-desktop` | Desktop column count (typically 12) |
| `--grid-gutter-mobile` | Mobile gutter width |
| `--grid-gutter-tablet` | Tablet gutter width |
| `--grid-gutter-desktop` | Desktop gutter width |
| `--grid-margin-mobile` | Mobile outer margin |
| `--grid-margin-tablet` | Tablet outer margin |
| `--grid-margin-desktop` | Desktop outer margin |

---

## Utility Tokens

### Opacity
| Token | Purpose |
|-------|---------|
| `--opacity-disabled` | Disabled elements (0.5) |
| `--opacity-hover` | Hover overlays (0.08) |
| `--opacity-backdrop` | Modal backdrops (0.5-0.8) |

### Transitions
| Token | Purpose |
|-------|---------|
| `--transition-fast` | Micro-interactions (100-150ms) |
| `--transition-normal` | Standard transitions (200-300ms) |
| `--transition-slow` | Emphasis transitions (400-500ms) |
| `--transition-easing` | Default easing function |

### Z-Index
| Token | Purpose |
|-------|---------|
| `--z-dropdown` | Dropdowns (100) |
| `--z-sticky` | Sticky elements (200) |
| `--z-modal` | Modals (300) |
| `--z-popover` | Popovers (400) |
| `--z-toast` | Toast notifications (500) |
| `--z-tooltip` | Tooltips (600) |
