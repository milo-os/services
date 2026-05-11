# Manual Smoke-Test Plan — Milo Service Catalog UI

> Version: v0.1 | Status: Read-only initial iteration | Audience: anyone validating
> a fresh build of the `milo-os/services` Remix UI against a live or kind cluster.

This checklist covers the read-only screens delivered in the initial iteration:
two list routes, two detail routes, a health probe, and the cross-cutting
visual conventions (phase badges, empty states). It is intended for a manual
walk-through. Automated coverage lives under `ui/e2e/` (see Playwright section
in `validation-report.md`).

---

## 0. Pre-flight

| # | Check | Pass criteria |
|---|---|---|
| 0.1 | `kubectl config current-context` returns a kind context bound to a Milo cluster with the `services.miloapis.com/v1alpha1` CRDs installed. | `Service` and `ServiceConfiguration` CRDs are listable: `kubectl get services.services.miloapis.com` and `kubectl get serviceconfigurations.services.miloapis.com` both return without error. |
| 0.2 | `KUBECONFIG` (or default `~/.kube/config`) is readable by the user that will run `task ui:dev`. | No permission errors when running `kubectl auth can-i list services.services.miloapis.com -A`. |
| 0.3 | `pnpm` is installed and available on `PATH`. | `pnpm --version` returns a version. |

If any pre-flight item fails, stop here — the dev server cannot proxy to the
API server without these.

---

## 1. Dev server startup — `task ui:dev`

| # | Step | Pass criteria |
|---|---|---|
| 1.1 | From the repo root run `task ui:dev`. | Task installs deps (first run) and starts the Remix Vite dev server. |
| 1.2 | Watch the terminal output. | Server logs `Local: http://localhost:3000/` (or similar) and stays running with no kubeconfig errors. |
| 1.3 | Open `http://localhost:3000/health` in a browser or `curl`. | Response body is exactly `{"status":"ok"}` with HTTP 200. |
| 1.4 | Open `http://localhost:3000/`. | The root layout renders without error: sidebar with **Catalog** group containing **Services** and **Configurations** links is visible. |

---

## 2. `/services` — Service list

| # | Step | Pass criteria |
|---|---|---|
| 2.1 | Click **Services** in the sidebar (or visit `/services`). | URL is `/services`. Page heading reads **Services**. Page description reads **"Cluster-scoped governance catalog entries for provider-registered services."** |
| 2.2 | Confirm the breadcrumb bar at the top reads `Home / Services`. | "Home" is a link; "Services" is the current page. |
| 2.3 | Inspect the table column headers. | Six columns in this order: **Name**, **Service Name**, **Phase**, **Configurations**, **Age**, **Owner**. |
| 2.4 | (If at least one `Service` exists) inspect a row. | Name cell is a link. Service Name is monospace. Phase is a `Badge` (see §5). Configurations cell shows an integer (or `—` if the configurations fetch failed). Age cell shows short relative form (`Nm`/`Nh`/`Nd`). Owner cell shows producer project name or `—`. |
| 2.5 | (If zero `Service` exists) inspect the empty state. | `EmptyContent` renders with greeting prefix: **"Hey there, no services have been registered yet."** Subtitle reads **"Services define the canonical catalog entries for provider APIs."** No action buttons. |

---

## 3. `/services/:name` — Service detail

> Skip this section if the cluster has zero `Service` resources. Apply
> `config/samples/` first or otherwise seed at least one.

