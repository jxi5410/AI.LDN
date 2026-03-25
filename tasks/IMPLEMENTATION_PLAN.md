# AI.LDN Full Redesign & Feature Expansion — Claude Code Execution Prompt

> **Paste this entire document as a single prompt into Claude Code or Codex.**
> **It is self-contained and executes without asking for anything.**

---

## YOUR ROLE

You are an autonomous staff-level frontend engineer executing a full UI/UX redesign and feature expansion for AI.LDN.

## REPO & ENVIRONMENT

```bash
git clone https://github.com/jxi5410/AI.LDN.git
cd AI.LDN
npm install
```

- **Stack:** Vite + React SPA (`src/App.jsx` is the main SPA), D3 force graph, Supabase backend, Vercel hosting
- **Live site:** https://londonai.network
- **Supabase API:** https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api
- **Languages:** HTML 81.2% (static pages in `/public`), JavaScript 18.8% (React SPA in `/src`)
- **Key files:** `index.html` (entry), `src/App.jsx` (all SPA components), `src/data.js` (data layer — do NOT modify)

## EXECUTION RULES

1. **Read the entire codebase first.** `find src/ -type f` and `cat` every `.jsx`, `.js`, `.css` file. Read `index.html`. Read 3-5 representative static pages from `public/company/`, `public/insights/`, `public/ecosystem/`. Understand the full structure before making any changes.
2. **Execute ALL 8 phases sequentially.** Do NOT stop, ask questions, or wait for confirmation between phases.
3. **Commit after each phase** with the exact commit message specified.
4. **Test after each phase:** Run `npm run build` to verify no build errors. If there's an error, fix it before moving on.
5. **Push when complete:** `git push origin main` after all phases.
6. **Update README.md** with a changelog section at the bottom.

## HARD CONSTRAINTS

- **No new npm dependencies.** Vanilla React + CSS + D3. No Tailwind, Framer Motion, shadcn, or component libraries.
- **Don't break URLs.** All existing `/company/*`, `/insights/*`, `/ecosystem/*`, `/privacy`, `/terms`, `/sourcing` URLs must continue working.
- **Don't touch the D3 force graph engine.** Improve the chrome around it, not the simulation/physics.
- **Don't touch `src/data.js`.** The data layer is clean and must not be modified.
- **No shadows for elevation.** Use border + background color changes.
- **No gradients, noise textures, parallax, or decorative elements.** This is a data product.
- **All CSS values must use the variable system** defined in Phase 1 — no hardcoded colors except the explicit hex values in the design system below.
- **Mobile breakpoint:** 768px. Below = mobile layout. Above = desktop.
- **All font loading via CDN `<link>` tags**, not build-time imports.

---

## PHASE 1: VISUAL IDENTITY & TYPOGRAPHY SYSTEM
**Commit:** `feat: visual identity — typography, color system, header lockup`

### 1.1 Fonts
Add to `index.html` `<head>` (before any CSS):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### 1.2 CSS Variables
Add a single `:root` block (in `index.html <style>` or a new `src/styles/variables.css` imported at the top of the app). This is the single source of truth for the entire design system:

```css
:root {
  /* Typography */
  --font-display: 'DM Serif Display', Georgia, serif;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Backgrounds — 3 elevation levels */
  --bg-base: #faf9f5;
  --bg-elevated: #ffffff;
  --bg-sunken: #f2f0ea;

  /* Text — 4 contrast levels */
  --text-primary: #1a1a18;
  --text-secondary: #4a4a45;
  --text-muted: #8a8a85;
  --text-faint: #b5b3ae;

  /* Accent — single hue, 3 intensities */
  --accent: #C15F3C;
  --accent-hover: #a84e30;
  --accent-bg: rgba(193, 95, 60, 0.07);

  /* Borders */
  --border: #e8e5dc;
  --border-strong: #d5d3ca;

  /* Status */
  --success: #30D158;
  --warning: #FFD700;
  --danger: #FF453A;

  /* Footer */
  --footer-bg: #1a1a18;
  --footer-text: #6b6b66;
  --footer-text-bright: #8a8a85;
}
```

### 1.3 Font Application
Search the entire codebase. Replace ALL instances of `Inter`, `system-ui`, `-apple-system` as the primary font-family with the appropriate CSS variable. Apply fonts per this mapping:

| Element | CSS var | Weight | Size |
|---|---|---|---|
| Logo text "LDN/ai" | Keep existing gradient/style | 800 | 30px |
| Company names on map (D3 labels) | `var(--font-body)` | 500 | 10-11px |
| Company names on cards (header) | `var(--font-display)` | 400 | 24px |
| Stat numbers (counts, funding amounts) | `var(--font-mono)` | 500 | 28px |
| Section headers (h2, panel titles) | `var(--font-display)` | 400 | 22px |
| Body text, descriptions | `var(--font-body)` | 400 | 14px |
| Labels (FUNDING, FOCUS, etc.) | `var(--font-body)` | 600 | 10px, uppercase, letter-spacing: 0.5px |
| Nav buttons/tabs | `var(--font-body)` | 500 | 14px |
| Buttons | `var(--font-body)` | 600 | 12px |

