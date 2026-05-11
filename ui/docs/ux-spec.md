# UX Specification — Milo Service Catalog UI

> Version: v0.3 | Status: Ready for implementation | Scope: Read-only initial iteration

---

## 1. Overview

The Milo Service Catalog UI is a read-only Remix web application that surfaces
the two cluster-scoped governance resources managed by the `milo-os/services`
Kubernetes operator: `Service` and `ServiceConfiguration`. It is aimed at
**platform engineers and service providers** who need to inspect the catalog of
managed services, their lifecycle phases, and the billing/observability
configuration attached to each service. All screens are read-only; there are no
create, edit, or delete flows in this iteration.

---

## 2. Component Library Reference

All components come from `@datum-cloud/datum-ui`. Use the exact export names
listed below — do not invent component names.

### Base Components

| Export name | Notes |
|---|---|
| `Badge` | Props: `type` (primary \| secondary \| tertiary \| quaternary \| info \| warning \| danger \| success \| muted), `theme` (solid \| outline \| light) |
| `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `CardFooter` | `Card` uses `data-slot="card"` |
| `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | Re-exports from `@repo/shadcn/ui/collapsible` |
| `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | Re-exports from `@repo/shadcn/ui/table` |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `TabsLinkTrigger` | Radix Tabs with optional link integration |
| `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` | Re-exports from `@repo/shadcn/ui/breadcrumb` |
| `Button` | Props: `type`, `theme`, `size`, `block` |
| `Separator` | Re-exports from `@repo/shadcn/ui/separator` |
| `Skeleton` | Re-exports from `@repo/shadcn/ui/skeleton` |

### Feature Components

| Export name | Notes |
|---|---|
| `AppSidebar` | Props: `navItems`, `title`, `currentPath`, `linkComponent`, `closeOnNavigation`, `defaultOpen` |
| `NavMain` | Props: `items: NavItem[]`, `currentPath`, `linkComponent`, `overrideState`, `closeOnNavigation` |
| `SidebarProvider` | Props: `defaultOpen`, `expandBehavior`, `expandOnHover`, `showBackdrop` |
| `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarInset`, `SidebarTrigger`, `SidebarSeparator` | All sidebar sub-components |
| `EmptyContent` | Props: `title`, `subtitle`, `variant` (default \| dashed \| minimal), `size` (xs \| sm \| md \| lg \| xl), `orientation`, `actions`, `userName`, `linkComponent`. **Important:** the component always renders the title as `"Hey {userName ?? 'there'}, {title}"`. Do not include a greeting in `title` — it will be doubled. |
| `PageTitle` | Props: `title`, `description`, `actions`, `actionsPosition` (inline \| bottom) |

---

## 3. Navigation Structure

### Sidebar

Use `AppSidebar` inside a `SidebarProvider` in the root layout. The sidebar
shows a single **Catalog** group with two flat link items.

#### NavItem array

```ts
const navItems: NavItem[] = [
  {
    title: "Services",
    href: "/services",
    type: "link",
    icon: BoxIcon,           // from lucide-react
  },
  {
    title: "Configurations",
    href: "/service-configurations",
    type: "link",
    icon: SlidersIcon,       // from lucide-react
  },
]
```

Pass these inside a group to get the "Catalog" section label:

```ts
const navItems: NavItem[] = [
  {
    title: "Catalog",
    href: null,
    type: "group",
    children: [
      { title: "Services",       href: "/services",                type: "link", icon: BoxIcon },
      { title: "Configurations", href: "/service-configurations",  type: "link", icon: SlidersIcon },
    ],
  },
]
```

#### Root layout shell

```
SidebarProvider
  AppSidebar
    props:
      title="Service Catalog"
      navItems={navItems}
      currentPath={useLocation().pathname}
      linkComponent={Link}       ← Remix Link
      collapsible="offcanvas"
  SidebarInset
    <header>  ← breadcrumb bar (see §3.1)
    <Outlet />