| # | Step | Pass criteria |
|---|---|---|
| 3.1 | Click any row's Name link in `/services`. | URL becomes `/services/<metadata.name>`. |
| 3.2 | Inspect the page header. | Title is `spec.displayName` if set, else `metadata.name`. Description matches `spec.description`. Breadcrumb reads `Home / Services / <displayName-or-name>`. |
| 3.3 | Inspect the **Overview** tab shell. | A `Tabs` with a single trigger labeled **Overview** is present and selected. |
| 3.4 | Inspect the **Details** card. | Two-column grid with labels: **Service Name** (monospace), **Display Name**, **Phase** (Badge), **Owner Project**, **Published At**, **Description** (full-width). Absent values render `—`. |
| 3.5 | Confirm Published At rule. | When `spec.phase != "Published"`, the Published At cell renders `—` even if `status.publishedAt` is populated. |
| 3.6 | Inspect the **Conditions** card when `status.conditions` is empty. | `EmptyContent size="sm" variant="minimal"` reads **"Hey there, no conditions reported."** |
| 3.7 | Inspect the **Conditions** card when conditions are present. | Table with columns Type, Status, Reason, Message, Last Transition. Status renders as a colored badge (green True, red False, grey Unknown). Long messages truncate to ~80 chars; full text is in the cell `title` tooltip. |

---

## 4. `/service-configurations` — Configuration list

| # | Step | Pass criteria |
|---|---|---|
| 4.1 | Click **Configurations** in the sidebar (or visit `/service-configurations`). | URL is `/service-configurations`. Page heading reads **Service Configurations**. Description: **"Cluster-scoped configurations that bind meters and monitored resource types to a service."** |
| 4.2 | Inspect the breadcrumb bar. | Reads `Home / Service Configurations`. |
| 4.3 | Inspect the table column headers. | Five columns in this order: **Name**, **Service Ref**, **Phase**, **Age**, **Meters**. |
| 4.4 | (If at least one `ServiceConfiguration` exists) inspect a row. | Name cell is a link. Service Ref is monospace. Phase is a `Badge` (§5). Age in short relative form. Meters cell is an integer (`spec.meters?.length ?? 0`). |
| 4.5 | (If zero `ServiceConfiguration` exists) inspect the empty state. | Greeting prefix: **"Hey there, no service configurations found."** Subtitle: **"Configurations attach meters and monitored resource types to a registered service."** |

---

## 5. Phase badge color mapping

For each value of `spec.phase` you encounter on either list or detail page,
verify the rendered `Badge` matches:

| Phase | Type | Theme | Visual |
|---|---|---|---|
| `Draft` | `muted` | `solid` | Solid grey/neutral |
| `Published` | `success` | `light` | Light green |
| `Deprecated` | `warning` | `light` | Light amber/yellow |
| `Retired` | `danger` | `light` | Light red |

If a row's `spec.phase` is missing or unrecognised, the badge falls back to
`muted` solid and displays the raw value verbatim.

---

## 6. `/service-configurations/:name` — Configuration detail

> Skip this section if the cluster has zero `ServiceConfiguration` resources.

| # | Step | Pass criteria |
|---|---|---|
| 6.1 | Click any row's Name link in `/service-configurations`. | URL becomes `/service-configurations/<metadata.name>`. |
| 6.2 | Inspect the page header. | Title is `metadata.name`. Description is `"Configuration for <spec.serviceRef.name>"`. Breadcrumb reads `Home / Service Configurations / <name>`. |
| 6.3 | Inspect the **Overview** tab shell. | Single trigger labeled **Overview**, selected by default. |
| 6.4 | Inspect the **Details** card. | Two rows: **Service Ref** (link to `/services/<serviceRef.name>`) and **Phase** (Badge). |
| 6.5 | Inspect the **Meters** collapsible card. | Card title reads `Meters (N)` where N matches `spec.meters?.length ?? 0`. Default state is **expanded**. Click the header — chevron rotates 180° and content collapses. Click again — content re-expands and chevron rotates back. |
| 6.6 | (Meters > 0) inspect a meter card inside the section. | Nested card with `border-l-4 border-l-border` accent. Title is `meter.displayName || meter.name`. Definition list shows Name (monospace), Display Name, Description, Aggregation, Unit, Consumed Unit, Pricing Unit. Absent values render `—`. If `meter.monitoredResourceTypes` is non-empty, a **Monitored Resource Types** sub-heading is followed by chip badges (`type="muted" theme="light"`). |
| 6.7 | (Meters == 0) inspect the empty state. | Card title reads `Meters (0)`. Body: **"Hey there, no meters configured."** Subtitle: **"Meters define the measurable units of consumption for this service configuration."** |
| 6.8 | Inspect the **Monitored Resource Types** collapsible card. | Same toggle behavior as Meters. Title reads `Monitored Resource Types (N)`. |
| 6.9 | (MRTs > 0) inspect an MRT card. | Title is `mrt.displayName || mrt.type`. Definition list shows Type (monospace), Display Name, Description, GVK Group (monospace), GVK Kind (monospace). If `mrt.labels` is non-empty, a **Labels** sub-heading is followed by chip badges with the label name. |
| 6.10 | (MRTs == 0) inspect the empty state. | Title `Monitored Resource Types (0)`. Body: **"Hey there, no monitored resource types configured."** Subtitle: **"Monitored resource types declare the GVK-based resources this configuration tracks."** |

