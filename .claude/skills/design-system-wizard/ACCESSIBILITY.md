# Accessibility Requirements

WCAG 2.1 AA minimum for all components. This file defines requirements and per-component accessibility contracts.

---

## Universal Requirements

### Color & Contrast
- **Normal text** (< 18px or < 14px bold): 4.5:1 contrast ratio minimum
- **Large text** (>= 18px or >= 14px bold): 3:1 contrast ratio minimum
- **UI components** (borders, icons, focus rings): 3:1 against adjacent colors
- **Never convey information by color alone** — always pair with text, icon, or pattern
- Use APCA (Advanced Perceptual Contrast Algorithm) when available for more accurate results

### Keyboard
- **All interactive elements** reachable via Tab key
- **Tab order** follows visual reading order (left-to-right, top-to-bottom)
- **No keyboard traps** — user can always Tab away (except modals, which trap intentionally)
- **Visible focus indicator** on every focusable element using `--focus-ring` token
- **Skip navigation** link as first focusable element on pages

### Screen Readers
- **Meaningful alt text** on all images (or `alt=""` for decorative)
- **Aria-label** on elements where visible text is insufficient
- **Aria-live regions** for dynamic content updates (polite for non-urgent, assertive for critical)
- **Heading hierarchy** — h1 → h2 → h3, never skip levels
- **Landmark roles** — `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`

### Motion
- **`prefers-reduced-motion`** — disable or reduce all animations
- **No auto-playing animations** that last more than 5 seconds without pause control
- **No flashing content** (3 flashes per second maximum)

### Touch
- **Minimum touch target**: 44x44px on mobile
- **Adequate spacing** between touch targets (8px minimum gap)

---

## Component Accessibility Contracts

### Button
| Requirement | Implementation |
|-------------|---------------|
| Element | `<button>` (never `<div>` or `<a>` for actions) |
| Role | Implicit from `<button>` element |
| Keyboard | `Enter` or `Space` activates |
| Focus | Visible focus ring using `--focus-ring` |
| Disabled | `disabled` attribute + `aria-disabled="true"` + `--opacity-disabled` |
| Loading | `aria-busy="true"` + spinner with `aria-label="Loading"` |
| Icon-only | `aria-label` describing the action |
| Toggle | `aria-pressed="true|false"` |

### Input / TextField
| Requirement | Implementation |
|-------------|---------------|
| Element | `<input>` with associated `<label>` |
| Label | `<label for="id">` or `aria-label` — never placeholder-only |
| Required | `aria-required="true"` + visual indicator |
| Error | `aria-invalid="true"` + `aria-describedby` pointing to error message |
| Error message | `role="alert"` or `aria-live="polite"` |
| Help text | `aria-describedby` pointing to help element |
| Autocomplete | `autocomplete` attribute for known field types |
| Focus | Visible border change using `--input-border-focus` |

### Select / Dropdown
| Requirement | Implementation |
|-------------|---------------|
| Element | Native `<select>` OR custom with `role="listbox"` |
| Trigger | `aria-haspopup="listbox"` + `aria-expanded="true|false"` |
| Options | `role="option"` + `aria-selected="true|false"` |
| Keyboard | `Arrow Up/Down` navigates, `Enter` selects, `Escape` closes |
| Typeahead | First-letter navigation in option list |
| Focus | Focus returns to trigger after selection |

### Dialog / Modal
| Requirement | Implementation |
|-------------|---------------|
| Element | `<dialog>` or `role="dialog"` |
| Label | `aria-labelledby` pointing to heading or `aria-label` |
| Description | `aria-describedby` for content summary |
| Focus trap | Tab cycles within modal, cannot escape |
| Focus restore | On close, focus returns to trigger element |
| Close | `Escape` key closes |
| Backdrop | Click outside closes (with `aria-modal="true"`) |

### Card
| Requirement | Implementation |
|-------------|---------------|
| Element | `<article>` or `<div>` with descriptive structure |
| Heading | Card title uses appropriate heading level |
| Clickable card | Entire card clickable via nested `<a>` stretching (not wrapping `<div>` in `<a>`) |
| Images | `alt` text on card images |
| Actions | Card action buttons are individually focusable |

### Navigation
| Requirement | Implementation |
|-------------|---------------|
| Element | `<nav>` with `aria-label` (e.g., "Main navigation") |
| Current page | `aria-current="page"` on active link |
| List structure | `<ul>` with `<li>` containing `<a>` elements |
| Mobile menu | `aria-expanded="true|false"` on hamburger button |
| Keyboard | `Tab` through links, `Enter` to activate |
| Skip nav | Skip-to-content link before navigation |

### Tabs
| Requirement | Implementation |
|-------------|---------------|
| Tab list | `role="tablist"` |
| Tab | `role="tab"` + `aria-selected="true|false"` + `aria-controls` |
| Panel | `role="tabpanel"` + `aria-labelledby` + `tabindex="0"` |
| Keyboard | `Arrow Left/Right` switches tabs, `Home/End` for first/last |
| Focus | Focus moves to tab, not panel (panel is scrollable) |
| Activation | Automatic (focus = activate) or manual (focus then Enter) |

