# Config Detail — Density Pass

**Route:** `/services/:name/configurations/:configName`
**File:** `ui/app/routes/services.$name_.configurations.$configName.tsx`
**Pencil reference:** node `5BNLr` (`Configurations - Detail`), in particular the
`metaCard` (`ExZ9m`) which uses a **2-column body** with `gap: 48` between
columns and `gap: 16` between groups inside each column.

## Problem

The current page is a vertical stack of four full-width cards: title block,
"Details" (4 tiny fields), "Meters", "Monitored Resource Types". On any screen
≥ `md` this leaves large bands of empty space on the right of the Details
card and stretches each Meter/MRT card across the entire viewport, making
multi-entry configs scroll a long way.

The Pencil mockup solves this by collapsing the Details card into the
header's metadata row and using multi-column layouts inside each section.
We will mirror that behavior with structural-only edits — same components,
same data, denser arrangement.

## Structural changes (in order)

### 1. Replace the "Details" card with an inline metadata row

The Details card is four small fields (Service Ref, Phase, Meters count,
Resource Types count). Phase is already shown next to the title; meter and
MRT counts are visible on each section's header once we move them; the only
unique field left is **Service Ref**.

**Delete the entire `<Card>...Details...</Card>` block.** Move Service Ref
into the title block as a small linked subtitle and append a "meta row" of
inline counts directly under it.

```tsx
{/* Title block — replaces existing title block + Details card */}
<div className="flex flex-col gap-1">
  <div className="flex items-center gap-3 flex-wrap">
    <h1 className="text-2xl font-bold text-foreground">{versionTitle}</h1>
    <Badge type={phase.type} theme={phase.theme}>{phase.label}</Badge>
  </div>
  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted-foreground">
    <span className="font-mono">{configuration.metadata.name}</span>
    {serviceRefName ? (
      <>
        <span aria-hidden>·</span>
        <span>
          Service:&nbsp;
          <Link
            to={`/services/${encodeURIComponent(serviceRefName)}`}
            className="text-primary hover:underline font-mono"
          >
            {serviceRefName}
          </Link>
        </span>
      </>
    ) : null}
    <span aria-hidden>·</span>
    <span>{meters.length} meter{meters.length === 1 ? "" : "s"}</span>
    <span aria-hidden>·</span>
    <span>{mrts.length} resource type{mrts.length === 1 ? "" : "s"}</span>
  </div>
</div>
```

Net effect: kills one full card (~120 px tall) and consolidates four data
points the user scans together.

### 2. Tighten the page outer container

The page body uses `flex flex-col gap-6 px-6 py-6`. The Pencil mockup uses
`gap: 32` between sections and `padding: [32, 56]`. We don't need the wider
horizontal padding, but we can reduce vertical breathing room between cards
since the Details card is gone:

```tsx
<div className="flex flex-col gap-4 px-6 py-6">
```

`gap-6` → `gap-4` (24 px → 16 px). Section internal padding stays at the
default Card values.

### 3. Reduce Card chrome on Meters and MRTs

`Card` from `@datum-cloud/datum-ui/card` uses `CardHeader` (default
`p-6`) and `CardContent` (default `p-6 pt-0`). For these data-dense
sections, override:

```tsx
<Card>
  <CardHeader className="py-3 px-4 flex-row items-center justify-between">
    <CardTitle className="text-base">Meters</CardTitle>
    <span className="text-xs text-muted-foreground">{meters.length} total</span>
  </CardHeader>
  <CardContent className="px-4 pb-4 pt-0">
    {/* …entries grid… */}
  </CardContent>
</Card>
```

Same shape for the Monitored Resource Types card. Putting the count in the
header recovers what we removed when we deleted the Details card and gives
the user a section-level summary at a glance.

### 4. Render Meters and MRTs as a 2-column grid

Replace each section's `<div className="flex flex-col gap-4">` with a
responsive grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
  {meters.map((m) => <MeterCard key={m.name} meter={m} />)}
