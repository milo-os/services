# Global Density Pass

User-visible problem: across the app, every page has lots of empty space. Outer
padding is generous, card chrome is heavy, and inter-section gaps stretch to
24–32 px. The config detail page was already tightened in spec
`08-config-detail-density-pass.md` — this spec extends the same treatment
across every other implemented route.

Goal: smaller numbers, same content. **Tailwind class diffs only — no new
components, no new dependencies, no schema changes.**

## Global rhythm targets

Apply these rhythms consistently. Where a file diverges, the per-file diff
below brings it into line.

| Token | Old | New | Where |
|---|---|---|---|
| Page outer container vertical/horizontal | `px-6 py-6` | `px-6 py-5` | All non-wizard routes |
| Page outer container gap (between major blocks) | `gap-6` | `gap-4` | All non-wizard routes |
| Section gap (cards inside a tab/section) | `gap-6` / `gap-8` | `gap-4` | `services.$name`, configurations tab |
| Card chrome (data-dense cards) | `CardHeader` defaults `p-6` | `py-3 px-4` | Density-sensitive cards (per-file callouts) |
| Card content (data-dense cards) | `CardContent` defaults `p-6 pt-0` | `px-4 pb-4 pt-0` | Same |
| Card footer (form action rows) | `pt-4 pb-4` | `py-3` | Settings cards, config cards |
| Wizard outer | `px-10 py-8` main / `px-10 py-5` header | `px-8 py-6` main / `px-8 py-4` header | `services.new`, `services.$name_.configurations.new` |
| Wizard sidebar | `p-6` | `p-4` | Same |
| Wizard footer | `px-10 py-4` | `px-8 py-3` | Same |

Catalog gets a stronger trim because it currently uses `px-10 py-10` and
`text-4xl`, which feel like a marketing landing page rather than an in-app
list (see file diff below).

## File-by-file diff

### 1. `app/components/AppLayout.tsx`

The shell is already lean (`h-12` header, `px-4` sidebar header), so just
one tweak:

- Top header `border-b border-border/50 px-4` → keep, but reduce gap
  internal to the header from `gap-2` → `gap-3` (only because the
  `SidebarTrigger` and breadcrumb sit too tight at `gap-2`). **Optional —
  skip if you disagree.**

No structural changes.

### 2. `app/routes/services._index.tsx`  (Service list)

```diff
- <div className="flex flex-col gap-6 px-6 py-6">
+ <div className="flex flex-col gap-4 px-6 py-5">
```

The summary line below the title is already tight; leave it.

Empty-state card "No matches for…":
```diff
- <CardContent className="flex flex-col items-center gap-3 py-10">
+ <CardContent className="flex flex-col items-center gap-3 py-8">
```

Table card stays `CardContent className="p-0"` (correct — table provides
its own padding).

### 3. `app/routes/services.$name.tsx`  (Service detail — biggest gain)

This file has the most empty space because it stacks three full-width cards
under each tab.

#### 3a. Outer container (twice — error path and main path)

```diff
- <div className="flex flex-col gap-6 px-6 py-6">
+ <div className="flex flex-col gap-4 px-6 py-5">
```

#### 3b. Overview tab — put Details + Conditions side by side at lg+

The two cards together waste ~ 50 % of horizontal space on `lg`. Wrap the
two main cards in a 2-column grid:

```tsx
<TabsContent value="overview">
  <div className="flex flex-col gap-4">
    {service.spec.phase === "Published" ? (
      <Card>…Quick actions…</Card>
    ) : null}
    {/* NEW: 2-col on lg+ */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>…Details…</Card>
      <Card>…Conditions…</Card>
    </div>
  </div>
</TabsContent>
```

Replaces the existing `<div className="flex flex-col gap-6">` wrapper.

The Details `dl` stays `grid-cols-2 gap-x-8 gap-y-3` — that's already
right for a half-width card.

#### 3c. Configurations tab

```diff
- <div className="flex flex-col gap-8">
+ <div className="flex flex-col gap-5">
```

The "Active configuration" / "Version history" sections each use
`gap-4`, leave those alone — that's the gap between cards within a
section.

`ConfigCardHeader`:
```diff
- <CardHeader className="pt-4 pb-3">
+ <CardHeader className="py-3 px-4">
```

`ConfigCardActions`:
```diff
- <CardFooter className="flex justify-end gap-2 border-t pt-4 pb-4">
+ <CardFooter className="flex justify-end gap-2 border-t py-3 px-4">
```

