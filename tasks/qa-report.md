# AI.LDN v2.0 Redesign — QA Report

**Date:** 2026-03-26
**Evaluator:** Claude QA Agent
**Build:** `906ed35` (8 commits on main: `0e4bb54..906ed35`)

## Summary

The v2.0 redesign delivers a recognizable identity upgrade — DM Serif Display headings, JetBrains Mono data, warm cream palette — and ships real features (hamburger nav, node tooltips, skeleton loading, agent metadata). However, the color migration is incomplete (~202 lines of hardcoded hex remain in App.jsx), several motion specs were stubbed but not wired (panel transitions, card slide-in), and a few spec items were skipped entirely (click-to-zoom, dynamic stats on static pages). The build passes cleanly with zero errors.

## Scores

| Dimension        | Score (/10) | Weight | Weighted |
|------------------|-------------|--------|----------|
| Design Quality   | 7           | 0.30   | 2.10     |
| Originality      | 8           | 0.25   | 2.00     |
| Craft            | 5           | 0.20   | 1.00     |
| Functionality    | 6           | 0.25   | 1.50     |
| **TOTAL**        |             |        | **6.60** |

## Result: CONDITIONAL (6.60 / 10.0)

**Design Quality (7/10):** The typography triad is distinctive and the warm cream palette gives it personality. Falls short of "Bloomberg meets Monocle" due to inconsistent application — some panels feel polished (company card, insights) while others still have raw hex colors and system fonts in secondary UI.

**Originality (8/10):** Font choices are recognizably deliberate. The DM Serif Display + JetBrains Mono pairing is not a default template. A designer would see intentional choices. Strongest dimension.

**Craft (5/10):** 202 lines of hardcoded hex colors in App.jsx undercut the CSS variable system. 1 box-shadow remains. Panel transition logic is dead code (state set but never read in JSX). Spacing is inconsistent in some areas (search dropdown, auth modal, feedback modal still use old values).

**Functionality (6/10):** Map tooltips work, hamburger nav works, skeleton loading works. But: panel transitions don't visually fire, click-to-zoom doesn't exist, card doesn't slide-in from right, insights cards don't stagger-reveal, dynamic stats script missing from static pages.

---

## Completed (38/63 criteria passing)

### Phase 1: Visual Identity & Typography (8/10)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P1-01 | Font CDN links in index.html `<head>` | PASS |
| SC-P1-02 | CSS :root has all 3 font variables | PASS |
| SC-P1-03 | CSS :root has all color variables | PASS |
| SC-P1-04 | Zero 'Inter' as primary font in .jsx | PASS |
| SC-P1-05 | Company card headers use --font-display | PASS |
| SC-P1-06 | Stat numbers use --font-mono | PASS |
| SC-P1-07 | Section headers (h2) use --font-display | PASS |
| SC-P1-08 | Labels use --font-body uppercase 10px 600 | PASS |
| SC-P1-09 | Header lockup is 2 lines max | PARTIAL — stats line uses mono font but counter shows `mn` tracked which may not render |
| SC-P1-10 | "Sourcing APIs" and "Built by" removed | PARTIAL — removed from static pages but need to verify all 78 |

### Phase 2: Map View (7/11)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P2-01 | Legend is single dismissable line | PASS |
| SC-P2-02 | Legend dismiss persists (localStorage) | PASS |
| SC-P2-03 | Left sidebar fixed 220px width | PASS |
| SC-P2-04 | Segmented control toggle | PASS |
| SC-P2-05 | Category items have left border + count badge | PASS |
| SC-P2-06 | Footer hidden on map panel | PASS |
| SC-P2-07 | Footer visible on other panels | PASS |
| SC-P2-08 | Hover tooltip on nodes | PASS — shows name, funding, category |
| SC-P2-09 | Click smooth-zooms to center node | **FAIL** — not implemented |
| SC-P2-10 | Nodes fade in staggered | PASS |
| SC-P2-11 | Edge hover highlights connected nodes | PARTIAL — highlights hovered edge but doesn't dim unrelated nodes |

