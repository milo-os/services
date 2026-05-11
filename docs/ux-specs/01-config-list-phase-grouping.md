# UX Spec — Configurations Tab: Phase Grouping

**Pencil node:** `OJIvM` (frame "Configurations - List")
**Implements task:** #6
**Route:** `services.$name.tsx`, content under the `Configurations` tab.

---

## 1. Purpose

The Configurations tab on the Service detail page lists every
`ServiceConfiguration` whose `spec.serviceRef.name` matches the current
`Service.metadata.name`, **grouped by phase**:

| Group label              | Source                                             |
| ------------------------ | -------------------------------------------------- |
| Pending banner (warning) | any config with `spec.phase === "Draft"`           |
| ACTIVE CONFIGURATION     | configs with `spec.phase === "Published"`          |
| VERSION HISTORY          | configs with `spec.phase ∈ {Deprecated, Retired}`  |

Within each group, sort by `status.publishedAt` descending (newest first);
fall back to `metadata.creationTimestamp` for Draft configs that have not
been published.

If a service has multiple `Published` configs simultaneously, render them
all in the ACTIVE group as separate cards (defensive — the controller
should normally promote-and-deprecate, but the UI should not assume
exactly one).

---

## 2. Page chrome (above the grouped sections)

This work owns the body of the Configurations tab only; the existing
page header (back link, title, tabs) stays as-is. Confirm the tab strip
on `services.$name.tsx` highlights `Configurations` when active.

- **Tab label:** `Configurations`
- **Page title (already rendered):** Service `displayName`
- **Subtitle (already rendered):** Service `serviceName` slug
- **Top-right CTA in tab body:** `New configuration` — primary button.
  Disabled for v1 (no create wizard yet); render but route to `#`. Add a
  TODO comment referencing task #9.

---

## 3. Component tree

All imports are subpath imports from `@datum-cloud/datum-ui`. Never use
the barrel.

```tsx
import { Alert, AlertTitle, AlertDescription } from "@datum-cloud/datum-ui/alert";
import { Badge } from "@datum-cloud/datum-ui/badge";
import { Button } from "@datum-cloud/datum-ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@datum-cloud/datum-ui/card";
import { Separator } from "@datum-cloud/datum-ui/separator";
import { CircleAlert, Download, Eye, GitCompare, Plus, RotateCcw, Users } from "lucide-react";
```

```
<div className="flex flex-col gap-8">
  {/* 3a. Pending banner — only when at least one Draft exists */}
  {drafts.length > 0 && (
    <Alert variant="warning">
      <CircleAlert />
      <AlertTitle>{drafts.length} pending configuration{drafts.length > 1 ? "s" : ""} not yet activated</AlertTitle>
      <AlertDescription className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={`./configurations/${drafts[0].metadata.name}`}>View</Link>
        </Button>
        {/* "Activate" is a future action — render disabled, title="Coming soon" */}
        <Button size="sm" disabled>Activate</Button>
      </AlertDescription>
    </Alert>
  )}

  {/* 3b. Active group */}
  <section className="flex flex-col gap-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Active configuration
    </h3>
    {published.length === 0 ? (
      <EmptyActiveCard />
    ) : (
      published.map((cfg) => <ActiveConfigCard key={cfg.metadata.uid} cfg={cfg} />)
    )}
  </section>

  {/* 3c. History group */}
  <section className="flex flex-col gap-4">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Version history
    </h3>
    {history.length === 0 ? (
      <EmptyHistoryCard />
    ) : (
      history.map((cfg) => <HistoryConfigCard key={cfg.metadata.uid} cfg={cfg} />)
    )}
  </section>
</div>
```

### 3d. ActiveConfigCard

```
<Card className="border-2 border-success">              // green ring
  <CardHeader>
    <div className="flex items-center gap-3">
      <h4 className="text-2xl font-bold">v{cfg.spec.version}</h4>
      <Badge variant={phaseBadgeProps(cfg.spec.phase).variant}>
        {phaseBadgeProps(cfg.spec.phase).label}
      </Badge>
      <Separator orientation="vertical" className="h-4 ml-auto" />
      <span className="text-sm text-muted-foreground">
        Activated {formatDate(cfg.status?.publishedAt)}
      </span>
    </div>
  </CardHeader>
  <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
    <span>{cfg.spec.monitoredResourceTypes?.length ?? 0} monitored resource types</span>
    <span>·</span>
    <span>{cfg.spec.meters?.length ?? 0} meters</span>
  </CardContent>
  <CardFooter className="flex justify-end gap-2 border-t pt-4">
    <Button variant="ghost" asChild>
      <Link to={`./configurations/${cfg.metadata.name}`}>
        <Eye className="mr-2 h-4 w-4" /> View details
      </Link>
    </Button>
    <Button variant="ghost" asChild>
      <Link to={`./configurations/compare?left=${cfg.metadata.name}`}>
        <GitCompare className="mr-2 h-4 w-4" /> Compare
      </Link>
    </Button>
  </CardFooter>
</Card>
```

### 3e. HistoryConfigCard

Same shape as ActiveConfigCard but:

