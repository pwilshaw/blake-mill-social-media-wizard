/**
 * Blake Mill design tokens.
 * Source: Design Systems for Humans MCP server
 * (https://preview--designtokensforhumans.lovable.app/api/mcp)
 *
 * These tokens are mapped to CSS custom properties in index.css
 * and extended via Tailwind config. Update this file when the
 * design system tokens change.
 */

export const blakeMillTokens = {
  // Brand colours
  brand: {
    primary: '#1a1a2e',
    secondary: '#e2e8f0',
    accent: '#6366f1',
  },

  // Surfaces
  surface: {
    background: '#ffffff',
    card: '#ffffff',
    muted: '#f8fafc',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },

  // Interactive
  interactive: {
    hover: '#f1f5f9',
    active: '#e2e8f0',
    focus: '#6366f1',
    disabled: '#94a3b8',
  },

  // Status
  status: {
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#2563eb',
  },

  // Typography
  font: {
    sans: "'Geist Variable', system-ui, sans-serif",
    heading: "'Geist Variable', system-ui, sans-serif",
  },

  // Spacing scale (px)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  // Border radius
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    full: 9999,
  },

  // Shadows (3-level elevation system per constitution)
  shadow: {
    level1:
      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    level2:
      '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    level3:
      '0 10px 25px rgba(0,0,0,0.08), 0 6px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
  },

  // Transitions
  transition: {
    fast: '150ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },
} as const