### Phase 3: Company Card (8/8)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P3-01 | Card header: badge + name (display 24px) + location | PASS |
| SC-P3-02 | Metric chips 2x2 grid, sunken bg, mono numbers | PASS |
| SC-P3-03 | Tabs have no emoji — text only | PASS |
| SC-P3-04 | Active tab has 2px accent underline | PASS |
| SC-P3-05 | Inactive tabs use --text-muted | PASS |
| SC-P3-06 | Signal cards have colored left accent border | PASS |
| SC-P3-07 | Theme tags are styled pills | PASS |
| SC-P3-08 | Source links display as "Read more →" | PASS |

### Phase 4: Content Pages (5/8)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P4-01 | Sector cards have left category border | PASS |
| SC-P4-02 | Sector card hover translateY(-2px) | PASS |
| SC-P4-03 | Article cards show metadata line | PASS |
| SC-P4-04 | Article title hover transitions to accent | PASS |
| SC-P4-05 | ≥3 static pages have updated typography | PASS |
| SC-P4-06 | Static pages have breadcrumb navigation | PASS (pre-existing) |
| SC-P4-07 | Article body uses --font-body 15px line-height 1.8 | PARTIAL — font updated but not all static pages use variable syntax |
| SC-P4-08 | Dynamic stats script on static pages | **FAIL** — not implemented |

### Phase 5: Mobile (6/8)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P5-01 | Below 768px: hamburger menu | PASS |
| SC-P5-02 | Hamburger opens full-screen overlay | PASS |
| SC-P5-03 | Mobile header max 48px | PASS |
| SC-P5-04 | Bottom sheet pattern for company detail | PASS (pre-existing DraggableCard) |
| SC-P5-05 | Bottom sheet dismissable by drag-down/tap | PASS (pre-existing) |
| SC-P5-06 | Touch targets minimum 44x44px | PARTIAL — hamburger is 36px, some nav links may be smaller |
| SC-P5-07 | Insights cards single-column on mobile | PASS |
| SC-P5-08 | No horizontal scrollbar on any viewport | NOT VERIFIED — requires browser testing |

### Phase 6: Motion (2/5)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P6-01 | Panel fade transition | **FAIL** — state logic exists (`panelAnim`) but never consumed by JSX |
| SC-P6-02 | Company card slides in from right | **FAIL** — not implemented |
| SC-P6-03 | Insights cards stagger-reveal on load | **FAIL** — not implemented |
| SC-P6-04 | Skeleton loading for async fetches | PASS |
| SC-P6-05 | Static pages scroll-driven reveal | PASS |

### Phase 7: API & Agent Metadata (3/3)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P7-01 | `<meta name="ai:api">` present | PASS |
| SC-P7-02 | `<meta name="ai:openapi">` present | PASS |
| SC-P7-03 | API Docs link visible in UI | PASS |

### Phase 8: Polish (3/3)
| ID | Criterion | Status |
|----|-----------|--------|
| SC-P8-01 | npm run build succeeds zero errors | PASS |
| SC-P8-02 | README has Changelog v2.0 | PASS |
| SC-P8-03 | All commits pushed to origin/main | PASS |

---

## Gaps & Fixes Required

### Automated Code Audit Results

| # | Check | Result |
|---|-------|--------|
| 1 | Font CDN links | PASS (1) |
| 2 | CSS font variables | PASS (3) |
| 3 | No Inter as primary | PASS (0) |
| 4 | Color variables in root | PASS (2) |
| 5 | No box-shadow | **FAIL** (1 instance — App.jsx:1006 timeline dot) |
| 6 | Build passes | PASS |
| 7 | ai:api meta tag | PASS (1) |
| 8 | README changelog | PASS (1) |
| 9 | Font vars used | PASS (118 usages) |
| 10 | Static page font update | PASS (1) |
| 11 | No Libre Baskerville | PASS (0) |
| 12 | Console errors | PASS |
| 13 | Hardcoded hex colors | **FAIL** (202 lines) |

### Prioritized Fix List

