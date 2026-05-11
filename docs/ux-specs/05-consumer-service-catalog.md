# UX Spec — Consumer Service Catalog

**Pencil node:** `yke71` (frame "Consumer - Service Catalog")
**Implements task:** #10
**Route:** `catalog._index.tsx`

---

## 1. Purpose

Card grid of `Published` services for consumers to browse. Distinct
from the producer-facing `/services` list (which shows every phase).
Clicking a card navigates to the same service detail route used by
producers; the detail page already gates write actions by phase.

| What lives here       | Decision                                              |
| --------------------- | ----------------------------------------------------- |
| Visible services      | Only `spec.phase === "Published"`                     |
| Sort order            | `spec.displayName` ascending, locale-aware            |
| Search                | Client-side, case-insensitive, against `displayName` + `serviceName` + `description` |
| Filter chips          | **Omit** (no categories field in API — see §5)        |
| Grid/list toggle      | **Omit** (no list view — keep grid only)              |
| Empty state           | "No services available yet"                           |
| Card click target     | `/services/<metadata.name>`                           |
| `Enable` CTA          | **Omit** (no entitlement API — see §5)                |

---

## 2. Page chrome

```tsx
import { Input } from "@datum-cloud/datum-ui/input";
import { Search } from "lucide-react";
```

```
<div className="flex flex-col gap-10 px-16 py-12">
  <header className="flex flex-col gap-2">
    <h1 className="text-5xl font-bold tracking-tight">Service catalog</h1>
    <p className="text-base text-muted-foreground">
      Browse services published for your projects.
    </p>
  </header>

  <div className="relative max-w-sm">
    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="search"
      placeholder="Search services…"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      className="pl-9"
    />
  </div>

  <Grid services={filtered} />
</div>
```

`query` is a `useState` string; filtering is in-memory in the
component. We do not push the search to URL params in v1 — the list
is small and refresh resets to all services.

---

## 3. Card grid

```tsx
import { Badge } from "@datum-cloud/datum-ui/badge";
import { Card, CardContent, CardHeader } from "@datum-cloud/datum-ui/card";
import { Server } from "lucide-react";
```

```
<ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
  {services.map((s) => (
    <li key={s.metadata.uid}>
      <Link
        to={`/services/${s.metadata.name}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      >
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Server className="h-5 w-5" />
            </div>
            <Badge variant="success">Published</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-base font-semibold">{s.spec.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              by {s.spec.owner?.producerProjectRef?.name ?? "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {s.spec.description || "No description provided."}
            </p>
          </CardContent>
        </Card>
      </Link>
    </li>
  ))}
</ul>
```

### Responsive grid columns

| Breakpoint        | Columns |
| ----------------- | ------- |
| `< md` (mobile)   | 1       |
| `md` (≥ 768px)    | 2       |
| `xl` (≥ 1280px)   | 3       |

The Pencil mockup shows 3 columns at the design width (1440px); the
breakpoints above keep the cards from getting too narrow on tablet.

### Card fields

| Field                                     | Source                                                    |
| ----------------------------------------- | --------------------------------------------------------- |
| Icon (placeholder server icon)            | hard-coded `Server` lucide icon — see §5                  |
| Phase badge (top-right)                   | Always `Published` badge — only published services here   |
| Title                                     | `spec.displayName`                                        |
| `by <provider>`                           | `spec.owner.producerProjectRef.name`                      |
| Description                               | `spec.description` (≤ 3 lines via `line-clamp-3`)         |

The card has no footer / CTA. The whole card is the link target.

---

## 4. Empty states

| State                        | Copy                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| No published services exist  | Heading: `No services available yet.` Body: `Services appear here once a provider publishes them.`              |
| Search returns zero results  | Heading: `No matches for "<query>".` Body: `Try a different search or clear the filter.` Render a Clear button. |

The empty state is rendered in the same column flow as the grid (do
not collapse the grid — render a single full-width centered card).

---

## 5. Gap analysis vs. Pencil design

| Pencil element                                     | Status   | Reason                                                              |
| -------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| Page title `Service Catalog` + subtitle            | Render   | Simple text                                                         |
| Search input                                       | Render   | Filters client-side                                                 |
| Filter chips: All / Compute / Storage / Networking / Security / AI/ML | **Omit** | No `categories` field on `Service`                  |
| Grid/list view toggle (top right of filter bar)    | **Omit** | Single grid view                                                    |
| Per-card distinct icon (cpu, hard-drive, brain, …) | **Omit** | No `icon` field on `Service`. Use one default `Server` icon for all. |
| `GA` badge on each card                            | **Replace** | Always `Published` (the only phase shown here). Use `Badge variant="success"`. |
| `by Provider Name` line                            | Render   | Uses `spec.owner.producerProjectRef.name`. Falls back to `Unknown`. |
| `ENABLE` primary CTA inside each card              | **Omit** | No entitlement API. Whole card links to detail instead.             |
| Notification bell + avatar in top nav              | **Omit** | Top nav not in scope for this work.                                  |

---

## 6. Loader contract

```ts
export async function loader({ request }: LoaderFunctionArgs) {
  const list = await fetchK8s<ServiceList>(
    request,
    "/apis/services.miloapis.com/v1alpha1/services",
  );
  const services = list.items
    .filter((s) => s.spec.phase === "Published")
    .sort((a, b) =>
      (a.spec.displayName ?? "").localeCompare(b.spec.displayName ?? "")
    );
  return json({ services });
}
```

- Always import `json` from `@remix-run/node` — never `Response.json()`.
- The route component does the in-memory search filter; the loader
  always returns every published service.

---

## 7. Navigation links

The catalog is reachable from the top nav (`Catalog` link). Add an
entry in `components/AppLayout.tsx` if it is not already there:

| Label    | Route       | Active match  |
| -------- | ----------- | ------------- |
| Catalog  | `/catalog`  | `/catalog*`   |
| Services | `/services` | `/services*`  |

Card click goes to `/services/<metadata.name>`. The shared service
detail page should remain the same — consumers see the same Overview
content as producers but write actions are gated by RBAC + phase.

---

## 8. Acceptance checklist (for ui-engineer)

- [ ] Route file is `catalog._index.tsx`.
- [ ] Loader returns only `Published` services, sorted by displayName ascending.
- [ ] Header and search input render at the page top; search is client-side.
- [ ] Grid uses 1 / 2 / 3 columns at the documented breakpoints.
- [ ] Each card is a `<Link>` to `/services/<metadata.name>` and reports correct keyboard focus styles.
- [ ] Cards render: placeholder icon, `Published` badge, displayName, `by <ownerProject>`, clamped description.
- [ ] Empty state copy renders correctly when there are no services and when search yields zero matches; the latter shows a Clear button.
- [ ] Top nav has a `Catalog` entry that highlights when the route matches.
- [ ] All `@datum-cloud/datum-ui` imports use subpaths.
- [ ] No `Response.json()` anywhere.