---

## 7. Cross-cutting checks

| # | Step | Pass criteria |
|---|---|---|
| 7.1 | Use the sidebar to navigate between Services and Configurations. | Active item is highlighted; routing is instant; no full-page reload. |
| 7.2 | Reload the page on any deep route (e.g. `/services/<name>`). | Page renders correctly via SSR — no flash of blank state, breadcrumb is correct on first paint. |
| 7.3 | Resize the viewport below the sidebar collapse breakpoint. | `SidebarTrigger` becomes visible; sidebar collapses off-canvas; content pane stays usable. |
| 7.4 | Tab through the page with the keyboard. | Sidebar links, breadcrumb links, table row links, and tab triggers are reachable in a sensible order; focus rings visible. |
| 7.5 | Force an API failure (e.g. stop kube-apiserver or revoke RBAC for the user) and reload `/services`. | Error `Card` titled **"Failed to load data"** renders with the error message and a Retry link/button that re-loads the route. |

---

## 8. Health probe

| # | Step | Pass criteria |
|---|---|---|
| 8.1 | `curl http://localhost:3000/health` while `task ui:dev` is running. | HTTP 200. Body is JSON `{"status":"ok"}`. Content-Type is `application/json`. |

---

## 9. New screens (v0.2 — under implementation)

> The following screens are being added by tasks #6–#10 and are not yet
> available in v0.1. Test cases are scaffolded here so the manual walk-through
> is ready as soon as the ui-engineer signals completion.

### 9.1 `/services/:name` Configurations tab — phase grouping (task #6)

| # | Step | Pass criteria |
|---|---|---|
| 9.1.1 | On `/services/<name>`, click the **Configurations** tab. | Tab becomes active. URL becomes `/services/<name>?tab=configurations` (the existing loader reads `?tab=` to select the active tab). |
| 9.1.2 | Inspect the section headings. | Two grouped sections render: **Active** (Published configs) and **Version History** (Draft, Deprecated, Retired). |
| 9.1.3 | (≥1 Published config exists) inspect the **Active** section. | Each row shows config name (link), version, phase badge, age. Rows sorted newest first. |
| 9.1.4 | (Zero configurations exist) inspect the empty state. | `EmptyContent` reads "Hey there, no configurations attached to this service yet." with a subtitle pointing at how to attach one. |
| 9.1.5 | (Zero Published configs but ≥1 historical) inspect the **Active** section. | Renders an inline "No active configurations." minimal-empty within the Active section while the **Version History** section still lists historical entries. |

### 9.2 `/services/:name` Settings tab — form fields + edit flow (task #7)

> Confirmed: Settings is a third tab on the existing `services.$name.tsx`
> route; the form submits via a Remix `action` on that same route — no
> separate edit page. The implementation uses **two cards** (Identity +
> Lifecycle), each with its own Form/Save button.