```

### 3.1 Breadcrumb Bar

Place a `Breadcrumb` at the top of `SidebarInset`, outside the per-route
`<Outlet>`, above the first page title. Include a `SidebarTrigger` to the left
of the breadcrumbs on smaller viewports.

| Route | Breadcrumb path |
|---|---|
| `/services` | Home / Services |
| `/services/:name` | Home / Services / `{spec.displayName \|\| metadata.name}` |
| `/service-configurations` | Home / Service Configurations |
| `/service-configurations/:name` | Home / Service Configurations / `{metadata.name}` |

Required nesting structure — `BreadcrumbItem` elements must be wrapped in `BreadcrumbList`:

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink asChild><Link to="/">Home</Link></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink asChild><Link to="/services">Services</Link></BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{displayName || name}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

- "Home" and intermediate segments use `BreadcrumbLink`.
- The final segment uses `BreadcrumbPage` (not a link, announces current page to screen readers).
- Use `BreadcrumbSeparator` between every pair of items.

---

## 4. Phase Badge Color Mapping

All `spec.phase` values are rendered as a `Badge` component.

| Phase | `type` prop | `theme` prop | Visual intent |
|---|---|---|---|
| `Draft` | `"muted"` | `"solid"` | Grey/neutral |
| `Published` | `"success"` | `"light"` | Green |
| `Deprecated` | `"warning"` | `"light"` | Amber/yellow |
| `Retired` | `"danger"` | `"light"` | Red |

Helper functions:

```ts
function phaseBadgeType(phase: string): BadgeProps["type"] {
  const map: Record<string, BadgeProps["type"]> = {
    Draft: "muted",
    Published: "success",
    Deprecated: "warning",
    Retired: "danger",
  }
  return map[phase] ?? "muted"
}

function phaseBadgeTheme(phase: string): BadgeProps["theme"] {
  return phase === "Draft" ? "solid" : "light"
}
```

Usage:

```tsx
<Badge type={phaseBadgeType(phase)} theme={phaseBadgeTheme(phase)}>
  {phase}