`ConfigCardBody`:
```diff
- <CardContent className="flex items-center gap-3 text-sm text-muted-foreground py-3 flex-wrap">
+ <CardContent className="flex items-center gap-3 text-sm text-muted-foreground py-2 px-4 flex-wrap">
```

#### 3d. Settings tab

```diff
- <div className="flex flex-col gap-8 max-w-3xl">
+ <div className="flex flex-col gap-5 max-w-3xl">
```

Identity card form `<CardContent className="flex flex-col gap-5">` →
`gap-4`. The CardFooter on each settings card:
```diff
- <CardFooter className="justify-end gap-2 border-t pt-4 pb-4">
+ <CardFooter className="justify-end gap-2 border-t py-3">
```

(applies to both the Identity and Lifecycle cards)

Lifecycle card `<CardContent className="flex flex-col gap-3">` stays.

Danger zone:
```diff
- <CardContent className="flex flex-col gap-6 pt-6 pb-6">
+ <CardContent className="flex flex-col gap-5 pt-5 pb-5">
```

### 4. `app/routes/services.$name_.configurations.$configName.tsx`

Already fully specified in `08-config-detail-density-pass.md`. **Do not
re-edit** during this pass; it's the baseline this spec extends. (Listed
here for completeness so the engineer doesn't think it was missed.)

### 5. `app/routes/services.$name_.configurations.compare.tsx`

#### 5a. Outer container (both error + main path)

```diff
- <div className="flex flex-col gap-6 px-6 py-6">
+ <div className="flex flex-col gap-4 px-6 py-5">
```

#### 5b. The header block + selectors

```diff
- <div className="flex flex-col gap-5">
+ <div className="flex flex-col gap-3">
```

#### 5c. The diff result wrapper

```diff
- <div className="flex flex-col gap-6">
+ <div className="flex flex-col gap-4">
```

#### 5d. Diff entry cards (MrtDiffEntry, MeterDiffEntry)

Both use the same template:

```diff
- <div className="border border-border/60 rounded-md p-4 flex flex-col gap-3">
+ <div className="border border-border/60 rounded-md p-3 flex flex-col gap-2">
```

Inside each, the per-field row keeps `py-2` — this is the readable
diff cadence and shouldn't change.

`Configuration metadata` Card and the two diff Cards use default
`CardHeader` / `CardContent`. Override on each:
```diff
- <CardHeader>
+ <CardHeader className="py-3 px-4">
- <CardContent className="flex flex-col">
+ <CardContent className="flex flex-col px-4 pb-4 pt-0">
```

(For the Monitored resource types and Meters Cards: same `py-3 px-4`
header override, same `px-4 pb-4 pt-0` content override, but content
keeps `flex flex-col gap-4` → tighten to `gap-3`.)

### 6. `app/routes/services.$name_.configurations.new.tsx`  (Create config wizard)

#### 6a. Wizard header

```diff
- <header className="flex items-center justify-between border-b border-border/50 px-10 py-5">
+ <header className="flex items-center justify-between border-b border-border/50 px-8 py-4">
```

#### 6b. Wizard sidebar

```diff
- <aside className="border-r border-border/50 bg-muted/20 p-6">
+ <aside className="border-r border-border/50 bg-muted/20 p-4">
```

```diff
- <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
+ <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
```

Sidebar grid track: `grid-cols-[260px_1fr]` → `grid-cols-[220px_1fr]`
(saves 40 px of horizontal real estate on every wizard screen — step
labels are short).

#### 6c. Wizard main + footer

```diff
- <main className="flex-1 overflow-auto px-10 py-8">
+ <main className="flex-1 overflow-auto px-8 py-6">
```

```diff
- <footer className="flex items-center justify-between border-t border-border/50 px-10 py-4 bg-card/50">
+ <footer className="flex items-center justify-between border-t border-border/50 px-8 py-3 bg-card/50">
```

Inline Alert above the step content:
```diff
- <Alert variant="destructive" className="mb-6">
+ <Alert variant="destructive" className="mb-4">
```

#### 6d. Step bodies

`Step1VersionSource`, `Step2Mrts`, `Step3Meters`, `Step4Review` all use
`<div className="flex flex-col gap-6 max-w-2xl">` (or `max-w-3xl`):

```diff
- <div className="flex flex-col gap-6 max-w-2xl">
+ <div className="flex flex-col gap-4 max-w-2xl">
```

(replace_all for `gap-6 max-w-2xl` and `gap-6 max-w-3xl` within this file)

The empty-state cards in Step2/Step3 use `py-8` — drop to `py-6`:
```diff
- <CardContent className="flex flex-col items-center gap-3 py-8">
+ <CardContent className="flex flex-col items-center gap-3 py-6">
```

