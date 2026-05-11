# UX Spec — Config Compare Screen

**Pencil node:** `haUvC` (frame "Configurations - Compare")
**Implements task:** #8
**Route:** `services.$name_.configurations.compare.tsx`
(`$name_` with the trailing underscore breaks the nesting so the
compare view does NOT render inside the Service detail tab shell.)

---

## 1. Purpose

Side-by-side comparison of any two `ServiceConfiguration` resources
that belong to the same service. Linked to from the Configurations
tab cards via `Compare` action (spec #1).

The Pencil mockup shows a "dependencies / quota / billing / IAM /
entitlements" diff. Our CRD only exposes **monitored resource types**
and **meters**, so the actual diff sections are:

| Diff section            | Source field                          |
| ----------------------- | ------------------------------------- |
| Header metadata         | `spec.version`, `spec.phase`, `status.publishedAt` |
| Monitored Resource Types | `spec.monitoredResourceTypes[]`       |
| Meters                  | `spec.meters[]`                        |

Anything else in the mockup (dependencies, quota, billing rates, IAM
roles, entitlements affected) is omitted — see §6.

---

## 2. URL contract

```
/services/:name/configurations/compare?left=<configName>&right=<configName>
```

- `left` and `right` are required. If either is missing, render the
  selector UI plus an empty-state body that says "Pick two
  configurations to compare." (Do not 404.)
- If both are equal, render a notice "These are the same configuration"
  and skip the diff body.
- Linking from the Configurations tab passes only `left=<name>`; the
  user picks `right` on this screen.

---

## 3. Page chrome

```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@datum-cloud/datum-ui/breadcrumb";
import { Button } from "@datum-cloud/datum-ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datum-cloud/datum-ui/select";
import { ArrowLeftRight, GitCompare } from "lucide-react";
```

Header layout:

```
<header className="flex flex-col gap-5 px-14 pt-8">
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem><BreadcrumbLink to={`/services/${name}`}>{service.spec.displayName}</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem><BreadcrumbLink to={`/services/${name}#configurations`}>Configurations</BreadcrumbLink></BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>Compare</BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>

  <div className="flex items-center justify-between gap-6">
    <h1 className="text-2xl font-bold">Compare configurations</h1>

    <div className="flex items-center gap-3">
      <ConfigSelect side="left"  value={left}  options={configs} />
      <Button variant="ghost" size="icon" aria-label="Swap" onClick={swap}>
        <ArrowLeftRight className="h-5 w-5" />
      </Button>
      <ConfigSelect side="right" value={right} options={configs} />
    </div>
  </div>
</header>
```

`ConfigSelect` is a `<Select>` whose options are every config for this
service, sorted by `status.publishedAt` desc. Each option label is
`v{version}` plus the phase badge label in parentheses (e.g.
`v3.0.0 (Active)`, `v2.5.0 (Superseded)`). On change, push a new URL
with the updated query param via `useNavigate()` (preserve the other
side).

The swap button rewrites the URL with `left` ↔ `right` swapped.

---

## 4. Body structure

```
<main className="flex flex-col gap-6 px-14 py-8">

  {/* 4a. Summary banner */}
  <DiffSummaryBanner diff={diff} />

  {/* 4b. Header metadata diff */}
  <DiffCard title="Configuration metadata">
    <DiffRow  label="Version"      left={left.spec.version}                  right={right.spec.version} />
    <DiffRow  label="Phase"        left={phaseLabel(left)}                   right={phaseLabel(right)} renderAs="badge" />
    <DiffRow  label="Published at" left={fmtDate(left.status?.publishedAt)} right={fmtDate(right.status?.publishedAt)} />
  </DiffCard>

  {/* 4c. Monitored resource types diff */}
  <DiffCard title="Monitored resource types" subtitle={mrtSubtitle(diff.mrts)}>
    {diff.mrts.length === 0
      ? <EmptyDiffNote>No changes.</EmptyDiffNote>
      : diff.mrts.map((entry) => <MrtDiffRow key={entry.key} entry={entry} />)}
  </DiffCard>

  {/* 4d. Meters diff */}
  <DiffCard title="Meters" subtitle={meterSubtitle(diff.meters)}>
    {diff.meters.length === 0
      ? <EmptyDiffNote>No changes.</EmptyDiffNote>
      : diff.meters.map((entry) => <MeterDiffRow key={entry.key} entry={entry} />)}
  </DiffCard>

</main>
```

### 4a. DiffSummaryBanner

`<Alert variant="info">` with a `GitCompare` icon and copy generated
from the diff:

```
"+2 monitored resource types · −1 meter · 3 modified"
```

Use `−` (en-dash, `−`) for removals to match the design. If there
are zero changes, copy reads `Configurations are identical.`

### 4b. DiffRow (scalar)

A single 3-column row: `<label> | <left value> | <right value>`. When
`left !== right`, both cells get a tinted background:

- Removed/old (left side): `bg-destructive/10 text-destructive`
- Added/new (right side): `bg-success/10 text-success`

When values are equal, render in `text-muted-foreground` with no tint.

### 4c. MrtDiffRow

Each entry has a `state ∈ {added, removed, modified, unchanged}`. We
do **not** render `unchanged` rows in the per-section list (they would
add noise); the count is in the section subtitle instead.

For `modified`, render the MRT name followed by a nested table of the
fields that differ:

| Field          | Source                                              |
| -------------- | --------------------------------------------------- |
| Type           | `mrt.type`                                          |
| Display name   | `mrt.displayName`                                   |
| Description    | `mrt.description`                                   |
| GVK group      | `mrt.gvk.group`                                     |
| GVK kind       | `mrt.gvk.kind`                                      |
| Labels         | `mrt.labels[]` joined as `key=value` chips          |

Match keys by `mrt.type`. Sort: removed first, added second, modified
third, all alphabetically by `type` within each group.

### 4d. MeterDiffRow

Same shape as MrtDiffRow, keyed by `meter.name`. Fields shown when
modified:

| Field                         | Source                                   |
| ----------------------------- | ---------------------------------------- |
| Name                          | `meter.name`                             |
| Display name                  | `meter.displayName`                      |
| Description                   | `meter.description`                      |
| Aggregation                   | `meter.measurement.aggregation`          |
| Unit                          | `meter.measurement.unit`                 |
| Billing — consumed unit       | `meter.billing.consumedUnit`             |
| Billing — pricing unit        | `meter.billing.pricingUnit`              |
| Bound monitored resource types | `meter.monitoredResourceTypes[]` chips  |

---

## 5. Diff helpers

Place in `ui/app/lib/diff.ts` (new file):

```ts
type DiffEntry<T> =
  | { state: "unchanged"; key: string; left: T; right: T }
  | { state: "added";     key: string;          right: T }
  | { state: "removed";   key: string; left: T }
  | { state: "modified";  key: string; left: T; right: T; fields: string[] };

export function diffByKey<T>(
  left:  T[] | undefined,
  right: T[] | undefined,
  keyOf: (t: T) => string,
  fieldsOf: (t: T) => Record<string, unknown>,
): DiffEntry<T>[] { /* … */ }
```

`fields[]` lists the field names that differ between left and right.
The renderer uses it to limit the modified-row table to only changed
rows.

---

## 6. Gap analysis vs. Pencil design

| Pencil element                                              | Status   | Reason                                                   |
| ----------------------------------------------------------- | -------- | -------------------------------------------------------- |
| Two version selectors + swap button                         | Render   | Implemented per §3                                       |
| Summary banner                                              | Render   | Generated from MRT + Meter diff counts                   |
| `+1 dependency`, `+1 quota bucket`, `+3 permissions`        | **Omit** | No dependencies / quota / IAM in API surface             |
| `No IAM role changes`                                       | **Omit** | No IAM role linkage in API                                |
| DEPENDENCIES diff card                                      | **Omit** | No dependency field                                       |
| IMPACT IF v3.0.0 ACTIVATED card                             | **Omit** | "Entitlements affected" is runtime data not exposed       |
| `142 entitlements affected`                                 | **Omit** | Runtime data                                              |
| Bullet list of which projects/users break                   | **Omit** | Runtime data                                              |
| **Replacement** — Monitored resource types diff             | **Add**  | This is the actual API field                              |
| **Replacement** — Meters diff                               | **Add**  | This is the actual API field                              |

If a user clicks `Compare` from a card and we have nothing meaningful
to diff (e.g. both configs have empty `meters` and `monitoredResourceTypes`),
the body still renders with the metadata diff card and "No changes."
notes. Do not 404 or hide sections that are empty — empty is a valid
diff result and the user needs to see it.

---

## 7. Loader contract

```ts
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const leftName  = url.searchParams.get("left")  ?? undefined;
  const rightName = url.searchParams.get("right") ?? undefined;

  const [service, configs] = await Promise.all([
    fetchK8s<Service>(request, `/apis/services.miloapis.com/v1alpha1/services/${params.name}`),
    fetchK8s<ServiceConfigurationList>(request, `/apis/services.miloapis.com/v1alpha1/serviceconfigurations`),
  ]);

  const mine = configs.items.filter((c) => c.spec.serviceRef.name === params.name);
  const left  = leftName  ? mine.find((c) => c.metadata.name === leftName)  : undefined;
  const right = rightName ? mine.find((c) => c.metadata.name === rightName) : undefined;

  return json({ service, configs: mine, left, right });
}
```

The diff is computed in the route component (or a small helper) — not
in the loader — so the loader stays cacheable across selector changes.

---

## 8. Acceptance checklist (for ui-engineer)

- [ ] Route file is `services.$name_.configurations.compare.tsx` (note the trailing `_`).
- [ ] Selector change updates URL params via `useNavigate`; back/forward work.
- [ ] Swap button swaps `left`/`right` query params in place.
- [ ] When `left` or `right` is missing, render selector UI + "Pick two configurations" empty state.
- [ ] When `left === right`, show `These are the same configuration` and skip diff body.
- [ ] DiffRow tints differ-only cells (red left, green right).
- [ ] MRT and meter diffs key by `type` and `name` respectively; modified entries show only changed fields.
- [ ] Sort within each diff section: removed → added → modified, alphabetical inside each group.
- [ ] Subpath imports from `@datum-cloud/datum-ui` only.
- [ ] No `Response.json()`.