### Toast / Notification
| Requirement | Implementation |
|-------------|---------------|
| Role | `role="status"` (info) or `role="alert"` (error/warning) |
| Live region | `aria-live="polite"` (info) or `aria-live="assertive"` (error) |
| Dismissible | Close button with `aria-label="Dismiss notification"` |
| Auto-dismiss | Minimum 5 seconds visible, pauses on hover/focus |
| Stacking | Newest on top, accessible via Tab |

### Table
| Requirement | Implementation |
|-------------|---------------|
| Element | `<table>` with `<caption>` |
| Headers | `<th scope="col">` for columns, `<th scope="row">` for rows |
| Sortable | `aria-sort="ascending|descending|none"` on sortable headers |
| Responsive | Horizontal scroll with `role="region"` + `aria-label` + `tabindex="0"` |

### Toggle / Switch
| Requirement | Implementation |
|-------------|---------------|
| Element | `<button>` or `<input type="checkbox">` |
| Role | `role="switch"` with `aria-checked="true|false"` |
| Label | Visible label + `aria-label` if needed |
| Keyboard | `Space` toggles, `Enter` toggles |
| State change | Announce new state to screen reader |

### Checkbox
| Requirement | Implementation |
|-------------|---------------|
| Element | `<input type="checkbox">` with `<label>` |
| Indeterminate | `aria-checked="mixed"` for parent checkboxes |
| Group | `<fieldset>` with `<legend>` for checkbox groups |
| Keyboard | `Space` toggles |

### Radio Group
| Requirement | Implementation |
|-------------|---------------|
| Element | `<input type="radio">` in `<fieldset>` with `<legend>` |
| Group | `role="radiogroup"` if custom |
| Keyboard | `Arrow Up/Down` moves selection, `Tab` enters/exits group |

### Tooltip
| Requirement | Implementation |
|-------------|---------------|
| Trigger | `aria-describedby` pointing to tooltip |
| Tooltip | `role="tooltip"` + `id` matching describedby |
| Keyboard | Appears on focus, dismisses on Escape |
| Hover | Appears on hover with 200ms delay, persists while hovered |
| Mobile | Long-press to reveal (or alternative disclosure) |

### Alert / Banner
| Requirement | Implementation |
|-------------|---------------|
| Role | `role="alert"` for urgent, `role="status"` for informational |
| Live region | Auto-announced to screen readers |
| Dismissible | Close button if dismissible |
| Icon | `aria-hidden="true"` on decorative icon (role conveys meaning) |
| Color | Never color-only — icon + text describe the severity |

### Progress / Loading
| Requirement | Implementation |
|-------------|---------------|
| Determinate | `role="progressbar"` + `aria-valuenow` + `aria-valuemin` + `aria-valuemax` |
| Indeterminate | `role="progressbar"` + `aria-label="Loading"` (no value attributes) |
| Label | `aria-label` or `aria-labelledby` describing what's loading |
| Reduced motion | Static indicator for `prefers-reduced-motion` |

### Accordion
| Requirement | Implementation |
|-------------|---------------|
| Trigger | `<button>` with `aria-expanded="true|false"` + `aria-controls` |
| Panel | `role="region"` + `aria-labelledby` pointing to trigger |
| Keyboard | `Enter/Space` toggles, `Arrow Up/Down` navigates headers |
| Multiple open | Support or prevent as design requires |

### Breadcrumb
| Requirement | Implementation |
|-------------|---------------|
| Element | `<nav aria-label="Breadcrumb">` |
| List | `<ol>` with `<li>` containing `<a>` elements |
| Current | Last item uses `aria-current="page"` |
| Separator | Decorative separators use `aria-hidden="true"` |

### Slider
| Requirement | Implementation |
|-------------|---------------|
| Element | `<input type="range">` or `role="slider"` |
| Attributes | `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` |
| Label | Associated `<label>` or `aria-label` |
| Keyboard | `Arrow Left/Right` adjusts by step, `Home/End` for min/max |
| Touch | Large enough handle (44px minimum) |

### Avatar
| Requirement | Implementation |
|-------------|---------------|
| Image | `alt` text with person's name |
| Fallback | Initials with `aria-label` of full name |
| Status | Status indicator with `aria-label` (e.g., "Online") |
| Decorative | `alt=""` + `aria-hidden="true"` when purely decorative |

### Badge / Chip
| Requirement | Implementation |
|-------------|---------------|
| Decorative | `aria-hidden="true"` if redundant with adjacent text |
| Informative | `aria-label` if conveying unique info |
| Interactive | `<button>` if clickable/dismissible |
| Count | Screen reader text (e.g., "3 notifications") not just "3" |