| # | Step | Pass criteria |
|---|---|---|
| 9.2.1 | On `/services/<name>`, click the **Settings** tab. | Tab becomes active. URL becomes `/services/<name>?tab=settings`. |
| 9.2.2 | Inspect the **Service identity** card. | Fields visible (with case-sensitive labels): **Service name** (disabled — immutable), **Display name** (required text input, max 120), **Description** (textarea, max 1000 with live counter), **Owner project** (required text input). Footer: **Reset** (secondary) and **Save changes** (primary). |
| 9.2.3 | Inspect the **Lifecycle** card. | Phase Select (with options Draft / Published / Deprecated / Retired and human-readable suffixes). Disallowed transitions are disabled. When current phase is `Retired`, the entire Select is disabled and the "Retired is terminal" hint shows. Footer: **Save changes** (primary). |
| 9.2.4 | Edit the **Display name** and click **Save changes**. | Identity form submits via the route's Remix `action` (`intent=updateIdentity`, JSON-Patch under the hood). On success, a `sonner` toast reads "Service identity updated." and the form re-renders with the new value. |
| 9.2.5 | Click **Reset**. | Description field reverts to the loaded `spec.description`; other fields revert to defaults via the form's `htmlType="reset"`. |
| 9.2.4 | Click **Cancel** without saving. | Form fields revert to the loaded values. No PATCH issued. |
| 9.2.5 | Force a validation failure (e.g. clear required field, then Save). | Inline field error renders; submit button stays disabled or re-enables only after the error clears. |
| 9.2.6 | Force an API failure (e.g. RBAC revoke) and Save. | An inline error banner with the API error message renders; form values are preserved. |

### 9.3 Config Compare screen (task #8)

> Confirmed: route is
> `/services/:name/configurations/compare?left=<configA>&right=<configB>`,
> file `services.$name_.configurations.compare.tsx`. Pickers render when
> either query param is missing.

| # | Step | Pass criteria |
|---|---|---|
| 9.3.1 | Navigate to the Compare entry point (link from the Configurations tab or a "Compare" button on a config detail page). | A two-column picker is shown with both selectors empty. |
| 9.3.2 | Select two configurations from the dropdowns. | Both selectors populate; a **Compare** button enables and routes to the diff view. |
| 9.3.3 | Inspect the diff view header. | Shows both configuration names with their phase badges, versions, and ages side-by-side. |
| 9.3.4 | Inspect meter / MRT diff sections. | Added rows highlighted green (or `+` marker), removed rows highlighted red (or `-` marker), unchanged rows muted. |
| 9.3.5 | Pick the same configuration on both sides. | Diff view shows "No differences" state. |
| 9.3.6 | Reload the diff URL directly. | SSR loader resolves both configs; page renders without a flash of empty state. |

### 9.4 Create Service Wizard (task #9)

> Route TBD — likely `/services/new` or `/services/create`.

| # | Step | Pass criteria |
|---|---|---|
| 9.4.1 | Click **Create Service** from `/services`. | Wizard opens at step 1. |
| 9.4.2 | Inspect the step indicator. | Four steps visible in order: **1. Identity** (serviceName, displayName, description), **2. Owner** (producerProjectRef), **3. Initial Configuration** (optional ServiceConfiguration scaffold), **4. Review**. |
| 9.4.3 | Step 1 — fill in required fields and click **Next**. | Validation runs; advancing without `serviceName` or `displayName` shows inline errors. With valid input, the indicator advances to step 2. |
| 9.4.4 | Step 2 — pick a producer project and click **Next**. | Selector lists projects (or accepts free-text). Advances to step 3. |
| 9.4.5 | Step 3 — either skip or fill the initial configuration form, then click **Next**. | Step 3 marked optional; **Skip** and **Next** both advance to step 4. |
| 9.4.6 | Step 4 — Review pane. | Shows the full payload that will be POSTed: serviceName, displayName, description, owner, and (if provided) the initial configuration. **Back** returns to step 3 with form values preserved. |
| 9.4.7 | Click **Create** on step 4. | POSTs the Service (and optional ServiceConfiguration). On success, navigates to `/services/<name>`. On failure, surfaces the API error and stays on step 4 with the form intact. |
| 9.4.8 | Use **Back** at any step. | Previous step's form state is preserved. |

