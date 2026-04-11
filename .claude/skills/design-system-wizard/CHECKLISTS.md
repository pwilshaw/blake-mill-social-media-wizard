# Design System Wizard — Phase Checklists

Quick-reference pass/fail gate items. Every item must pass before moving to the next phase.

---

## Phase 0: Design System Setup

- [ ] Token source identified (MCP / AI file / built-in reference)
- [ ] Token values accessible (at least colors + typography + spacing)
- [ ] User confirmed their design system template/philosophy
- [ ] If MCP: `get_design_tokens` returns non-default values
- [ ] If AI file: file parsed and token categories extracted
- [ ] If built-in: user informed of limitations

---

## Phase 1: Design Context

- [ ] Design source identified (Figma / verbal / existing UI)
- [ ] If Figma: design context and screenshot retrieved
- [ ] Component types needed are listed
- [ ] Token categories needed are identified
- [ ] Design system template/philosophy stated
- [ ] Design Context Document produced
- [ ] **User approved** the context before proceeding

---

## Phase 2: Token & Pattern Analysis

- [ ] Every visual property mapped to a named token
- [ ] Zero hardcoded color values (no `#hex`, no `rgb()`)
- [ ] Zero hardcoded spacing values (no raw `px` for layout)
- [ ] Zero hardcoded font properties (no raw font-size/weight)
- [ ] All text/background pairs checked for contrast
- [ ] WCAG AA contrast ratios pass (4.5:1 normal, 3:1 large)
- [ ] Codebase searched for existing reusable components
- [ ] Reuse report produced (components to reuse vs. create)
- [ ] Token Mapping Table produced

---

## Phase 3: Component Architecture

- [ ] Component documentation pulled for each type
- [ ] TypeScript props interface defined
- [ ] Variant matrix documented (all valid combinations)
- [ ] State matrix documented (default, hover, focus, active, disabled, loading, error)
- [ ] Responsive behavior defined (mobile, tablet, desktop)
- [ ] Touch targets >= 44px on mobile
- [ ] ARIA role assigned for each interactive element
- [ ] Keyboard interaction pattern defined (Tab, Enter, Space, Escape, Arrows)
- [ ] Focus management plan (trap, restore, visible indicator)
- [ ] Screen reader announcement text defined
- [ ] Reduced motion alternative specified
- [ ] Component Specification produced

---

## Phase 4: Implementation

### Test-Driven (RED)
- [ ] Test: component renders without errors
- [ ] Test: each variant applies correct styles
- [ ] Test: accessibility attributes present
- [ ] Test: keyboard interactions function
- [ ] Tests are failing (RED confirmed)

### Build (GREEN)
- [ ] Semantic HTML elements used (not div soup)
- [ ] All styles use token CSS variables
- [ ] ARIA attributes applied per Phase 3 spec
- [ ] Keyboard handlers implemented
- [ ] `:focus-visible` styles using focus token
- [ ] Light mode renders correctly
- [ ] Dark mode renders correctly
- [ ] High-contrast mode renders correctly
- [ ] All tests now passing (GREEN confirmed)

### Compliance
- [ ] `evaluate_compliance` passes (or manual check if no MCP)
- [ ] No lint warnings introduced
- [ ] No TypeScript errors

---

## Phase 5: Design QA

### Visual Fidelity
- [ ] Screenshot captured and reviewed
- [ ] If Figma source: side-by-side comparison done
- [ ] Colors match token values (verified via `preview_inspect`)
- [ ] Spacing matches token values
- [ ] Typography matches token values

### Responsive
- [ ] Mobile (375px) — layout functional, touch targets adequate
- [ ] Tablet (768px) — intermediate layout correct
- [ ] Desktop (1280px) — full layout correct
- [ ] No horizontal overflow at any viewport

### Color Modes
- [ ] Dark mode — all elements visible, contrast passes
- [ ] High contrast — enhanced visibility confirmed

### Accessibility
- [ ] axe-core audit: zero critical violations
- [ ] axe-core audit: zero serious violations
- [ ] Keyboard-only navigation tested (Tab through all elements)
- [ ] Focus indicator visible on all interactive elements

---

## Phase 6: Documentation

- [ ] Component definition written (1-2 sentences)
- [ ] Variations documented with use cases
- [ ] States documented
- [ ] User stories written (3+ personas)
- [ ] Jobs To Be Done with competing forces
- [ ] Code examples provided (React minimum)
- [ ] Accessibility section complete (ARIA, keyboard, screen reader)
- [ ] Token dependencies listed
- [ ] If Figma source: Code Connect mapping created
- [ ] If blocks: Figma export metadata generated

---

## Adversarial Review (Run Before Every Phase Transition)

- [ ] What if tokens change? Component adapts automatically?
- [ ] What if user can't see color? Still functional?
- [ ] What if keyboard-only? Every element reachable and operable?
- [ ] What if 320px viewport? Still functional?
- [ ] What if dark mode? All pairs readable?
- [ ] What if content doubles in length? Layout survives?
