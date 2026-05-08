# DESIGN.md

This document outlines the visual identity, typography, and design tokens for the project based on the Tailwind CSS v4 and Next.js configuration.

---

## 🎨 Design Philosophy
The system utilizes the **OKLCH** color space to ensure consistent perceived lightness across different hues, providing a superior foundation for accessibility and dark mode transitions.

---

## 🔡 Typography

We use a dual-font system integrated via Next.js Google Fonts:

- **Primary Sans-Serif:** `Nunito Sans`
    - **CSS Variable:** `--font-sans`
    - **Usage:** Main interface, body text, and headings.
    - **Style:** Humanist sans-serif for high readability.
- **Monospace:** `Geist Mono`
    - **CSS Variable:** `--font-mono`
    - **Usage:** Technical data, code snippets, and specific UI labels.

---

## 🌈 Color System (OKLCH)

### Base Palette
| Token | Light Mode Value | Dark Mode Value |
| :--- | :--- | :--- |
| `background` | `oklch(1 0 0)` | `oklch(0.147 0.004 49.3)` |
| `foreground` | `oklch(0.147 0.004 49.3)` | `oklch(0.986 0.002 67.8)` |
| `primary` | `oklch(0.488 0.243 264.376)` | `oklch(0.424 0.199 265.638)` |
| `secondary` | `oklch(0.967 0.001 286.375)` | `oklch(0.274 0.006 286.033)` |
| `destructive`| `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |

### UI Accents
- **Muted:** Low-contrast background for subtle sections.
- **Accent:** Identical to primary for consistent branding in call-to-actions.
- **Border/Input:** Defined with specific opacity levels in dark mode for depth.

---

## 📐 Components & Spacing

### Border Radius
The design uses a progressive radius scale based on a root value of `0.625rem`:
- **`radius-sm`**: 0.375rem (0.6x)
- **`radius-md`**: 0.5rem (0.8x)
- **`radius-lg`**: 0.625rem (Base)
- **`radius-xl`**: 0.875rem (1.4x)
- **`radius-2xl`**: 1.125rem (1.8x)

### Sidebar Specification
A dedicated theme is applied to the sidebar to separate navigation from content:
- **Background:** `oklch(0.986 0.002 67.8)` (Light) / `oklch(0.214 0.009 43.1)` (Dark).
- **Primary:** High-contrast blue tones for active navigation states.

---

## 🛠 Technical Implementation

### Theming
The project uses `next-themes` via a `ThemeProvider` component.
- **Dark Mode Trigger:** Activated by the `.dark` class on the HTML element.
- **Hydration:** `suppressHydrationWarning` is enabled on the `<html>` tag to prevent font/theme flicker.

### Utilities
- **Utility Library:** `tailwind-merge` + `clsx` via a custom `cn()` utility in `@workspace/ui/lib/utils`.
- **Global Styles:** Managed via `@workspace/ui/globals.css`.