### 9.6 Create Configuration wizard (post-v0.2 follow-up)

> Confirmed: route is `/services/:name/configurations/new`, file
> `services.$name_.configurations.new.tsx`. Step labels (from
> `STEP_LABELS`): **Version & source**, **Monitored resource types**,
> **Meters**, **Review & create**. Navigation is keyed off `?step=N`.
> Submission is **not** automated — the create-configuration webhook is
> in `failurePolicy: Fail` mode in dev and the test environment cannot
> satisfy it; the smoke spec stops at the Review step.

| # | Step | Pass criteria |
|---|---|---|
| 9.6.1 | Visit `/services/<name>/configurations/new`. | `<h1>New configuration</h1>` is visible. The 4-step rail in the left `<aside>` shows: Version & source, Monitored resource types, Meters, Review & create. |
| 9.6.2 | Inspect the Version & source step. | A required `Version` text input is visible (placeholder `e.g. 1.2.0`), pre-filled with the auto-suggested next version. A radio group offers **Blank** and **Clone an existing version**. The Clone radio is enabled if the service has ≥1 prior configuration; otherwise it is disabled with a "No prior configurations to clone from." hint. |
| 9.6.3 | Type a divergent value (e.g. `9.9.9`) into the Version input. | An info `Alert` titled **Version suggestion** appears with body "Based on the latest version, we suggest <suggested>." and a **Use this** button. Clicking **Use this** restores the suggested version and the Alert disappears. |
| 9.6.4 | Click **Next →** through steps 1, 2, 3. | URL search param transitions `?step=2` → `?step=3` → `?step=4`. Steps 2 (MRTs) and 3 (Meters) accept blank lists. |
| 9.6.5 | Inspect step 4 (Review & create). | Heading is **Review & create**. A consent checkbox reads "I confirm the version and contents are correct." A "Created in Draft" info Alert is visible. **Create configuration** submit button is disabled until the checkbox is checked. |
| 9.6.6 | Inspect the breadcrumb. | Reads `Home / Services / <serviceName> / New configuration`. The middle two links navigate back to `/services` and `/services/<name>?tab=configurations` respectively. |

> **Submit-and-verify is intentionally out of scope.** Manual sign-off
> requires a working webhook + RBAC; see the Submission section of the
> manual plan for v0.3.

---

### 9.5 Consumer Service Catalog (task #10)

> Route TBD — likely `/catalog` or `/services/catalog`. Distinct from the
> provider-facing `/services` list. Confirmed: cards link to the existing
> provider detail view at `/services/:name` (no separate consumer detail
> view in this iteration).

| # | Step | Pass criteria |
|---|---|---|
| 9.5.1 | Navigate to the Consumer Catalog route. | Page renders a card grid of `Service`s where `spec.phase == "Published"`. Drafts, Deprecated, and Retired services do **not** appear. |
| 9.5.2 | Inspect a card. | Card shows displayName as the title, description as the body, owner project as a footer line, and a **View details** link to `/services/<name>` (or a consumer-detail variant). |
| 9.5.3 | (Zero Published services exist) inspect the empty state. | `EmptyContent` reads "Hey there, no services have been published yet." with appropriate subtitle. |
| 9.5.4 | Resize to a narrow viewport. | Grid collapses from 3-up → 2-up → 1-up at sensible breakpoints. |
| 9.5.5 | Confirm phase badges are absent or muted. | Consumer catalog should not surface lifecycle internals (Draft/Deprecated) — Published is implicit. |

---

## Sign-off

| Tester | Date | Build / commit | Result |
|---|---|---|---|
| | | | ☐ Pass ☐ Fail |
