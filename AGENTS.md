# agents.md

This repository is organized as a high-performance monorepo using **Turborepo**. It is designed to bridge advanced **Rust** logic with a modern web interface through **WebAssembly (WASM)**[cite: 1].

---

## 🏗 Project Architecture

The project utilizes a monorepo structure to maintain a clean separation between the user interface, shared components, and core computational logic[cite: 1].

*   **Runtime & Package Manager:** [Bun](https://bun.sh/)[cite: 1]
*   **Monorepo Orchestration:** [Turborepo](https://turbo.build/)[cite: 1]

### Workspace Layout

| Directory | Role | Description |
| :--- | :--- | :--- |
| `apps/web` | **Main Application** | The primary web entry point (Next.js/Astro)[cite: 1]. |
| `packages/ui` | **Component Library** | Shared UI primitives powered by **shadcn/ui**[cite: 1]. |
| `packages/core-wasm` | **Core Engine** | High-performance logic written in **Rust**, compiled to WebAssembly[cite: 1]. |

---

## 🎨 Visual Identity & System

For detailed information regarding the design system, typography, and color tokens (OKLCH), please refer to the **[DESIGN.md](./DESIGN.md)** file[cite: 1]. This document covers:
*   **Typography:** Geist Mono and Nunito Sans configuration[cite: 1].
*   **Color Palette:** Core brand colors and theming matrix[cite: 1].
*   **Layout:** Border radius scales and sidebar specifications[cite: 1].

---

## 🛠 Tech Stack Details

### Web Frontend
The main application resides in `apps/web`[cite: 1]. It consumes shared internal packages from the workspace to ensure architectural consistency and high performance[cite: 1].

### UI Components
We use **shadcn/ui** for our component architecture[cite: 1]. All base components are centralized in `packages/ui`, allowing a unified, highly customizable design system[cite: 1].

### Rust & WebAssembly
To handle computationally intensive tasks—such as media processing or complex parsing—we utilize **Rust**[cite: 1].
*   **Source:** `packages/core-wasm`[cite: 1]
*   **Integration:** Compiled into **WASM** modules and integrated into the frontend for near-native execution speeds[cite: 1].