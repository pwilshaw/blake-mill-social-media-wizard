# Component Documentation Template

Use this template to generate NN/g-style component documentation. Every component built by the Design Wizard should have documentation following this structure.

---

## Documentation Template

### 1. Definition
> A [component name] is a [UI element type] that [primary purpose]. It allows users to [key user action].

One to two sentences. State what it is and what it does. No implementation details.

### 2. Variations
| Variation | Use Case | Visual Difference |
|-----------|----------|-------------------|
| Primary | Main action on the page | Filled background, high contrast |
| Secondary | Supporting action | Subtle background or outline |
| ... | ... | ... |

Include real-world examples: "Use Primary for checkout buttons, Secondary for 'Continue shopping'."

### 3. States
| State | Description | Token Override |
|-------|-------------|---------------|
| Default | Resting state | Base tokens |
| Hover | Cursor over element | `--*-hover` tokens |
| Focus | Keyboard focus | `--focus-ring` visible |
| Active | Being pressed/clicked | `--*-active` tokens |
| Disabled | Not interactive | `--opacity-disabled` applied |
| Loading | Processing action | Spinner, `aria-busy="true"` |
| Error | Invalid state | `--destructive` border/text |
| Success | Confirmed state | `--success` indicator |

### 4. User Stories

Write from 3+ persona perspectives. Use this format:

> As a **[persona]**, I want to **[action]** so that **[outcome]**.

**Required personas** (choose 3+ relevant ones):
- **Product Designer** — visual consistency, token adherence
- **Frontend Developer** — API clarity, composability, TypeScript types
- **Accessibility User (keyboard)** — can operate without a mouse
- **Accessibility User (screen reader)** — understands the component via announcements
- **Mobile User** — adequate touch targets, responsive layout
- **Design System Manager** — consistent with system guidelines

### 5. Jobs To Be Done

Format: **When** [situation], **I want to** [motivation], **so I can** [outcome].

Include competing forces (tensions the component must balance):
- Speed vs. accuracy
- Simplicity vs. flexibility
- Density vs. clarity
- Brevity vs. detail

### 6. Design Specifications

```
Touch target: 44px minimum (mobile)
Typography: [token references]
Colors: [token references for each state]
Spacing: [token references for padding, margin, gap]
Border: [token references for radius, width, color]
Shadow: [token reference for elevation]
Animation: [transition token] with [easing token]
Responsive: [breakpoint behavior]
```

### 7. Code Examples

Provide examples for the project's framework. Minimum: React.

```tsx
// Basic usage
<ComponentName variant="primary" size="md">
  Label
</ComponentName>

// With all props
<ComponentName
  variant="secondary"
  size="lg"
  disabled={false}
  loading={isSubmitting}
  onClick={handleAction}
  aria-label="Descriptive label"
>
  Action Text
</ComponentName>
```

### 8. Accessibility

| Requirement | Value |
|-------------|-------|
| Role | `[ARIA role]` |
| Keyboard | `[key interactions]` |
| Focus | `[focus behavior]` |
| Screen reader | `[announcement text]` |
| Reduced motion | `[alternative behavior]` |
| Color independence | `[how meaning conveyed without color]` |

### 9. Token Dependencies

List every token the component uses:

| Category | Tokens Used |
|----------|------------|
| Colors | `--button-primary-bg`, `--button-primary-text`, `--button-primary-hover`, ... |
| Typography | `--text-button-size`, `--text-button-weight` |
| Spacing | `--spacing-sm`, `--spacing-md` |
| Borders | `--border-radius-md` |
| Shadows | `--shadow-sm` |
| Transitions | `--transition-fast` |
| Focus | `--focus-ring`, `--focus-ring-offset` |

---

## Component Hierarchy

Use atomic design principles to organize components:

### Atoms (Single-purpose, no children)
- Button
- Input
- Label
- Icon
- Badge
- Avatar
- Spinner
- Checkbox
- Radio
- Toggle/Switch
- Slider
- Tooltip

### Molecules (Composed of atoms)
- Input Group (Label + Input + Help Text + Error)
- Button Group (multiple Buttons)
- Card (Surface + Content + Actions)
- Breadcrumb (Links + Separators)
- Pagination (Buttons + Page Numbers)
- Search Bar (Input + Button + Icon)
- Toast (Icon + Text + Close Button)
- Alert (Icon + Text + Actions)
- Dropdown (Button + Listbox)
- Tabs (Tab List + Tab Panels)

### Organisms (Composed of molecules)
- Navigation Bar (Logo + Nav Links + Actions)
- Form (multiple Input Groups + Submit)
- Data Table (Headers + Rows + Pagination)
- Dialog/Modal (Header + Body + Actions)
- Accordion (multiple expandable sections)
- Sidebar (Navigation + Content sections)
- Header (Logo + Navigation + User Menu)
- Footer (Links + Copyright + Social)
- Hero Section (Heading + Subheading + CTA)
- Feature Grid (multiple Cards)

### Templates (Page-level layouts)
- Dashboard Layout (Header + Sidebar + Main Content)
- Form Page (Header + Form + Actions)
- List Page (Header + Filters + Data Table)
- Detail Page (Header + Content + Related)
- Landing Page (Hero + Features + CTA + Footer)
- Auth Page (Logo + Form + Links)

---

## Quick Reference: Component → Documentation Section Priority

| Component Type | Critical Sections |
|---------------|-------------------|
| Button | States, Accessibility, Variations |
| Input | Accessibility, States, Validation |
| Card | Variations, Responsive, Token Deps |
| Navigation | Accessibility, Responsive, States |
| Modal/Dialog | Accessibility (focus trap), States |
| Table | Accessibility (headers), Responsive |
| Form | Accessibility (labels, errors), User Stories |
| Toast | Accessibility (live region), States |
| Tabs | Accessibility (keyboard), States |