`Step4Review`'s outer `<div className="flex flex-col gap-6">` (around the
checkbox + review card) → `gap-4`.

The "Created in Draft" Alert at the bottom doesn't need its own change.

The error path wrapper uses `px-10 py-10`:
```diff
- <div className="flex flex-col gap-6 px-10 py-10">
+ <div className="flex flex-col gap-4 px-8 py-6">
```

### 7. `app/routes/services.new.tsx`  (Create service wizard)

Apply the **same wizard density set** as #6 (this file has the same
shell, same step shape):

- Header `px-10 py-5` → `px-8 py-4`
- Sidebar `p-6` → `p-4`, sidebar grid `260px → 220px`
- Sidebar `mb-3` → `mb-2`
- Main `px-10 py-8` → `px-8 py-6`
- Footer `px-10 py-4` → `px-8 py-3`
- Top alert `mb-6` → `mb-4`
- Step containers `gap-6 max-w-2xl` / `gap-6 max-w-3xl` → `gap-4 …`
- Step4 wrapper `gap-6` → `gap-4`
- Empty-state CardContent `py-8` → `py-6`

The Review step has a `flex flex-col gap-5` inside the Initial
configuration CardContent — keep, that's already tight.

### 8. `app/routes/catalog._index.tsx`  (Consumer catalog)

The catalog page is an outlier — it currently feels like a marketing
landing page (`px-10 py-10`, `gap-10`, `text-4xl`) which is a step out of
key compared to every other page. Pull it back into the in-app rhythm
while keeping its more spacious card grid:

```diff
- <div className="flex flex-col gap-10 px-10 py-10 max-w-7xl">
+ <div className="flex flex-col gap-6 px-6 py-6 max-w-7xl">
```

```diff
- <header className="flex flex-col gap-2">
-   <h1 className="text-4xl font-bold tracking-tight">Service catalog</h1>
-   <p className="text-base text-muted-foreground">
+ <header className="flex flex-col gap-1">
+   <h1 className="text-2xl font-bold tracking-tight">Service catalog</h1>
+   <p className="text-sm text-muted-foreground">
      Browse services published for your projects.
    </p>
  </header>
```

(matches the `text-2xl` of every other top-level page heading.)

```diff
- <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
+ <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
```

`ServiceCard`:
```diff
- <CardHeader className="flex flex-row items-start justify-between gap-3 pt-4 pb-3">
+ <CardHeader className="flex flex-row items-start justify-between gap-3 py-3 px-4">
- <CardContent className="flex flex-col gap-2 pb-5">
+ <CardContent className="flex flex-col gap-2 px-4 pb-4 pt-0">
```

The `Server` icon block `p-2` is fine; the badge stays.

Empty-state "No matches" CardContent `py-10` → `py-8`.

## Don't change

- `Tabs` / `TabsList` / `TabsTrigger` defaults — these are sized by the
  design system; overriding adds inconsistency.
- `EmptyContent` — already accepts `size="sm"|"md"|"lg"`. Don't manually
  pad around it.
- `Input` / `Label` / `Select` heights — these come from the design
  system.
- `Alert` defaults.
- Sidebar (left rail) — already lean.
- Page header `h-12` (AppLayout) — the breadcrumb chrome is fine.
- Existing `gap-x-8 gap-y-3` on `dl.grid-cols-2` blocks — that's the
  right typography rhythm for label-over-value lists.
- `formatDate` / `relativeAge` / phase badge formatting — text content
  unchanged.

## Verification checklist for ui-engineer

1. After edits, every non-wizard route's outer container reads
   `flex flex-col gap-4 px-6 py-5`. (Catalog has a tweaked variant —
   `gap-6 px-6 py-6 max-w-7xl`.)
2. Service detail Overview tab on `lg`: Details and Conditions render
   side-by-side, not stacked.
3. Service detail Settings tab is visibly tighter — three cards fit on a
   typical viewport without scrolling, where today the third card
   (Danger zone) sits below the fold for most users.
4. Both wizards use a 220 px sidebar; main padding matches `px-8 py-6`.
5. Catalog title is `text-2xl`, not `text-4xl`.
6. `pnpm type-check` passes.
7. `grep -rn "Response.json" app/` is empty (no new instances introduced).
8. Existing Playwright suite still 14/14 — none of the edits change a
   text target, route, or accessible role.
9. No new files introduced. No new imports. No new components.

## Suggested commit/PR title

`ui: global density pass (gap, padding, header sizes)`