| # | Issue | Category | Priority | Effort | Action |
|---|-------|----------|----------|--------|--------|
| 1 | 202 lines hardcoded hex in App.jsx | P1-gap | Must | significant | Bulk replace `#faf9f5`→`var(--bg-base)`, `#ffffff`→`var(--bg-elevated)`, `#e8e5dc`→`var(--border)`, `#1a1a18`→`var(--text-primary)`, `#4a4a45`→`var(--text-secondary)`, `#8a8a85`→`var(--text-muted)`, `#a0a09b`→`var(--text-muted)`, `#b5b3ae`→`var(--text-faint)`, `#C15F3C`→`var(--accent)`, `#6b6b66`→`var(--footer-text)`, `#2d2d2a`→`var(--text-primary)`, `#f5f4f0`/`#f5f3ee`→`var(--bg-sunken)` |
| 2 | Panel fade transition dead code | P6-gap | Must | quick | Wire `panelAnim` state to panel container: `opacity: panelAnim ? 0 : 1, transform: panelAnim ? 'translateY(8px)' : 'translateY(0)', transition: 'opacity 200ms, transform 200ms'` |
| 3 | Click-to-zoom on node select | P2-gap | Should | medium | In LondonMap.jsx click handler, after `onSelect(d)`, call `svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(w/2,h/2).scale(2).translate(-d.x,-d.y))` |
| 4 | Company card slide-in from right | P6-gap | Should | quick | Wrap `DraggableCard` mount in CSS transition: initial `translateX(100%)`, enter `translateX(0)` over 250ms |
| 5 | Insights stagger-reveal | P6-gap | Should | quick | Add inline `animationDelay: ${i*80}ms` + `opacity:0` → `opacity:1` CSS animation on sector/article cards |
| 6 | 1 remaining box-shadow (timeline dot) | P8-gap | Should | quick | Replace `boxShadow: \`0 0 0 2px ${tc.c}50\`` with `outline: 2px solid ${tc.c}50` or a border |
| 7 | Touch targets < 44px | P5-gap | Should | quick | Increase hamburger button from 36px to 44px |
| 8 | Dynamic stats on static pages | P4-gap | Nice | medium | Add `<script>` to static pages that fetches `/api?resource=stats` and injects live counts |
| 9 | Edge hover dims unrelated nodes | P2-gap | Nice | medium | In link mouseenter handler, call `applyHighlight` with source+target IDs to dim unrelated |
| 10 | Static pages: variable-based colors | P4-gap | Nice | significant | Move static page styles to use CSS custom properties instead of hardcoded hex |

---

## Sprint Contract for Fixes

# Sprint Contract: AI.LDN Post-QA Fixes

**Sprint ID:** SC-2026-03-26-FIX
**Objective:** Bring the v2.0 redesign from 6.60 to ≥7.0 (PASS threshold)

## Acceptance Criteria

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | `grep -c '#faf9f5\|#e8e5dc\|#1a1a18\|#8a8a85\|#a0a09b\|#C15F3C\|#6b6b66\|#4a4a45' src/App.jsx` returns < 20 (from 202) | Must |
| AC-02 | Panel switches show visible fade+slide transition | Must |
| AC-03 | Clicking a node smooth-zooms to center on it | Should |
| AC-04 | Company card slides in from right on desktop | Should |
| AC-05 | Insights cards stagger-reveal on panel load | Should |
| AC-06 | Zero `boxShadow` or `box-shadow` in src/*.jsx | Should |
| AC-07 | Hamburger button is 44x44px | Should |

**Estimated effort:** 1-2 hours for Must items, 1 hour for Should items.

**Expected score improvement:**
- Craft: 5 → 7 (color migration + shadow removal)
- Functionality: 6 → 7 (panel transitions + click-to-zoom)
- Projected total: 7.2+ (PASS)

---

## Recommendations

1. **Fix #1 and #2 first** — the hardcoded hex migration and panel transition are the two highest-impact fixes. The color migration alone will move Craft from 5 to ~7.
2. **Click-to-zoom (#3) is the most visible missing interaction** — users expect it and it was explicitly spec'd. Medium effort but high UX payoff.
3. **Don't chase 100% color migration** — diminishing returns after ~90%. Focus on the main content areas (search dropdown, auth modal, feedback form, events panel, people panel) which account for most of the 202 lines.