</div>
```

Notes:
- Single column under `lg` (1024 px) keeps cards readable on narrow viewports.
- `gap-3` (12 px) replaces `gap-4` (16 px) because cards now have edges on
  both sides and don't need as much breathing room.
- Same change for MRTs.

### 5. Make MeterCard internals denser

Current: name/displayName/description column, then a 2-col `dl` with five
fields (4 scalar + 1 wide for Monitored Resource Types).

Change:
- Outer card padding `p-4` → `p-3`.
- Outer `gap-3` → `gap-2`.
- Header micro-stack `gap-1` stays.
- The four scalar fields (Aggregation, Unit, Consumed Unit, Pricing Unit)
  go on **one row at `md`+** instead of a 2×2 grid:

```tsx
<dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
  <DefRow label="Aggregation">{meter.measurement?.aggregation || "—"}</DefRow>
  <DefRow label="Unit">{meter.measurement?.unit || "—"}</DefRow>
  <DefRow label="Consumed Unit">{meter.billing?.consumedUnit || "—"}</DefRow>
  <DefRow label="Pricing Unit">{meter.billing?.pricingUnit || "—"}</DefRow>
</dl>
```

- The `Monitored Resource Types` row is broken out into its **own line**
  beneath the scalar grid (not as a `span={2}` cell of the grid). Reason:
  in a 2-column page layout each card is half-width, so a 4-up scalar row
  uses ~ 90–110 px per cell which is plenty for short tokens. Forcing
  badges to wrap inside one column-span cell looks cramped.

```tsx
{meter.monitoredResourceTypes && meter.monitoredResourceTypes.length > 0 ? (
  <div className="pt-1">
    <div className="text-xs font-medium text-muted-foreground mb-1">
      Monitored Resource Types
    </div>
    <div className="flex flex-wrap gap-1.5">
      {meter.monitoredResourceTypes.map((mrt) => (
        <Badge key={mrt} type="secondary" theme="light">{mrt}</Badge>
      ))}
    </div>
  </div>
) : null}
```

- Drop the "—" empty-state for the MRTs row (omit it instead) — the badge
  list is implicitly optional.

### 6. Make MrtCard internals denser

MRT cards only have GVK Group / GVK Kind as scalars and Labels as a wide
field. With the 2-column page grid making each card narrower, put GVK
Group and GVK Kind **inline as a single typographic line** rather than a
labelled `dl`:

```tsx
<div className="flex flex-col gap-2 border border-border/50 rounded-md p-3">
  <div className="flex flex-col gap-1">
    <div className="font-mono text-xs text-foreground">{mrt.type}</div>
    {mrt.displayName ? (
      <div className="text-sm font-medium text-foreground">{mrt.displayName}</div>
    ) : null}
    {mrt.description ? (
      <div className="text-sm text-muted-foreground whitespace-pre-line">
        {mrt.description}
      </div>
    ) : null}
  </div>
  <div className="text-xs text-muted-foreground font-mono">
    <span>{mrt.gvk?.group || "—"}</span>
    <span className="mx-1.5">/</span>
    <span>{mrt.gvk?.kind || "—"}</span>
  </div>
  {mrt.labels && mrt.labels.length > 0 ? (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">Labels</div>
      <div className="flex flex-wrap gap-1.5">
        {mrt.labels.map((l) => (
          <Badge key={l.name} type="secondary" theme="light" title={l.description}>
            {l.name}
          </Badge>
        ))}
      </div>
    </div>
  ) : null}
</div>
```

Net effect: MRT cards become substantially shorter (no label-over-value
GVK rows, no "—" placeholders for missing labels).

### 7. EmptyContent — keep as-is, but center inside the new compact card

The two `EmptyContent` blocks for the empty-state branches stay
unchanged (already `size="sm"` and `variant="minimal"`). They render
inside the tightened `CardContent` and look fine.

## Don't change

- Loader / error path (the `error || !configuration` branch above the
  default render).
- Loader logic itself.
- Back link.
- DefRow helper — still used by MeterCard scalar grid.
- Component import paths.

## Files touched

- `ui/app/routes/services.$name_.configurations.$configName.tsx` — only file.

No new components, no new imports. Changes are entirely className /
JSX-structure reshuffles.

## Verification checklist for ui-engineer

1. After edit, page on a `lg` viewport renders title + meta row + two
   side-by-side meter cards (when ≥ 2 meters) above two side-by-side MRT
   cards.
2. On `md` viewport (768–1023 px), meter and MRT entries fall back to a
   single column — sections still appear in the same vertical order.
3. Page total height for a config with 3 meters + 3 MRTs is roughly
   half what it is today.
4. Existing Playwright tests for `/services/:name/configurations/:configName`
   still pass — the test plan only checks `versionTitle`, phase badge,
   and that meter/MRT names are visible. None of those text targets
   move.
5. `pnpm type-check` is clean.
6. `grep -rn "Response.json" app/` is empty (we don't add any).