### 1.4 Header Lockup
Simplify the header area. Remove the "Sourcing APIs" and "Built by" lines. The header should be exactly:
```
Line 1: LDN/ai [logo]          [Map] [People] [Insights] [Events] [News] [Bits]    [search] [icons]
Line 2: 89 companies · 128 connections                                (muted, --font-mono, 12px)
```
Two lines max. Clean. The counts should be dynamic — fetch from the Supabase stats endpoint on load if there's already a mechanism for this, otherwise use the counts from `data.js`.

### 1.5 Color Migration
Find and replace ALL hardcoded color values across the codebase with the CSS variable equivalents. Audit every `.jsx` file and every inline `style={}` object. Be thorough — this is the most tedious step and the most important.

---

## PHASE 2: MAP VIEW REDESIGN
**Commit:** `feat: map view — legend, sidebar, footer, interaction polish`

### 2.1 Legend Banner
Replace the current multi-line legend/instruction paragraph above the map with a single-line dismissable banner:
- Text: `Click any bubble to explore · Bubble size = funding raised · Lines = relationships`
- Style: `--font-body`, 12px, `--text-muted`, `--bg-sunken` background, 8px padding
- Dismiss button (✕) on the right
- On dismiss: `localStorage.setItem('ldnai-legend-dismissed', '1')` — never show again
- On load: check `localStorage.getItem('ldnai-legend-dismissed')` — skip if '1'

### 2.2 Left Sidebar (Category Filter)
Redesign the category filter sidebar:
- **Width:** Fixed 220px (`flex: 0 0 220px`)
- **Companies/Investors toggle:** Proper segmented control with `--bg-sunken` background and `--bg-elevated` for active segment
- **Category items:** Each row has:
  - 3px left border in the category's color
  - Category name in `--font-body` 13px weight 500
  - Count as `--font-mono` pill badge on the right
  - Styled checkbox (not Unicode checkmarks)
  - Hover: full row background `--bg-sunken`
- **All/None:** Small text links below the toggle, not buttons

### 2.3 Footer Visibility
- **Map panel:** Hide the full footer entirely. The map needs maximum viewport.
- **All other panels** (People, Insights, Events, News, Bits): Show full footer at bottom of scroll content
- **Mobile (all panels):** Slim 24px bar only

```jsx
{panel !== "graph" && !isMobile && <FullFooter />}
{isMobile && <SlimFooter />}
```

### 2.4 Map Interactions
- **Hover tooltip:** On D3 node mouseenter, show a floating card positioned near the cursor: company name (`--font-display` 16px) + funding (`--font-mono` 12px) + category. Use a single reusable tooltip div, repositioned via `transform`. `pointer-events: none`. Fade in 150ms.
- **Click zoom:** When a company is selected, `d3.transition().duration(500).call(zoom.translateTo, nodeX, nodeY)` to smooth-center on the node.
- **Entrance animation:** On first render, nodes fade from opacity 0 → 1 over 600ms with staggered delay based on index (i * 8ms).
- **Edge hover:** Hovering a connection line highlights both connected nodes (opacity 1, scale 1.1) and dims everything else (opacity 0.2). Reset on mouseleave.

---

## PHASE 3: COMPANY CARD REDESIGN
**Commit:** `feat: company card — visual hierarchy, tabs, metric chips, signals`

### 3.1 Card Header
Restructure the company detail card layout:
```
┌──────────────────────────────┐
│ ⚡ FRONTIER LABS              │  ← category badge: --font-body 9px 600 uppercase, --accent-bg bg
│                              │
│ Google DeepMind              │  ← --font-display, 24px
│ 📍 King's Cross             │  ← --font-body 13px, --text-muted
│                              │
│ ┌────────┐ ┌────────┐       │  ← metric chip grid (2x2)
│ │ $600M  │ │ 2010   │       │
│ │Funding │ │Founded │       │
│ └────────┘ └────────┘       │
│ ┌────────┐ ┌────────┐       │
│ │~3,000  │ │Alphabet│       │
│ │ Team   │ │ Parent │       │
│ └────────┘ └────────┘       │
│                              │
│ Info  Funding  People        │  ← clean text tabs
│ Signals  Links  Network     │
│ ─────────────────────────── │
│ [tab content]                │
└──────────────────────────────┘
```