</Badge>
```

---

## 5. Date & Age Formatting

| Context | Format | Source field |
|---|---|---|
| Published At (detail views) | `new Date(ts).toLocaleDateString()` — e.g. `5/5/2026` | `status.publishedAt` |
| Age (table columns) | Short relative form: `"3d"`, `"2h"`, `"45m"` | `metadata.creationTimestamp` |

When `status.publishedAt` is absent or null render `—` (em dash).

If `spec.phase` is not `"Published"`, render `status.publishedAt` as `—` even
if the field is populated — a non-published service should not display a
published timestamp.

Age helper:

```ts
function relativeAge(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
```

---

## 6. Common States

These states apply to every route.

### Loading

Show a skeleton that mirrors the expected layout:

- **List routes** — render the `TableHeader` with correct column headings, then
  5 `TableRow` elements each containing `TableCell` children holding
  `<Skeleton className="h-4 w-full" />`.
- **Detail routes** — render two `Card` skeleton blocks: one with three
  `Skeleton` line blocks (label + value pairs), one smaller block.

### Error

Render a `Card` with:

- `CardHeader` > `CardTitle` = `"Failed to load data"`
- `CardContent` = error message string
- A `Button` labeled `"Retry"` that reloads the current URL. Use `type="secondary" theme="outline"` on the datum-ui `Button` (not a `variant` prop — datum-ui Button uses `type` + `theme`, not `variant`).

### Empty state

Use the `EmptyContent` component. Each route has specific copy (see per-route
sections and §12 reference table).

---

## 7. Page Layout Pattern

Every route body (rendered inside `<Outlet>`) follows this structure:

```
<div className="flex flex-col gap-6 px-6 py-6">
  <PageTitle title="..." description="..." actionsPosition="inline" />
  {/* route-specific content */}
</div>
```

The `PageTitle` component renders the title as a `text-2xl font-medium` span
and the description as a `text-sm font-normal` div. No action buttons are
needed in this release.

---

## 8. Route: `/services` — Service List

**Remix file:** `app/routes/services._index.tsx`

**Purpose:** Lists all `Service` cluster-scoped resources.

### 8.1 Loader

1. Fetch `GET /apis/services.miloapis.com/v1alpha1/services` — return
   `ServiceList.items`.
2. Fetch `GET /apis/services.miloapis.com/v1alpha1/serviceconfigurations` —
   return `ServiceConfigurationList.items` (used to compute CFGS count;
   see §8.3).

Both fetches can run in parallel (`Promise.all`). If the configurations fetch
fails, return an empty array and record the failure so the column shows `—`.

### 8.2 Table column definitions

| # | Header label | Source field | Width guidance | Rendering |
|---|---|---|---|---|
| 1 | Name | `metadata.name` | 25% | `<Link to="/services/{metadata.name}">{metadata.name}</Link>` |
| 2 | Service Name | `spec.serviceName` | 20% | Plain text |
| 3 | Phase | `spec.phase` | 12% | `Badge` (see §4) |
| 4 | Configurations | Computed (§8.3) | 12% | Count or loading/error fallback |
| 5 | Age | `metadata.creationTimestamp` | 16% | `relativeAge()` helper |
| 6 | Owner | `spec.owner.producerProjectRef.name` | 15% | Plain text; `—` when absent |

### 8.3 Configurations count (partial-data column)

The Configurations count is computed **client-side** by grouping all
`ServiceConfiguration` objects by `spec.serviceRef.name` after both lists have
loaded.

| Scenario | Cell content |
|---|---|
| ServiceConfiguration list is still loading | `<Skeleton className="w-8 h-4 rounded" />` |
| ServiceConfiguration list loaded, 0 matches | `0` (plain text, not a link) |
| ServiceConfiguration list loaded, N > 0 matches | `{N}` (plain number, not a link) |
| ServiceConfiguration list fetch failed | `—` (no per-row error message) |

### 8.4 Empty state

When `ServiceList.items` is empty:

```tsx
<EmptyContent
  title="no services have been registered yet."
  subtitle="Services define the canonical catalog entries for provider APIs."
  size="lg"
/>
```

This renders as: **"Hey there, no services have been registered yet."** — the
`EmptyContent` component always prepends the greeting. Do not include greeting
text in the `title` prop.

No action buttons.

### 8.5 Component tree

```
services._index.tsx
└── <div className="flex flex-col gap-6 px-6 py-6">
      ├── PageTitle title="Services" description="Cluster-scoped governance catalog entries for provider-registered services."
      ├── [loading] → skeleton table (see §6)
      ├── [error]   → error Card
      ├── [empty]   → EmptyContent (§8.4)
      └── Table
            ├── TableHeader > TableRow
            │     ├── TableHead "Name"
            │     ├── TableHead "Service Name"
            │     ├── TableHead "Phase"
            │     ├── TableHead "Configurations"
            │     ├── TableHead "Age"
            │     └── TableHead "Owner"
            └── TableBody
                  └── TableRow  (one per Service)
                        ├── TableCell → Link to /services/{metadata.name}
                        ├── TableCell spec.serviceName
                        ├── TableCell → Badge for spec.phase
                        ├── TableCell → count | Skeleton | "—" (§8.3)
                        ├── TableCell relativeAge(metadata.creationTimestamp)
                        └── TableCell spec.owner.producerProjectRef.name || "—"
```

---

## 9. Route: `/services/:name` — Service Detail

**Remix file:** `app/routes/services.$name.tsx`

**Purpose:** Full detail view for a single `Service`.

### 9.1 Loader

Fetch `GET /apis/services.miloapis.com/v1alpha1/services/{name}`.

### 9.2 Page title

`PageTitle` with `title={spec.displayName || metadata.name}` and
`description={spec.description}`.

### 9.3 Tabs

Only the **Overview** tab is in scope. Render a `Tabs` shell with a single
`TabsTrigger` so a second tab can be added later without restructuring.

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* see §9.4 */}
  </TabsContent>
</Tabs>
```

### 9.4 Overview tab layout

Two `Card` blocks stacked vertically with `gap-6`.

#### Details card

`Card` > `CardHeader` > `CardTitle` ("Details") + `CardContent`

Display fields in a two-column definition-list grid
(`grid grid-cols-2 gap-x-8 gap-y-3`). The Description field spans both columns
(`col-span-2`) and sits below the grid.

| Label | Source field | Rendering |
|---|---|---|
| Service Name | `spec.serviceName` | Monospace text |
| Display Name | `spec.displayName` | Plain text; `—` when absent |
| Phase | `spec.phase` | `Badge` (§4) |
| Owner Project | `spec.owner.producerProjectRef.name` | Plain text; `—` when absent |
| Published At | `status.publishedAt` | Formatted date (§5); `—` when absent or non-Published phase |
| Description | `spec.description` | Full-width (`col-span-2`); preserves line breaks; `—` when absent |

#### Conditions card

`Card` > `CardHeader` > `CardTitle` ("Conditions") + `CardContent`

When `status.conditions` is empty or undefined:

```tsx
<EmptyContent
  title="no conditions reported."
  subtitle="Conditions will appear here once the controller has reconciled this resource."
  size="sm"
  variant="minimal"
/>
```

When conditions are present, render a `Table`:

| Header | Source field | Rendering |
|---|---|---|
| Type | `condition.type` | Plain text |
| Status | `condition.status` | `"True"` → `Badge type="success" theme="light"`; `"False"` → `Badge type="danger" theme="light"`; `"Unknown"` → `Badge type="muted" theme="light"` |
| Reason | `condition.reason` | Plain text; `—` when absent |
| Message | `condition.message` | Plain text; truncated to 80 characters; full text in `title` attribute |
| Last Transition | `condition.lastTransitionTime` | `relativeAge()` helper |

### 9.5 Component tree (overview tab)

```
services.$name.tsx
└── <div className="flex flex-col gap-6 px-6 py-6">
      ├── PageTitle title={spec.displayName || metadata.name} description={spec.description}
      ├── [loading] → skeleton detail cards (see §6)
      ├── [error]   → error Card
      └── Tabs defaultValue="overview"
            ├── TabsList > TabsTrigger value="overview" "Overview"
            └── TabsContent value="overview"
                  └── <div className="flex flex-col gap-6">
                        ├── Card  (Details)
                        │     ├── CardHeader > CardTitle "Details"
                        │     └── CardContent
                        │           └── definition-list grid (§9.4)
                        └── Card  (Conditions)
                              ├── CardHeader > CardTitle "Conditions"
                              └── CardContent
                                    ├── [empty]  → EmptyContent size="sm" variant="minimal"
                                    └── [present] → Table with condition rows
```

---

## 10. Route: `/service-configurations` — ServiceConfiguration List

**Remix file:** `app/routes/service-configurations._index.tsx`

**Purpose:** Lists all `ServiceConfiguration` cluster-scoped resources.

### 10.1 Loader

Fetch `GET /apis/services.miloapis.com/v1alpha1/serviceconfigurations` — return
`ServiceConfigurationList.items`.

### 10.2 Table column definitions

| # | Header label | Source field | Width guidance | Rendering |
|---|---|---|---|---|
| 1 | Name | `metadata.name` | 28% | `<Link to="/service-configurations/{metadata.name}">{metadata.name}</Link>` |
| 2 | Service Ref | `spec.serviceRef.name` | 28% | Plain text |
| 3 | Phase | `spec.phase` | 14% | `Badge` (§4) |
| 4 | Age | `metadata.creationTimestamp` | 15% | `relativeAge()` helper |
| 5 | Meters | `spec.meters.length` | 15% | Count of items; `0` when array absent or empty |

### 10.3 Empty state

```tsx
<EmptyContent
  title="no service configurations found."
  subtitle="Configurations attach meters and monitored resource types to a registered service."
  size="lg"
/>
```

### 10.4 Component tree

```
service-configurations._index.tsx
└── <div className="flex flex-col gap-6 px-6 py-6">
      ├── PageTitle title="Service Configurations" description="Cluster-scoped configurations that bind meters and monitored resource types to a service."
      ├── [loading] → skeleton table
      ├── [error]   → error Card
      ├── [empty]   → EmptyContent (§10.3)
      └── Table
            ├── TableHeader > TableRow
            │     ├── TableHead "Name"
            │     ├── TableHead "Service Ref"
            │     ├── TableHead "Phase"
            │     ├── TableHead "Age"
            │     └── TableHead "Meters"
            └── TableBody
                  └── TableRow  (one per ServiceConfiguration)
                        ├── TableCell → Link to /service-configurations/{metadata.name}
                        ├── TableCell spec.serviceRef.name
                        ├── TableCell → Badge for spec.phase
                        ├── TableCell relativeAge(metadata.creationTimestamp)
                        └── TableCell (spec.meters?.length ?? 0)
```

---

## 11. Route: `/service-configurations/:name` — ServiceConfiguration Detail

**Remix file:** `app/routes/service-configurations.$name.tsx`

**Purpose:** Full detail view for a single `ServiceConfiguration`.

### 11.1 Loader

Fetch `GET /apis/services.miloapis.com/v1alpha1/serviceconfigurations/{name}`.

### 11.2 Page title

`PageTitle` with `title={metadata.name}` and
`description={"Configuration for " + spec.serviceRef.name}`.

### 11.3 Tabs

Same single-tab `Tabs` shell as the Service detail page, with a single
`TabsTrigger value="overview"` labeled **Overview**.

### 11.4 Overview tab layout

Three sections stacked vertically with `gap-6`:

1. **Details card**
2. **Meters collapsible section**
3. **Monitored Resource Types collapsible section**

#### Details card

`Card` > `CardHeader` > `CardTitle` ("Details") + `CardContent`

| Label | Source field | Rendering |
|---|---|---|
| Service Ref | `spec.serviceRef.name` | `<Link to="/services/{spec.serviceRef.name}">{spec.serviceRef.name}</Link>` |
| Phase | `spec.phase` | `Badge` (§4) |

#### Meters collapsible section

Wrap the entire meters section in a `Card`. Inside the `Card`, place a
`Collapsible` as the sole child. The `Collapsible` contains two direct
children: a `CardHeader` (which contains the `CollapsibleTrigger`) and a
`CollapsibleContent` (which contains `CardContent`). This means the `Card`'s
default `flex-col gap-4` flow applies to the single `Collapsible` child, and
the `Collapsible` itself manages the header+body layout.

```tsx
<Card>
  <Collapsible open={metersOpen} onOpenChange={setMetersOpen} defaultOpen>
    <CardHeader className="cursor-pointer select-none">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between w-full">
          <CardTitle>Meters ({count})</CardTitle>
          <ChevronDown className={cn("size-4 transition-transform duration-200", metersOpen && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
    </CardHeader>
    <CollapsibleContent>
      <CardContent>
        {/* EmptyContent or meter cards */}
      </CardContent>
    </CollapsibleContent>
  </Collapsible>
</Card>
```

- `count` is `spec.meters?.length ?? 0`.
- Default state: **expanded** (`defaultOpen` on `Collapsible` + `useState(true)` for controlled `open`).
- While the resource is loading and count is unknown: render `<CardTitle>Meters <Skeleton className="inline-block w-6 h-4 ml-1 align-middle" /></CardTitle>`.
- When count is 0: render `<CardTitle>Meters (0)</CardTitle>` and show the empty state inside `CardContent`.
- Note: `CardTitle` renders a `<div>`, not a heading element — do not nest it inside `<h2>` or other block headings.

#### Monitored Resource Types collapsible section

Same `Card` > `Collapsible` > [`CardHeader` (with trigger), `CollapsibleContent` > `CardContent`] structure as Meters. Default state: **expanded**.

- Title text: `"Monitored Resource Types ({count})"` where count is `spec.monitoredResourceTypes?.length ?? 0`.

### 11.5 Empty states

**Meters section (zero meters):**

```tsx
<EmptyContent
  title="no meters configured."
  subtitle="Meters define the measurable units of consumption for this service configuration."
  size="sm"
  variant="minimal"
/>
```

**Monitored Resource Types section (zero entries):**

```tsx
<EmptyContent
  title="no monitored resource types configured."
  subtitle="Monitored resource types declare the GVK-based resources this configuration tracks."
  size="sm"
  variant="minimal"
/>
```

### 11.6 Meter cards

Each meter in `spec.meters[]` is rendered as a nested `Card` inside the
Meters `CollapsibleContent`. Stack meter cards with `gap-4` and apply
`className="border-l-4 border-l-border"` for visual nesting.

`Card` > `CardHeader` > `CardTitle` = `{meter.displayName || meter.name}` + `CardContent`

Inside `CardContent`, definition-list grid (`grid grid-cols-2 gap-x-8 gap-y-3`):

| Label | Source field | Rendering |
|---|---|---|
| Name | `meter.name` | Monospace text |
| Display Name | `meter.displayName` | Plain text; `—` when absent |
| Description | `meter.description` | Full-width (`col-span-2`); `—` when absent |
| Aggregation | `meter.measurement.aggregation` | Plain text |
| Unit | `meter.measurement.unit` | Plain text |
| Consumed Unit | `meter.billing.consumedUnit` | Plain text; `—` when absent |
| Pricing Unit | `meter.billing.pricingUnit` | Plain text; `—` when absent |

If `meter.monitoredResourceTypes` is non-empty, render a sub-heading
`<p className="text-sm font-medium mt-4">Monitored Resource Types</p>` followed
by a flex-wrap chip list: one `<Badge type="muted" theme="light">` per entry
in the array.

### 11.7 Monitored Resource Type cards

Each entry in `spec.monitoredResourceTypes[]` is rendered as a nested `Card`
inside the MRT `CollapsibleContent`. Stack with `gap-4`, same visual nesting
style.

`Card` > `CardHeader` > `CardTitle` = `{mrt.displayName || mrt.type}` + `CardContent`

Inside `CardContent`, definition-list grid:

| Label | Source field | Rendering |
|---|---|---|
| Type | `mrt.type` | Monospace text |
| Display Name | `mrt.displayName` | Plain text; `—` when absent |
| Description | `mrt.description` | Full-width (`col-span-2`); `—` when absent |
| GVK Group | `mrt.gvk.group` | Monospace text; `—` when absent |
| GVK Kind | `mrt.gvk.kind` | Monospace text; `—` when absent |

If `mrt.labels` is non-empty, render a sub-heading
`<p className="text-sm font-medium mt-4">Labels</p>` followed by a flex-wrap
chip list: one `<Badge type="muted" theme="light">` per label entry. The badge
text is `label.name`.

### 11.8 Collapsible section trigger behavior

The `CollapsibleTrigger` is placed inside `CardHeader` with `asChild` so the
entire header row acts as the toggle target. Use `ChevronDown` from
`lucide-react` with a rotation transition:

```tsx
<ChevronDown
  className={cn(
    "size-4 transition-transform duration-200",
    isOpen && "rotate-180"
  )}
/>
```

Track state with `const [isOpen, setIsOpen] = useState(true)` (default
expanded). Pass `open={isOpen} onOpenChange={setIsOpen}` to `Collapsible`.
Do not rely solely on the uncontrolled `defaultOpen` prop — use both so the
chevron icon stays in sync with the open/closed state.

### 11.9 Component tree (overview tab)

```
service-configurations.$name.tsx
└── <div className="flex flex-col gap-6 px-6 py-6">
      ├── PageTitle title={metadata.name} description={"Configuration for " + spec.serviceRef.name}
      ├── [loading] → skeleton detail cards
      ├── [error]   → error Card
      └── Tabs defaultValue="overview"
            ├── TabsList > TabsTrigger value="overview" "Overview"
            └── TabsContent value="overview"
                  └── <div className="flex flex-col gap-6">
                        │
                        ├── Card  (Details)
                        │     ├── CardHeader > CardTitle "Details"
                        │     └── CardContent > definition-list grid (§11.4)
                        │
                        ├── Card  (Meters collapsible)
                        │     └── Collapsible open={metersOpen} onOpenChange={setMetersOpen} defaultOpen
                        │           ├── CardHeader > CollapsibleTrigger
                        │           │     └── <div flex items-center justify-between>
                        │           │           ├── CardTitle "Meters ({n})"
                        │           │           └── ChevronDown (rotates when open)
                        │           └── CollapsibleContent
                        │                 └── CardContent
                        │                       ├── [empty] EmptyContent size="sm" variant="minimal"
                        │                       └── <div className="flex flex-col gap-4">
                        │                             └── Card (per meter) (§11.6)
                        │
                        └── Card  (Monitored Resource Types collapsible)
                              └── Collapsible open={mrtOpen} onOpenChange={setMrtOpen} defaultOpen
                                    ├── CardHeader > CollapsibleTrigger
                                    │     └── <div flex items-center justify-between>
                                    │           ├── CardTitle "Monitored Resource Types ({n})"
                                    │           └── ChevronDown (rotates when open)
                                    └── CollapsibleContent
                                          └── CardContent
                                                ├── [empty] EmptyContent size="sm" variant="minimal"
                                                └── <div className="flex flex-col gap-4">
                                                      └── Card (per MRT) (§11.7)
```

---

## 12. Empty State Copy Reference

| Route / context | `title` prop | `subtitle` prop |
|---|---|---|
| `/services` — no services | `"no services have been registered yet."` | `"Services define the canonical catalog entries for provider APIs."` |
| `/services/:name` — no conditions | `"no conditions reported."` | `"Conditions will appear here once the controller has reconciled this resource."` |
| `/service-configurations` — no configurations | `"no service configurations found."` | `"Configurations attach meters and monitored resource types to a registered service."` |
| `/service-configurations/:name` — no meters | `"no meters configured."` | `"Meters define the measurable units of consumption for this service configuration."` |
| `/service-configurations/:name` — no MRTs | `"no monitored resource types configured."` | `"Monitored resource types declare the GVK-based resources this configuration tracks."` |

---

## 13. Typography and Spacing Conventions

- Page-level container: `className="flex flex-col gap-6 px-6 py-6"` inside `SidebarInset`.
- `PageTitle` sits immediately below the breadcrumb bar; `gap-6` between it and the first content element is handled by the flex container.
- `Card` uses default datum-ui styles — do not override the default `className` unless strictly needed.
- Definition-list grid inside cards: `grid grid-cols-2 gap-x-8 gap-y-3`.
- `dt` elements: `className="text-sm font-medium text-muted-foreground"`.
- `dd` elements: `className="text-sm text-foreground"`.
- Full-width fields (Description): `col-span-2` on the `dd`, or wrap both `dt` and `dd` in a `col-span-2` block.
- Nested meter/MRT cards: `className="border-l-4 border-l-border"` to visually distinguish from the outer card.
- Collapsible `CardHeader`: `className="cursor-pointer select-none"`.

---

## 14. Scope and Constraints

- **Read-only:** No create, edit, or delete flows. All Remix `loader` functions are GET-only; no `action` functions are needed.
- **Cluster-scoped resources:** `Service` and `ServiceConfiguration` are cluster-scoped CRDs. API paths do not include a namespace segment.
- **API group:** `services.miloapis.com/v1alpha1`. Base URL: `/apis/services.miloapis.com/v1alpha1/{resource}`.
- **No pagination in v0.1:** Fetch the full list on each load.
- **No search or filter controls in v0.1:** Tables render all returned items.
- **Phase is spec-driven:** `spec.phase` is the provider-declared lifecycle intent; it is not derived from `status.conditions`.
- **Excluded features:** Provider Dashboard, Adoption metrics, Activity feed, IAM, Quota management, Release Notes — do not add navigation links or routes for these.
