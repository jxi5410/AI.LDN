# AI.LDN Post-Implementation Review & Realignment Plan

> **Use this prompt AFTER the implementation prompt has been executed.**
> **Paste into Claude Code. It runs the full QA evaluator protocol and produces a gap analysis.**

---

## YOUR ROLE

You are an independent QA evaluator — a separate agent from the builder. Your job is to be skeptical, not generous. You are grading work that another agent produced. Do NOT talk yourself into passing anything that feels off. If a feature looks like it works but you haven't tested it, assume it's broken.

## ENVIRONMENT SETUP

```bash
cd AI.LDN
git log --oneline -15  # Review what was committed
npm install
npm run dev &          # Start dev server in background
DEV_URL="http://localhost:5173"  # Or whatever port Vite uses
```

Wait for the dev server to be ready before proceeding.

---

## STEP 1: INVENTORY — WHAT WAS SUPPOSED TO BE DONE

Read the implementation plan and build a checklist. Compare against git log to see what was actually committed.

### Phase 1: Visual Identity & Typography
```
SC-P1-01: Font CDN links present in index.html <head>
SC-P1-02: CSS :root block contains all 3 font variables (--font-display, --font-body, --font-mono)
SC-P1-03: CSS :root block contains all color variables (bg-base, bg-elevated, bg-sunken, text-primary through text-faint, accent, border, footer)
SC-P1-04: Zero instances of 'Inter' or '-apple-system' as PRIMARY font in any .jsx/.js/.css file (fallback in font stack is OK)
SC-P1-05: Company card headers use --font-display
SC-P1-06: Stat numbers (funding, counts) use --font-mono
SC-P1-07: Section headers (h2) use --font-display
SC-P1-08: Labels use --font-body uppercase 10px 600
SC-P1-09: Header lockup is 2 lines max (logo+nav, stats line)
SC-P1-10: "Sourcing APIs" and "Built by" lines removed from header
```

### Phase 2: Map View
```
SC-P2-01: Legend is a single dismissable line (not a multi-line paragraph)
SC-P2-02: Legend dismiss persists across page refresh (localStorage)
SC-P2-03: Left sidebar is fixed 220px width
SC-P2-04: Companies/Investors toggle is a styled segmented control (not tiny text buttons)
SC-P2-05: Category items have colored left border + count badge
SC-P2-06: Footer is hidden on map panel
SC-P2-07: Footer is visible on People/Insights/Events/News/Bits panels
SC-P2-08: Hover tooltip appears on node mouseenter with company name + funding
SC-P2-09: Click on node smooth-zooms to center on it
SC-P2-10: Nodes fade in on first render (staggered opacity animation)
SC-P2-11: Edge hover highlights both connected nodes and dims others
```

### Phase 3: Company Card
```
SC-P3-01: Card header shows category badge + company name (--font-display 24px) + location
SC-P3-02: Metric chips display in 2x2 grid with --bg-sunken background and --font-mono numbers
SC-P3-03: Tabs have no emoji — text only
SC-P3-04: Active tab has 2px --accent underline
SC-P3-05: Inactive tabs use --text-muted
SC-P3-06: Signal cards have colored left accent border by source type
SC-P3-07: Theme tags are styled pills (not plain text)
SC-P3-08: Source links display as "Read more →" (not raw URLs)
```

### Phase 4: Content Pages
```
SC-P4-01: Sector cards have left category border
SC-P4-02: Sector card hover has translateY(-2px) effect
SC-P4-03: Article cards show metadata line (date · read time)
SC-P4-04: Article card title hover transitions to --accent color
SC-P4-05: At least 3 static pages in /public have updated typography (font CDN + variables)
SC-P4-06: Static pages have breadcrumb navigation
SC-P4-07: Article body uses --font-body 15px, line-height 1.8, max-width 720px
SC-P4-08: Dynamic stats script present on static pages
```

### Phase 5: Mobile
```
SC-P5-01: Below 768px, header shows hamburger menu (not desktop nav)
SC-P5-02: Hamburger opens full-screen overlay with panel links
SC-P5-03: Mobile header is max 48px height
SC-P5-04: Company detail on mobile uses bottom sheet pattern (slides up from bottom)
SC-P5-05: Bottom sheet can be dismissed by drag-down or tap-outside
SC-P5-06: Touch targets are minimum 44x44px
SC-P5-07: Insights cards display single-column on mobile
SC-P5-08: No horizontal scrollbar on any viewport width
```

