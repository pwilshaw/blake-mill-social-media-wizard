# Design System Setup Guide

## Overview

The Design System Wizard works at three tiers. The full experience requires a **Pro account** at **systems.designedforhumans.tech**, but the skill provides value at every tier.

| Tier | What You Get |
|------|-------------|
| **Pro** ($19/mo) | Live personalized tokens, CSS generation, compliance checking, AI exports |
| **Free account** | Component docs, accessibility guidelines, default token structure |
| **No account** | Built-in reference files (TOKENS.md, ACCESSIBILITY.md, COMPONENTS.md) |

---

## Tier 1: Pro Account + MCP Server (Full Experience)

### Step 1: Create Your Design System

1. Go to **[systems.designedforhumans.tech](https://systems.designedforhumans.tech)**
2. Sign up or log in (email, Google, or Apple)
3. Create a new design system:
   - **Start from a template** — choose from 17 industry templates (Material Design 3, Apple HIG, shadcn/ui, Tailwind, etc.)
   - **Build from scratch** — define your own tokens
   - **Import from Figma** — pull tokens from an existing Figma file
4. Configure your tokens:
   - **Colors** — brand, surfaces, interactive states, semantic, forms
   - **Typography** — heading scale, body text, interactive text
   - **Spacing** — your spacing scale
   - **Borders** — radius, width, style
   - **Shadows** — elevation system
   - **Button styles** — shape, variant, depth, animation

### Step 2: Connect to Claude Code

Run this command in your terminal:

```bash
claude mcp add design-system -t http https://zncwlnoobrkxfghglpep.supabase.co/functions/v1/design-system-mcp/mcp
```

For **Claude Desktop**, add to your config:
```json
{
  "mcpServers": {
    "design-system": {
      "type": "http",
      "url": "https://zncwlnoobrkxfghglpep.supabase.co/functions/v1/design-system-mcp/mcp"
    }
  }
}
```

For **Cursor IDE**:
- Settings → Features → MCP → Add Server
- Type: HTTP
- URL: `https://zncwlnoobrkxfghglpep.supabase.co/functions/v1/design-system-mcp/mcp`

### Step 3: Verify Connection

Ask Claude to run:
```
get_design_tokens
```

If your tokens come back with your custom values, you're connected.

### What You Get with Pro + MCP
- **Live personalized tokens** — always up-to-date with your latest changes in the web app
- **Component docs** — NN/g-style documentation for 20+ component types
- **Accessibility guidelines** — WCAG requirements per component
- **CSS variable generation** — export in CSS, SCSS, or Tailwind format
- **Compliance checking** — evaluate generated code against your design system rules
- **Block compositions** — saved page compositions with code and token context
- **Figma export** — block metadata for round-trip design sync

---

## Tier 2: Free Account + MCP Server (Partial)

Sign up for free at systems.designedforhumans.tech and connect the MCP server (same steps as Tier 1, Steps 2-3).

### What You Get (Free)
- **Component docs** (`get_component_docs`) — full NN/g-style documentation for 20+ component types
- **Accessibility guidelines** (`get_accessibility_guidelines`) — WCAG requirements per component
- **Default token structure** — token names and categories (but not your custom values)
- **Figma integration info** (`get_figma_integration`)

### What Requires Pro
- **Personalized token values** — your custom colors, typography, spacing
- **CSS variable generation** (`generate_css_variables`)
- **Compliance checking** (`evaluate_compliance`)
- **AI Context Export** (Markdown/JSON file download)
- **Block compositions** and Figma block export

---

## AI Context Export (Pro Only)

Pro users can also export their design system as a file for offline use:

1. In the web app, go to the **Export** panel
2. Select the **AI** category
3. Choose **AI Context (Markdown)** or **AI Context (JSON)**
4. Download the file and place it in your project root

The Design Wizard auto-detects files matching:
- `*design-system*.json` / `*design-system*.md`
- `*design-tokens*.json` / `*design-tokens*.md`
- `*ai-context*.json` / `*ai-context*.md`

This gives you a static snapshot of your tokens for offline use, but won't have live updates or compliance checking.

---

## Tier 3: No Account (Built-in Reference)

The Design Wizard works without any account using its built-in reference files. This provides:

- The full token taxonomy (what tokens exist and what they're for)
- Naming conventions for all token categories
- Generic default values based on common design system templates

You won't have personalized token values, but the wizard will still enforce:
- Zero hardcoded values (all properties mapped to token names)
- Accessibility compliance (WCAG AA)
- Semantic HTML and ARIA attributes
- Responsive design patterns
- Component architecture best practices

---

## Troubleshooting

### "MCP server not responding"
- Check the health endpoint: `https://zncwlnoobrkxfghglpep.supabase.co/functions/v1/design-system-mcp/health`
- Verify your auth token hasn't expired (log back in at systems.designedforhumans.tech)

### "Tokens returning default values"
- Make sure you've saved your design system in the web app
- Tokens sync automatically — try refreshing the web app and re-querying

### "Can't find my AI export file"
- The wizard searches the project root and common locations
- Rename your file to include `design-system` or `design-tokens` in the name
- Or provide the file path directly when prompted

### "evaluate_compliance not available"
- This requires the MCP connection (Option 1)
- The wizard will fall back to manual compliance checks using CHECKLISTS.md