- `Card` border uses default `border` (not `border-success`).
- Version heading is `text-lg` (not `text-2xl`).
- Header label reads:
  - `Superseded {date}` when `cfg.spec.phase === "Deprecated"`
  - `Retired {date}` when `cfg.spec.phase === "Retired"`
- Footer actions: `View`, `Compare`. Omit `Rollback` and `Export` —
  neither has API support yet (see §6).

---

## 4. Phase badge mapping

Single helper used everywhere a config phase is displayed. Place in
`ui/app/lib/format.ts` if it does not already exist.

```ts
export function phaseBadgeProps(phase: string) {
  switch (phase) {
    case "Draft":      return { variant: "secondary",   label: "Draft" };       // grey/muted
    case "Published":  return { variant: "success",     label: "Active" };      // green — UI label differs from spec value
    case "Deprecated": return { variant: "warning",     label: "Superseded" };  // yellow
    case "Retired":    return { variant: "destructive", label: "Retired" };     // red
    default:           return { variant: "outline",     label: phase };
  }
}
```

The Active group renders the badge label as `Active` (matches the
Pencil design's `ACTIVE` badge) even though the API value is
`Published`. The History cards render `Superseded` / `Retired`.

---

## 5. Empty-state copy

| State                                      | Copy                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| No configs at all                          | Heading: `No configurations yet`. Body: `This service has no published configuration. Create the first version to publish meters and monitored resource types.` CTA: `New configuration` (disabled placeholder, see §2). |
| `Active` group empty, history non-empty    | Render a single muted `<Card>` with body `No active configuration. The latest published version was retired.`         |
| `Version history` empty, active non-empty  | Hide the entire `Version history` section (do not render the heading or an empty card).                              |
| Drafts banner with no other configs        | Banner renders above an `Active` empty state; do not duplicate the message.                                          |

---

## 6. Gap analysis vs. Pencil design

The Pencil mockup contains fields and actions our API does not surface
yet. Omit them entirely — do not stub.

| Pencil element                                              | Status      | Reason                                                               |
| ----------------------------------------------------------- | ----------- | -------------------------------------------------------------------- |
| `v3.0.0`                                                    | Render      | `spec.version`                                                       |
| `Active` / `Superseded` badge                               | Render      | `spec.phase` via `phaseBadgeProps`                                   |
| `Activated Feb 27, 2026`                                    | Render      | `status.publishedAt`                                                 |
| `by provider-admin@datum.cloud`                             | **Omit**    | No auth/user identity captured in CRD status                          |
| Free-text release notes paragraph                           | **Omit**    | No description field on `ServiceConfiguration`                       |
| `2 dependencies`, `2 roles`, `2 quota`, `2 billing`         | **Omit**    | Not in API surface                                                   |
| `2 monitored resource types`, `N meters`                    | Render      | `spec.monitoredResourceTypes.length`, `spec.meters.length`           |
| `142 entitlements on this configuration`                    | **Omit**    | Runtime/usage data not exposed                                       |
| `(was active 26 days)`                                      | **Omit**    | Would require computing from next version's `publishedAt`; defer     |
| `Rollback` action                                           | **Omit**    | No rollback endpoint; controller manages phase transitions only      |
| `Export` action                                             | **Omit**    | No export endpoint                                                   |
| `Activate` button on pending banner                         | **Disabled** | Render so the layout matches the design; tooltip: `Coming soon`.    |

---

## 7. Loader contract

`services.$name.tsx` already loads the `Service`. Extend the loader to
fetch the matching configurations:

```ts
const configs = await fetchK8s<ServiceConfigurationList>(
  request,
  "/apis/services.miloapis.com/v1alpha1/serviceconfigurations",
);
const mine = configs.items.filter(
  (c) => c.spec.serviceRef.name === params.name,
);
```

Then bucket in the route module before rendering:

```ts
const drafts     = mine.filter(c => c.spec.phase === "Draft");
const published  = mine.filter(c => c.spec.phase === "Published")
                       .sort(byPublishedAtDesc);
const history    = mine.filter(c => c.spec.phase === "Deprecated" || c.spec.phase === "Retired")
                       .sort(byPublishedAtDesc);
```

`byPublishedAtDesc` compares `status.publishedAt`, falling back to
`metadata.creationTimestamp` when absent (so unpublished Drafts still
sort sensibly).

---

## 8. Acceptance checklist (for ui-engineer)

- [ ] Loader returns `{ service, drafts, published, history }`.
- [ ] Pending banner only shows when `drafts.length > 0`.
- [ ] Active group renders one card per Published config; green border.
- [ ] History group hidden when empty.
- [ ] Each card links to `./configurations/<metadata.name>` on `View
      details` / `View`.
- [ ] `Compare` links to `./configurations/compare?left=<name>` (target
      route lands in task #8).
- [ ] No `Response.json()` anywhere; loader uses `import { json } from
      "@remix-run/node"`.
- [ ] All `@datum-cloud/datum-ui` imports use subpaths.
- [ ] `phaseBadgeProps` is the single source of truth for phase →
      variant/label mapping.