### Phase 6: Motion
```
SC-P6-01: Panel switches have fade transition (opacity + translateY)
SC-P6-02: Company card slides in from right on desktop
SC-P6-03: Insights cards stagger-reveal on panel load
SC-P6-04: Skeleton loading states exist for async data fetches
SC-P6-05: Static pages have scroll-driven reveal (IntersectionObserver)
```

### Phase 7: API & Agent Metadata
```
SC-P7-01: <meta name="ai:api"> present in index.html
SC-P7-02: <meta name="ai:openapi"> present in index.html
SC-P7-03: API Docs link visible somewhere in the UI
```

### Phase 8: Polish
```
SC-P8-01: npm run build succeeds with zero errors
SC-P8-02: README.md has Changelog section with v2.0 entry
SC-P8-03: All commits pushed to origin/main
```

---

## STEP 2: AUTOMATED CODE AUDIT

Run these checks programmatically. Report pass/fail for each:

```bash
# Check 1: Font CDN links
grep -c "DM+Serif+Display" index.html

# Check 2: CSS variables exist
grep -c "\-\-font-display" index.html src/*.css src/*.jsx 2>/dev/null

# Check 3: No hardcoded Inter as primary font
grep -rn "font-family.*Inter" src/ --include="*.jsx" --include="*.js" --include="*.css" | grep -v "fallback" | grep -v "var(--"

# Check 4: Color variables in root
grep -c "\-\-bg-base" index.html

# Check 5: No box-shadow
grep -rn "box-shadow\|boxShadow" src/ --include="*.jsx" --include="*.js" --include="*.css"

# Check 6: Build passes
npm run build 2>&1 | tail -5

# Check 7: Meta tags
grep -c 'name="ai:api"' index.html

# Check 8: README changelog
grep -c "Changelog" README.md

# Check 9: Font variables actually used
grep -rn "var(--font-display)\|var(--font-body)\|var(--font-mono)" src/ --include="*.jsx" --include="*.js" | wc -l

# Check 10: Static page updates (sample)
if [ -f "public/ecosystem/index.html" ]; then
  grep -c "DM+Serif+Display" public/ecosystem/index.html
fi
```

---

## STEP 3: VISUAL QA (4-Dimension Grading)

Open the running dev server. Navigate through every panel and grade on 4 dimensions.

### Test Protocol
For each panel (Map, People, Insights, Events, News, Bits):
1. Load the panel. Screenshot it mentally. Note first impression.
2. Check typography: Are the right fonts applied? Hierarchy clear?
3. Check colors: Does it use the variable system? Any hardcoded outliers?
4. Check interactions: Do hover states work? Do transitions fire?
5. Check mobile (resize to 375px width): Does the layout adapt? Is it usable?

### Grading Rubric

**Design Quality (Weight 0.30):**
- Do colors, typography, layout combine into a coherent identity?
- Does it feel like "Bloomberg meets Monocle" or "generic Notion template"?
- Is there a distinct mood and personality?

**Originality (Weight 0.25):**
- Are font choices distinctive (DM Serif Display, JetBrains Mono)?
- Is this recognizably NOT a default template?
- Would a designer see deliberate choices?

**Craft (Weight 0.20):**
- Typography hierarchy consistent across all panels?
- Spacing system consistent (not random gaps)?
- Color contrast adequate (text readable on all backgrounds)?
- No broken layouts, overflow, or misalignment?

**Functionality (Weight 0.25):**
- Map interaction works (hover, click, zoom)?
- Company cards open and display correctly?
- Mobile hamburger + bottom sheet work?
- Panel transitions fire?
- No console errors on any panel?

### Scoring
```
| Dimension        | Score (/10) | Weight | Weighted |
|------------------|-------------|--------|----------|
| Design Quality   |             | 0.30   |          |
| Originality      |             | 0.25   |          |
| Craft            |             | 0.20   |          |
| Functionality    |             | 0.25   |          |
| TOTAL            |             |        |          |

Result: PASS (≥7.0) / CONDITIONAL (5.0-6.9) / FAIL (<5.0)
```