### 3.2 Tab System
- Remove all emoji from tab labels
- Labels: `Info · Funding · People · Signals · Links · Network`
- Style: `--font-body` 11px 600 uppercase, letter-spacing 0.5px
- Active tab: `--text-primary` + 2px `--accent` bottom border
- Inactive tab: `--text-muted`, no border
- No background changes on tabs — underline only

### 3.3 Metric Chips
Each metric in the card header gets a styled chip:
- Background: `--bg-sunken`
- Border: 1px solid `--border`
- Border-radius: 8px
- Padding: 8px 12px
- Number: `--font-mono` 16px 600 `--text-primary`
- Label: `--font-body` 9px uppercase `--text-muted`
- Grid: 2 columns, gap 8px

### 3.4 Signals Tab
- Each signal card: 3px left accent border (colored by source type: podcast=`--accent`, interview=#4A90D9, conference=#30D158)
- Speaker name: `--font-display` italic 15px
- Theme tags: small pills with `--accent-bg` background, `--accent` text, 10px
- Source link: styled as "Read more →" in `--accent`, not the raw URL

---

## PHASE 4: CONTENT PAGES & INSIGHTS
**Commit:** `feat: content pages — insights cards, article template, static page upgrade`

### 4.1 Sector Cards (Insights Panel)
- Each card: 3px left border in its category color
- Card header: emoji icon + title in `--font-display` 18px
- Preview text: 2 lines max, `overflow: hidden`, `text-overflow: ellipsis`, `-webkit-line-clamp: 2`
- Company pills at bottom: small rounded pills, category-colored background
- Hover: `transform: translateY(-2px)` + `border-color: --border-strong` (no shadow)

### 4.2 Article Cards
- Title: `--font-display` 20px
- Description: `--text-secondary` 14px
- Metadata line: "16 March 2026 · 5 min read · 1,090 words" in `--text-muted` `--font-body` 12px
- Hover: title color transitions to `--accent`

### 4.3 Static Page Template
Update ALL static HTML pages in `public/` to match the SPA design:
- Add the font CDN links (same as `index.html`)
- Add the CSS variables block (same `:root` block)
- Apply typography: article titles in `--font-display` 36px, body in `--font-body` 15px, line-height 1.8, max-width 720px centered
- Breadcrumb: `LDN/ai → [section]` in `--text-muted` 12px
- H2 in `--font-display` 24px, H3 in `--font-body` 18px 600
- Links in `--accent` with underline on hover
- Stat cards row (if present): numbers in `--font-mono`
- Related articles section at bottom: 3-column grid on desktop, 1-column on mobile

### 4.4 Dynamic Stats on Static Pages
Add a script tag at the bottom of each static page that fetches current stats:
```html
<script>
fetch('https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api?resource=stats')
  .then(r=>r.json()).then(d=>{
    const el=document.getElementById('stats-line');
    if(el) el.textContent=d.companies+' companies · '+d.connections+' connections';
  }).catch(()=>{});
</script>
```
Only add this where a `stats-line` element exists.

---

## PHASE 5: MOBILE & RESPONSIVE
**Commit:** `feat: mobile — hamburger nav, bottom sheet, touch nodes, responsive content`

### 5.1 Mobile Header
Below 768px:
- Header: `LDN/ai` logo (left) + search icon (right) + ☰ hamburger (far right)
- Height: 48px max
- Hamburger opens a full-screen overlay drawer (100vw, 100vh, `--bg-base` background, z-index 1000):
  - Panel navigation links (Map, People, Insights, Events, News, Bits)
  - Login/Signup links
  - Footer links (Privacy, Terms, GitHub)
  - Close button (✕) top-right, 44x44px touch target

### 5.2 Mobile Bottom Sheet
When a company is tapped on mobile:
- A bottom sheet slides up from the bottom of the viewport
- Default peek state: company name + category + funding visible (~120px height)
- Drag up or tap the sheet: expands to full card with tabs
- Drag down or tap outside: dismisses
- CSS transitions only — no JS animation library
- Touch handling: `touchstart`/`touchmove`/`touchend` on the sheet handle

### 5.3 Touch-Friendly Nodes
On mobile (below 768px):
- Minimum node radius: 22px (up from whatever the current minimum is)
- Increase D3 collision force padding to 20px
- Disable node drag (conflicts with scroll/pan). Tap-only interaction.
- Add `touch-action: manipulation` to the SVG container

### 5.4 Mobile Content Layout
- Insights cards: single column, full width
- Article cards: list view (title + 1-line description), not grid
- Bottom sheet tabs: horizontal scroll if they overflow
- Font sizes: body 15px on mobile, labels 11px
- All touch targets: minimum 44x44px

---

## PHASE 6: MOTION & DELIGHT
**Commit:** `feat: motion — panel transitions, card animations, skeleton loading`

### 6.1 Panel Transitions
When switching between Map/People/Insights/Events/News/Bits:
- Outgoing panel: opacity 1 → 0 over 200ms
- Incoming panel: opacity 0 → 1, translateY(8px) → translateY(0) over 200ms
- CSS transitions only:
```css
.panel-enter { opacity: 0; transform: translateY(8px); }
.panel-enter-active { opacity: 1; transform: translateY(0); transition: opacity 200ms ease, transform 200ms ease; }
```

### 6.2 Card Entrance Animations
- Company card (desktop): slides in from right, 250ms ease-out
- Insights sector cards: stagger-reveal on panel load (each card delayed by i * 50ms)
- Signals in company card: fade in sequentially (i * 50ms stagger)

### 6.3 Skeleton Loading States
Create a `Skeleton` component (or inline) for use when fetching:
- Grey pulsing rectangles matching the expected content layout
- CSS animation: `@keyframes pulse { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }`
- Apply to: funding rounds loading, signals loading, people loading in company cards

### 6.4 Scroll-Driven Reveals (Static Pages)
On article/insight static pages, sections fade in as user scrolls:
- `IntersectionObserver` with `threshold: 0.1`
- Elements start `opacity: 0; transform: translateY(20px)`
- On intersection: transition to `opacity: 1; transform: translateY(0)` over 400ms
- Add as a small `<script>` block at the bottom of static pages

---

## PHASE 7: API-FIRST & AGENT-CALLABLE ENDPOINT
**Commit:** `feat: API-first — events endpoint, OpenAPI spec link, agent-callable metadata`

### 7.1 Events API Discoverability
The API already exists. Ensure the SPA's events panel fetches from the public API endpoint (`/api?resource=events`) and not from a hardcoded data file. If it already does, skip this.

### 7.2 Agent-Callable Metadata
Add to the `<head>` of `index.html`:
```html
<meta name="ai:api" content="https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api">
<meta name="ai:openapi" content="https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api?resource=openapi">
<meta name="ai:description" content="London AI ecosystem intelligence — companies, people, funding, events, connections. Agent-ready JSON API.">
```

### 7.3 API Documentation Link
In the Bits panel or footer, add a visible "API Docs" link pointing to the API root: `https://ripugedrbnmvbbdntxgt.supabase.co/functions/v1/api`

---

## PHASE 8: FINAL POLISH & QA
**Commit:** `feat: polish — consistency audit, build verification, README update`

### 8.1 Consistency Audit
Check every panel/page for:
- [ ] All fonts use CSS variables (no hardcoded font-family anywhere)
- [ ] All colors use CSS variables (no hardcoded hex except in the `:root` block itself)
- [ ] All stat numbers use `--font-mono`
- [ ] All section headers use `--font-display`
- [ ] All labels use uppercase 10px `--font-body` 600
- [ ] Mobile header is 48px with hamburger (no desktop nav leaking)
- [ ] Footer hidden on map panel, shown on all others
- [ ] No `box-shadow` used anywhere (use border + bg changes)

### 8.2 Build Verification
```bash
npm run build
```
If the build fails, fix all errors. Do NOT push a broken build.

### 8.3 README Update
Add a `## Changelog` section to README.md:
```markdown
## Changelog

### v2.0 — UI/UX Redesign (March 2026)
- **Typography system:** DM Serif Display + DM Sans + JetBrains Mono replacing Inter/system fonts
- **Color system:** 3-level elevation, 4-level text contrast, terracotta accent
- **Map view:** Dismissable legend, redesigned sidebar, hover tooltips, click-to-zoom, entrance animations
- **Company cards:** Metric chips, clean tab system, editorial signal cards
- **Content pages:** Static page template upgrade, dynamic stats, editorial article layout
- **Mobile:** Hamburger navigation, bottom sheet for company details, touch-friendly nodes
- **Motion:** Panel transitions, staggered reveals, skeleton loading states
- **API:** Agent-callable metadata, API docs link
```

### 8.4 Push
```bash
git add -A
git push origin main
```

---

## ANTI-PATTERNS — DO NOT DO THESE

1. Don't add `npm install <anything>`. Zero new dependencies.
2. Don't use `box-shadow`. Elevation = border + background changes.
3. Don't animate everything. Pick 4 key moments (page load, card open, panel switch, hover) and make them excellent.
4. Don't change the D3 force simulation physics. Improve the chrome, not the engine.
5. Don't break the URL structure. Test that `/company/deepmind`, `/insights/`, `/ecosystem/` all still work.
6. Don't create a separate `.css` file per component. Keep styles inline or in 1-2 CSS files max.
7. Don't use `rem` or `em` if the current codebase uses `px` — be consistent with whatever the codebase already uses.
8. Don't add React Router if it doesn't exist. The SPA likely uses panel state, not routing.
9. Don't refactor the data layer. `src/data.js` is off-limits.
10. Don't leave TODO/FIXME comments. Ship it clean.
