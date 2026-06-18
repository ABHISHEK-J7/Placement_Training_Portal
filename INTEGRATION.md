# Torii Minds — 2027 Batch Training Pages · Integration Guide

Two new pages to add to the existing Next.js (App Router) site:

> **Language: plain JavaScript (JSX).** No TypeScript anywhere — no `.ts`/`.tsx`, no
> `tsconfig.json`. Types are documented via JSDoc where useful (e.g. `src/data/programs.js`).

| Route | Page | Source |
|---|---|---|
| `/training` | Training Program & Curriculum (timetables + day-wise syllabus + assessments, tabbed per track) | `src/app/training/page.jsx` |
| `/training/students` | Cohort Roster (searchable / filterable participants) | `src/app/training/students/page.jsx` |

> This repo is a **standalone reference scaffold** (the real site wasn't available when it was
> built). Run it with `npm install && npm run dev` to see exactly how the pages should look,
> then copy the files below into the real project and remap the shared imports.

---

## 1. Files to COPY into the real project (page-specific — these ARE the new pages)

```
src/app/training/page.jsx                       # Route: /training
src/app/training/students/page.jsx              # Route: /training/students
src/components/training/ProgramExplorer.jsx     # Client: track tabs + overview
src/components/training/TimetableTable.jsx       # Daily timetable
src/components/training/SyllabusTable.jsx        # Day-wise syllabus
src/components/students/StudentRoster.jsx        # Client: search/filter roster
src/data/programs.js                             # Timetables, syllabus, assessments
src/data/students.js                             # 294 participants (125 + 169)
```

These have **no business-logic dependency on anything else** — only on the shared UI
primitives and the `cn` helper listed in §2.

---

## 2. Shared imports to REMAP to the existing design system

The page files import these. **Point them at the site's existing equivalents** (preferred), or
copy ours if the site doesn't have them.

| Our import | What it is | Action |
|---|---|---|
| `@/components/ui/Button` | pill button (link/button, variants) | map to existing Button |
| `@/components/ui/Card` | rounded bordered surface | map to existing Card |
| `@/components/ui/Badge` | pill tag (`brand`/`neutral`/`outline`) | map to existing Badge/Chip |
| `@/components/ui/Container` | centered max-width gutter | map to existing layout container |
| `@/lib/utils` → `cn`, `byName`, `normalizeUsn` | classname joiner + sort/format helpers | keep `cn` from existing util; copy `byName`/`normalizeUsn` if missing |

If the existing components take different prop names (e.g. `tone` vs `variant` on Badge),
do a find-and-replace in the 6 page/component files — they're the only consumers.

---

## 3. Design tokens the markup expects

The components use Tailwind classes bound to CSS variables: `brand`, `background`, `surface`,
`surface-2`, `border`, `foreground`, `muted` (see `tailwind.config.js` + `src/app/globals.css`).
Two options:

- **A (fastest):** copy the `colors`/token block from our `tailwind.config.js` and the
  `:root` / `.dark` variables from our `globals.css` into the real project (namespaced if needed).
- **B (cleanest):** swap our token classes for the site's existing ones
  (e.g. `text-muted` → site's muted class, `bg-surface` → site's card bg). All classes live in
  the 6 files above.

Accent color used: **Torii-gate vermilion `#EA5829`** — match to the site's real brand orange.

---

## 4. Navigation

Add two links to the existing Navbar / menu:

```tsx
<Link href="/training">Training Program</Link>
<Link href="/training/students">Participants</Link>
```

---

## 5. Notes

- Both pages export `metadata` (title + description + canonical) for SEO — Next merges these
  with the site's root `layout.tsx`. No root changes required.
- `/training` reads `?track=ai-ready-engineer|placement-training` to deep-link a tab.
- `StudentRoster` and `ProgramExplorer` are Client Components (`"use client"`); the page
  shells are Server Components that pass data in as props (data is static, no API needed).
- Data is transcribed from the official sheets. To edit content later, only
  `src/data/programs.js` and `src/data/students.js` change.

---

## What you can ignore (scaffolding the real site already has)

`src/app/layout.jsx`, `globals.css`, `tailwind.config.js`, `Navbar`, `Footer`, `Logo`,
`ThemeProvider`, `ThemeToggle`, `src/app/page.jsx` (demo home), `sitemap.js`, `robots.js`,
`package.json`, and config files — these exist only so the scaffold runs standalone.