---

## STEP 4: GAP ANALYSIS & FIX LIST

Based on Steps 1-3, produce:

### 4.1 Completed Items
List all criteria from Step 1 that PASS. No further action needed.

### 4.2 Partially Completed Items
List criteria that are partially done. For each, specify:
- What was done
- What's missing
- Estimated fix effort (quick / medium / significant)

### 4.3 Not Started Items
List criteria with zero evidence of implementation. For each, specify:
- Why it might have been skipped (too complex? forgotten? build error?)
- Whether it's still a Must, Should, or can be deferred
- Estimated implementation effort

### 4.4 New Issues Discovered
List bugs, inconsistencies, or problems not in the original spec:
- Broken functionality
- Visual regressions
- Console errors
- Performance issues

### 4.5 Prioritized Fix List
Merge 4.2, 4.3, and 4.4 into a single prioritized list:

```markdown
| # | Issue | Category | Priority | Effort | Action |
|---|-------|----------|----------|--------|--------|
| 1 | [specific issue] | [P2-gap / bug / regression] | Must | quick | [exact fix] |
| 2 | ... | | | | |
```

Priority:
- **Must:** Blocks shipping. Fix now.
- **Should:** Visible quality issue. Fix before showing to anyone.
- **Nice:** Polish. Can wait for next sprint.

---

## STEP 5: SPRINT CONTRACT FOR FIXES

If the TOTAL QA score is CONDITIONAL or FAIL, generate a sprint contract for the fix round:

```markdown
# Sprint Contract: AI.LDN Post-QA Fixes

**Sprint ID:** SC-2026-03-25-FIX
**Objective:** Bring the v2.0 redesign from [SCORE] to ≥7.0 (PASS threshold)

## Acceptance Criteria
[Generate from the prioritized fix list — Must and Should items only]

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | [testable criterion from fix list] | Must |
| AC-02 | ... | Must |
```

---

## STEP 6: PRODUCE FINAL REPORT

Write the final report to `tasks/qa-report.md` in the repo:

```markdown
# AI.LDN v2.0 Redesign — QA Report

**Date:** [today]
**Evaluator:** Claude QA Agent
**Build:** [git commit hash]

## Summary
[2-3 sentences: overall assessment]

## Scores
[table from Step 3]

## Result: [PASS / CONDITIONAL / FAIL]

## Completed (X/Y criteria passing)
[list]

## Gaps & Fixes Required
[prioritized fix list from Step 4.5]

## Sprint Contract for Fixes
[from Step 5, if applicable]

## Recommendations
[what to focus on next — max 3 bullets]
```

Commit and push:
```bash
git add tasks/qa-report.md
git commit -m "docs: QA evaluation report for v2.0 redesign"
git push origin main
```

---

## GSTACK / ENGINEERING SKILLS TO INVOKE

If you have access to the following Claude Code skills or plugins, invoke them during this review:

- **`/review`** (gstack) — Run on the full diff between the pre-redesign and post-redesign state. Flag any code quality issues.
- **`/qa`** (gstack) — Run the QA checklist against the running dev server.
- **`/careful`** (gstack) — Use this mode for the static page audit (80+ pages, easy to miss inconsistencies).
- **`/investigate`** (gstack) — If any console errors or build warnings appear, investigate root cause.
- **`/retro`** (gstack) — After completing the review, run a retrospective on what went well and what didn't in the implementation.

If Superpowers plugin is available:
- **`/design-system`** — Validate the CSS variable system is complete and consistently applied.
- **`/execute-plan`** — If fixes are needed, execute the fix sprint contract autonomously.

---

## DECISION TREE

```
QA Score ≥ 7.0 (PASS)
  → Report only. Ship it. Note minor improvements for future.
  → Run `/retro` to capture lessons.

QA Score 5.0-6.9 (CONDITIONAL)
  → Generate fix sprint contract.
  → Execute fixes immediately (paste the sprint contract as a new Claude Code prompt).
  → Re-run this QA plan after fixes.

QA Score < 5.0 (FAIL)
  → Major rework needed. Do NOT ship.
  → Identify the 3 highest-impact fixes.
  → Execute those 3 fixes only.
  → Re-run this QA plan.
  → If still FAIL after 2 rounds, escalate to XJ for manual review.
```
