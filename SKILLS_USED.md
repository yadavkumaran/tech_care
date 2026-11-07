# TechCare — Design & Engineering Skills Reference

This document details all the design engineering and motion skills imported and applied during the TechCare premium Apple/Linear UI redesign, mobile-native overhaul, and responsive usability audit.

---

## 1. Primary Skills Actively Applied in the Redesign

The following core skills directly shaped the codebase, visual design tokens, interaction mechanics, and mobile responsiveness:

### 1. `apple-design`
* **Path:** [`.agents/skills/apple-design/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/apple-design/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Apple interface design foundations — restrained color palettes, high-precision typography, fluid physical motion, optical sizing, and spatial hierarchy.
* **How It Was Applied to TechCare:**
  - **Color Tokens:** Replaced aggressive gradients with Apple-inspired neutrals:
    - Primary Accent: `#0071e3` (Apple signature blue).
    - Neutral Scales: `#ffffff` canvas, `#f5f5f7` subtle group surface, `#86868b` secondary labels.
    - Semantic Accents: Soft pastel badges with dark contrast text (e.g., `#e8f5e9` with `#1b5e20` for completed repairs).
  - **Typography & Alignment:** Adopted San Francisco font stacks (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display"`), strict 4px/8px baseline grid, tabular figures (`tabular-nums`) for currency and serial numbers.
  - **Depth & Shadows:** Soft, multi-stop ambient diffusion (`box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)`) instead of heavy artificial drop shadows.

---

### 2. `mobile-native`
* **Path:** [`.agents/skills/mobile-native/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/mobile-native/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Transforms responsive web applications into experiences that feel indistinguishable from installed native apps.
* **How It Was Applied to TechCare:**
  - **Dynamic Viewport Height (`100dvh`):** Fixed the iOS mobile Safari 100vh scrolling bug where browser URL bars cause vertical jumps.
  - **Safe-Area Insets:** Padded bottom navigation bars and sheets with `env(safe-area-inset-bottom)` to clear physical iPhone home swipe bars.
  - **iOS Auto-Zoom Prevention:** Form inputs (`<input>`, `<select>`, `<textarea>`) strictly enforce `font-size: 16px` (`1rem`) on touch viewports so Safari never auto-zooms upon focus, while removing `user-scalable=no` to preserve accessibility.
  - **Tap Highlight & Manipulation:** Applied `-webkit-tap-highlight-color: transparent` and `touch-action: manipulation` across all buttons and tabs to eliminate the 300ms mobile tap delay and gray tap flashes.
  - **Adaptive Bottom Sheets:** Transformed all dialogs (`Modal.tsx`) on mobile (`<= 768px`) into native bottom sheets (`align-items: flex-end; border-radius: 20px 20px 0 0`) with a physical `.sheet-drag-handle` and touch scroll deceleration (`-webkit-overflow-scrolling: touch`).
  - **Native Bottom Tab Bar:** Replaced desktop sidebar on mobile with `BottomNav.tsx` containing quick-access tabs and a slide-over "More" drawer with blur backdrop.

---

### 3. `emil-design-eng`
* **Path:** [`.agents/skills/emil-design-eng/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/emil-design-eng/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Emil Kowalski's design engineering principles — invisible polish, micro-interaction feedback, component ergonomics, and high-craft state management.
* **How It Was Applied to TechCare:**
  - **Tactile Active Press:** All interactive elements (`.btn`, `.bottom-nav-item`, `.card`) feature micro-spring touch feedback: `:active { transform: scale(0.97); }`.
  - **Restrained Hover Feedback:** Desktop hovers (`@media (hover: hover)`) gently lift elements without abrupt layout shifts (`transform: translateY(-1px)`).
  - **High-Density Empty States:** Built `EmptyState.tsx` with contextual Lucide line icons, concise explanations, and direct primary action buttons (e.g., "Take in First Device" or "Generate Invoice").
  - **Linear-Style Sidebar:** Categorized navigation items into labeled groups with subpixel borders, active left-rail indicator bars, and user avatar pills.

---

### 4. `break-ui`
* **Path:** [`.agents/skills/break-ui/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/break-ui/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Stress-test interfaces with worst-case data, unexpected strings, zero items, huge counts, and extreme viewports to find and fix edge-case breakages.
* **How It Was Applied to TechCare:**
  - **Horizontal Overflow Auditing:** Tested across 6 viewport sizes (360x800, 390x844, 430x932, 768x1024, 1024x768, 1440x900) ensuring `scrollWidth === clientWidth` on every route.
  - **Table-to-Card Fallbacks:** Converted wide tables on mobile into vertical cards (`.mobile-card-list`) to avoid horizontal table cutoffs.
  - **Defensive Null-Safety:** Prevented runtime crashes when equipment or customers are missing or shallow-loaded using optional chaining (`viewInvoice.repairTicket?.device?.brand`).

---

### 5. `pick-ui-library` & `prototype`
* **Paths:**
  - [`.agents/skills/pick-ui-library/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/pick-ui-library/SKILL.md)
  - [`.agents/skills/prototype/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/prototype/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Build custom, high-speed, lightweight UI primitives without installing bulky third-party component libraries that bloat bundles and cause CSS collisions.
* **How It Was Applied to TechCare:**
  - Built custom bespoke primitives tailored specifically to TechCare:
    - [`Badge.tsx`](file:///c:/PROJECTS/TechCare/frontend/src/components/ui/Badge.tsx): Status and priority indicators with semantic pastels.
    - [`Modal.tsx`](file:///c:/PROJECTS/TechCare/frontend/src/components/ui/Modal.tsx): Dual-mode dialog / mobile bottom sheet.
    - [`StatCard.tsx`](file:///c:/PROJECTS/TechCare/frontend/src/components/ui/StatCard.tsx): Metric cards with trend badges.
    - [`SearchInput.tsx`](file:///c:/PROJECTS/TechCare/frontend/src/components/ui/SearchInput.tsx): Instant search with keyboard shortcut hint (`⌘K`).
    - [`EmptyState.tsx`](file:///c:/PROJECTS/TechCare/frontend/src/components/ui/EmptyState.tsx): Unified empty/loading container.

---

### 6. `animate` & `choreograph`
* **Paths:**
  - [`.agents/skills/animate/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/animate/SKILL.md)
  - [`.agents/skills/choreograph/SKILL.md`](file:///c:/PROJECTS/TechCare/.agents/skills/choreograph/SKILL.md)
* **Source:** `emilkowalski/skills`
* **Core Philosophy:** Purposeful, natural motion with natural spring curves; coordinating multi-element transitions so they feel unified rather than chaotic.
* **How It Was Applied to TechCare:**
  - **Bottom Sheet Entry:** Uses custom cubic-bezier timing (`cubic-bezier(0.16, 1, 0.3, 1)`) for sheets sliding up from the bottom screen edge.
  - **Drawer Backdrop Fade:** Smooth CSS opacity fade (`transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)`) for modal and sidebar overlays.
  - **Accessible Motion:** Enforces `@media (prefers-reduced-motion: reduce)` rules that automatically disable animations for users with vestibular sensitivities.

---

## 2. Complete Inventory of Installed Skills

All 17 skills installed in `.agents/skills/` (locked via [`skills-lock.json`](file:///c:/PROJECTS/TechCare/skills-lock.json)):

| Skill Name | Primary Capability | Folder / Reference |
| :--- | :--- | :--- |
| **`apple-design`** | Apple interface design principles, fluid motion, and typography | [apple-design](file:///c:/PROJECTS/TechCare/.agents/skills/apple-design/) |
| **`mobile-native`** | Mobile-native web patterns (`100dvh`, bottom sheets, touch targets) | [mobile-native](file:///c:/PROJECTS/TechCare/.agents/skills/mobile-native/) |
| **`emil-design-eng`** | High-craft design engineering, micro-interactions, visual polish | [emil-design-eng](file:///c:/PROJECTS/TechCare/.agents/skills/emil-design-eng/) |
| **`break-ui`** | Stress-testing UI with extreme edge cases and long content | [break-ui](file:///c:/PROJECTS/TechCare/.agents/skills/break-ui/) |
| **`animate`** | Custom CSS/JS animations and spring transition curves | [animate](file:///c:/PROJECTS/TechCare/.agents/skills/animate/) |
| **`animate-expo`** | React Native and Expo animation techniques | [animate-expo](file:///c:/PROJECTS/TechCare/.agents/skills/animate-expo/) |
| **`animation-performance`** | GPU composite-only animations, 60fps frame budget | [animation-performance](file:///c:/PROJECTS/TechCare/.agents/skills/animation-performance/) |
| **`animation-vocabulary`** | Glossary of standard motion design and transition terms | [animation-vocabulary](file:///c:/PROJECTS/TechCare/.agents/skills/animation-vocabulary/) |
| **`ask-sonner`** | Toast notifications using Sonner | [ask-sonner](file:///c:/PROJECTS/TechCare/.agents/skills/ask-sonner/) |
| **`choreograph`** | Multi-element sequential animations and orchestrated entrances | [choreograph](file:///c:/PROJECTS/TechCare/.agents/skills/choreograph/) |
| **`find-animation-opportunities`** | Codebase inspection for missing transition opportunities | [find-animation-opportunities](file:///c:/PROJECTS/TechCare/.agents/skills/find-animation-opportunities/) |
| **`improve-animations`** | Prioritized audits and roadmaps for existing motion code | [improve-animations](file:///c:/PROJECTS/TechCare/.agents/skills/improve-animations/) |
| **`pick-ui-library`** | Architecture decision guide for UI components | [pick-ui-library](file:///c:/PROJECTS/TechCare/.agents/skills/pick-ui-library/) |
| **`prototype`** | Fast prototyping workflows for rapid iteration | [prototype](file:///c:/PROJECTS/TechCare/.agents/skills/prototype/) |
| **`remove-animations`** | Removing redundant/distracting animations to speed up UI | [remove-animations](file:///c:/PROJECTS/TechCare/.agents/skills/remove-animations/) |
| **`review-animations`** | Critical review and debugging of existing transitions | [review-animations](file:///c:/PROJECTS/TechCare/.agents/skills/review-animations/) |
| **`write-swift`** | Swift 6 value types, concurrency, and Apple API best practices | [write-swift](file:///c:/PROJECTS/TechCare/.agents/skills/write-swift/) |

---

## 3. How to Use These Skills in Future Prompts

Whenever you ask for new features, screens, or audits, you can reference any skill by name. For example:

- *"Apply the `apple-design` skill to design a new customer feedback review modal."*
- *"Use `break-ui` to test long inventory item descriptions and extreme currency quantities."*
- *"Audit this transition using `animation-performance` to ensure it stays locked at 60fps on mobile."*
- *"Check our mobile bottom sheets against `mobile-native` rules."*
