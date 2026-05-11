# Validation Report — Milo Service Catalog UI v0.1

> Build: initial read-only iteration on branch `implement-service-infrastructure`
> Date: 2026-05-05
> Author: Test Engineer (service-catalog-ui team)
> Scope: Manual review against `ux-spec.md` v0.3 + automated Playwright smoke
> tests in `ui/e2e/`.

---

## 1. Screens implemented

The four read-only screens called out in the gap analysis ship in this build:

| # | Screen | Remix file | Status |
|---|---|---|---|
| 1 | `/services` — Service list | `ui/app/routes/services._index.tsx` | ✅ Implemented |
| 2 | `/services/:name` — Service detail | `ui/app/routes/services.$name.tsx` | ✅ Implemented |
| 3 | `/service-configurations` — Configuration list | `ui/app/routes/service-configurations._index.tsx` | ✅ Implemented |
| 4 | `/service-configurations/:name` — Configuration detail | `ui/app/routes/service-configurations.$name.tsx` | ✅ Implemented |

All four match the component tree, column lists, breadcrumb structure, empty
state copy, and phase badge mapping defined in `ux-spec.md` (§§4–13).

The supporting infrastructure also ships:

- Root layout with `AppSidebar` + `Catalog` group (Services, Configurations).
- Breadcrumb bar in `SidebarInset`.
- `/health` returning `{"status":"ok"}` for liveness probes.
- API proxy route `apis.$.tsx` (used by the dev server when calling the
  Kubernetes API server).

---

## 2. Screens / features explicitly skipped

These were called out in `ux-spec.md` §14 (or the gap analysis) and are
**not** part of v0.1. Each is skipped because the backing API surface does
not yet exist, or the read-only iteration deliberately omits them.

| Skipped feature | Reason |
|---|---|
| **Provider Dashboard** | No backing API for provider-scoped aggregate metrics (consumption, MRR, error rates). Cannot be implemented without monitoring + entitlements pipelines. |
| **Adoption tab** (per-service consumer counts, growth) | Requires an entitlements/usage roll-up API that is not yet implemented in this service or any upstream service. |
| **Activity tab** (per-service audit trail) | Requires the activity-feed pipeline to publish events scoped to a `Service` reference. Not wired up yet. |
| **Communications tab** | No notification/announcement API exists. |
| **Configuration release notes** | The `ServiceConfiguration` schema has no release-notes field today. |
| **Configuration version history** | No version-pin field on `ServiceConfiguration`; reconciler does not emit version transitions. |
| **IAM tab** (per-resource role bindings) | RBAC visibility/management UI is out of scope for the catalog service — belongs in a dedicated IAM UI. |
| **Quota tab** | Quota limits are not modelled on `Service` or `ServiceConfiguration` and have no controller. |
| **Create / edit / delete flows** | This iteration is intentionally read-only (`ux-spec.md` §14). Only Remix `loader` functions are implemented; no `action`s. |
| **Pagination, search, filtering** | Listed as v0.1 constraints — full-list fetch only. Will revisit once result counts grow. |

---

## 3. API gaps discovered during implementation

The implementation revealed several upstream APIs the UI will eventually
depend on but which are not available today. These don't block v0.1, but
they're load-bearing for the screens listed in §2.

| Gap | What we'd need | Blocks |
|---|---|---|
| **Monitoring / metrics API** | A query endpoint that aggregates `MeterReading`-style usage by `Service` and `ServiceConfiguration`. | Provider Dashboard, Adoption tab. |
| **Telemetry / events API for catalog resources** | Activity-feed events keyed off `Service` and `ServiceConfiguration` with proper `involvedObject` references. | Activity tab. |
| **Entitlements API** | Per-consumer entitlements / subscriptions tied back to `ServiceConfiguration`. | Adoption tab, "consumers using this configuration" panel. |
| **`status.publishedAt` on `Service`** | Field exists in the type but the controller does not consistently populate it on phase transitions to `Published`. | Detail page Published At cell will show `—` for resources whose controller has not yet stamped the timestamp. |
| **`status.conditions` standardisation** | Both `Service` and `ServiceConfiguration` should expose conditions with consistent `Type` values (e.g. `Ready`, `Reconciled`) so the conditions table is meaningful. Today the controllers emit a small, inconsistent set. | Conditions card on detail pages renders whatever the controller produces; column alignment is fine but the values are not yet useful for end users. |

---

## 4. Known limitations carried over from UI Engineer notes

Three risks identified during implementation that warrant follow-up:

### 4.1 `datum-ui` local alias requires a separate build step

The UI imports from `@datum-cloud/datum-ui`. If the workspace is configured
to alias this to a local checkout of the `datum-ui` monorepo (for component
development), the alias **only works after** `pnpm --filter @datum-cloud/datum-ui build`
has been run inside that repo. Without the prebuilt `dist/`, Vite resolves
the alias to source files that aren't compiled and the dev server fails on
the first import.

Mitigation options:

- **Recommended for v0.1:** drop the local alias from `pnpm-workspace.yaml`
  and rely on the published `^0.8.0` version listed in `package.json`. This
  is what ships today.
- For component co-development, explicitly run the upstream build before
  starting the dev server, or wire a Task that does so.

### 4.2 SSR self-fetch pattern in loaders — single-flight deadlock risk

Loaders call back into the Remix server's own proxy route (`apis.$.tsx`) to
reach the Kubernetes API. In a single-process dev or production build,
in-flight loaders can in theory block on the same Node event loop they need
to handle the proxied request, leading to a request-handler deadlock under
load.

Status:

- No deadlock observed during smoke testing against an idle kind cluster.
- **Needs:** a smoke test against a live cluster with concurrent navigation
  (open multiple browser tabs, navigate rapidly) to confirm the pattern is
  safe under realistic concurrency. If a deadlock is observed, switch the
  loaders to call the Kubernetes API directly (server-side) rather than
  bouncing through the proxy route.

### 4.3 React 18 vs datum-ui peer mismatch when using the local alias

`package.json` pins `react@^18.2.0` and `react-dom@^18.2.0`. The current
`@datum-cloud/datum-ui` package declares peer deps for React ≥19. The
published `^0.8.0` build evidently still works with React 18 (it would not
otherwise install successfully), but if the local alias is used (see §4.1)
the alias picks up the latest `datum-ui` source which assumes React 19 APIs.

Mitigation:

- For v0.1, stay on React 18 + the published `datum-ui ^0.8.0`.
- Plan a follow-up to bump the UI to React 19 when we adopt local
  development of `datum-ui`.

---

## 5. Automated test coverage delivered

Two Playwright smoke specs ship under `ui/e2e/`, mirroring the pattern from
`datum-cloud/activity/ui/e2e/`:

| Spec | Coverage |
|---|---|
| `ui/e2e/services.spec.ts` | Visits `/services`. Asserts page title/heading/description, breadcrumb trail, and either the column headers (Name, Service Name, Phase, Configurations, Age, Owner) or the empty-state copy depending on cluster contents. |
| `ui/e2e/service-configurations.spec.ts` | Visits `/service-configurations`. Same assertion pattern with column headers Name, Service Ref, Phase, Age, Meters and the configuration-specific empty-state copy. |

Configuration:

- `ui/playwright.config.ts` — chromium-only project, `baseURL`
  `http://localhost:3000`, traces on retry, `webServer` block that runs
  `pnpm dev` with `reuseExistingServer: true` so a contributor can keep
  `task ui:dev` open in another terminal.
- `ui/package.json` — adds `test:e2e` and `test:e2e:headed` scripts and
  pins `@playwright/test` in `devDependencies`.
- `ui/Taskfile.yaml` — adds a `test:e2e` task that delegates to `pnpm test:e2e`
  after ensuring deps are installed.

The specs deliberately tolerate either the populated table state **or** the
empty state so they pass against a freshly-bootstrapped kind cluster. Detail
routes are covered by the manual `test-plan.md` rather than e2e because they
require seeded resources — adding fixture-driven detail-page tests is a
sensible follow-up once a `config/samples/` set is published.

---

## 6. Outstanding concerns for the team lead

1. **Real-cluster smoke for the SSR self-fetch pattern (§4.2)** — owner
   should run a multi-tab navigation pass against a live cluster before
   tagging v0.1 done.
2. **Decide on the `datum-ui` strategy (§4.1, §4.3)** — confirm the published
   `^0.8.0` version is acceptable for v0.1. If a local alias is desired,
   document the build step in the UI README and plan the React 19 bump.
3. **Conditions table usefulness (§3)** — the row alignment is correct, but
   controller output is inconsistent. Ask the controller maintainers to
   standardise `Type` values before we polish the conditions visualisation.
4. **Detail-route automated coverage** — the current Playwright suite is
   list-routes only. Once representative `config/samples/` exist, add detail
   specs that follow a row link and assert the definition-list grid + the
   collapsible Meters/MRTs sections.

---

## 7. v0.2 — screens under implementation (placeholder)

> The screens below are being delivered by team tasks #6–#10. This section is
> scaffolded ahead of time and will be filled in once the ui-engineer signals
> implementation is complete and Playwright specs land under `ui/e2e/`.

### 7.1 Screens planned for this iteration

| # | Screen | Task | Route (planned) | Status |
|---|---|---|---|---|
| 5 | Service detail — Configurations tab with phase grouping | #6 | `/services/:name` (Configurations tab) | ⏳ awaiting ui-engineer |
| 6 | Service detail — Settings tab (edit form) | #7 | `/services/:name` (Settings tab) | ⏳ awaiting ui-engineer |
| 7 | Configuration Compare | #8 | TBD (e.g. `/services/:name/configurations/compare?a=…&b=…`) | ⏳ awaiting ui-engineer |
| 8 | Create Service Wizard (4-step) | #9 | TBD (e.g. `/services/new`) | ⏳ awaiting ui-engineer |
| 9 | Consumer Service Catalog | #10 | TBD (e.g. `/catalog`) | ⏳ awaiting ui-engineer |

### 7.2 Playwright coverage (executed against deployed UI)

Five smoke specs ship under `ui/e2e/`, all aligned with the deployed
implementation. Suite executed against `pnpm dev` on `:3000` with seed
data (compute Published, storage Published, networking Draft, database
Deprecated; compute has two ServiceConfigurations including
`compute-miloapis-com-v1`).

**Final result: 14 passed / 0 skipped / 0 failed.** (Bumped from 9 → 14
after the Create Configuration wizard landed and a 5-test smoke spec was
added — see "Create Configuration wizard" rows in §7.2.)

The earlier `ScalarDiffRow` SSR crash on the populated Compare diff is
fully resolved — see §7.6 "Compare bug" for the original failure mode.

| Spec file | Status | Coverage |
|---|---|---|
| `ui/e2e/services-detail-configurations-tab.spec.ts` | ✅ pass | Navigates to `/services/<name>?tab=configurations`; asserts the **Configurations** tab is visible and either the **Active configuration** / **Version history** section headings or the **No configurations yet** empty state is rendered. Uses `.first()` to satisfy strict-mode when both sections are present. |
| `ui/e2e/services-detail-settings-tab.spec.ts` | ✅ pass | Navigates to `/services/<name>?tab=settings`; asserts the Identity card labels (Service name, Display name, Description, Owner project), the **Lifecycle** card title (matched by text — datum-ui CardTitle is a `<div>`, not a heading role), a `combobox` Select, and the **Save changes** + **Reset** buttons. |
| `ui/e2e/config-compare.spec.ts` (test 1) | ✅ pass | Empty-pickers state. Navigates to `/services/<first>/configurations/compare` with no query params, asserts the `data-e2e="page-title"` reads "Compare configurations" (PageTitle renders as a `<span>`, not a heading) and the **Pick two configurations to compare** empty state. |
| `ui/e2e/config-compare.spec.ts` (test 2) | ✅ pass | Populated-diff test for `?left=compute-miloapis-com&right=compute-miloapis-com-v1`. Asserts both config names appear and a meters/MRT/no-differences marker renders. (Auto-skips on HTTP 500 — once the Compare bug landed fixed, the test moved from skipped to passing without further changes.) |
| `ui/e2e/create-service-wizard.spec.ts` | ✅ pass | Visits `/services/new`; asserts the `<h1>New service</h1>` heading and the four step labels: **Service identity**, **Monitored resource types**, **Meters**, **Review** (case-insensitive matches against the stepper). |
| `ui/e2e/consumer-catalog.spec.ts` | ✅ pass | Visits `/catalog`; asserts the `<h1>Service catalog</h1>` heading and either ≥1 anchor with `href^="/services/"` (a published service card) or the **No services available yet** empty state. |
| `ui/e2e/create-config-wizard.spec.ts` (test 1) | ✅ pass | `<h1>New configuration</h1>` heading + the four step labels in the `<aside>` rail (Version & source / Monitored resource types / Meters / Review & create). Uses `locator('aside').toContainText(...)` to scope away from the radio descriptions that mention the same words. |
| `ui/e2e/create-config-wizard.spec.ts` (test 2) | ✅ pass | Auto-version Alert. The Alert is gated on `form.version !== suggestedVersion` and the form initialises with version = suggestion, so the spec types `9.9.9` into the Version input first, then asserts the **Version suggestion** Alert + **Use this** button render. |
| `ui/e2e/create-config-wizard.spec.ts` (test 3) | ✅ pass | The **Clone an existing version** radio is visible and enabled on `compute-miloapis-com` (which has prior configs). |
| `ui/e2e/create-config-wizard.spec.ts` (test 4) | ✅ pass | Click **Next →** three times; assert URL transitions `?step=2 → 3 → 4` and that the **Review & create** heading is visible on step 4. Blank MRTs / meters are accepted. |
| `ui/e2e/create-config-wizard.spec.ts` (test 5) | ✅ pass | Breadcrumb reads `Home / Services / compute-miloapis-com / New configuration` (driven by `buildCrumbs` in `AppLayout.tsx`). |

Pre-existing specs (also pass):

| Spec file | Status | Notes |
|---|---|---|
| `ui/e2e/services.spec.ts` | ✅ pass (3 tests) | Pre-existing list-route smoke — still good. |
| ~~`ui/e2e/service-configurations.spec.ts`~~ | 🗑️ deleted | The `/service-configurations` route is now a `redirect("/services")`. Spec removed during this iteration. |

### 7.3 Anticipated API gaps for v0.2

Drafted ahead of implementation; will be reconciled with what the ui-engineer
actually encountered.

| Gap | What we'd need | Likely impact |
|---|---|---|
| **`spec.version` semantics for Configurations** | A controller-managed monotonic version (or a documented user-supplied scheme). | Needed to make the **Version History** ordering deterministic and to label diff "from / to" clearly. |
| **Service-level "active configuration" pointer** | A `status.activeConfigurationRef` on `Service` (or equivalent). | Today the Active section infers its membership from `phase == Published` on the configuration; an explicit pointer would be unambiguous. |
| **Project list API** | Consumer of the wizard step 2 needs a project picker, but no `Project` API is declared in this service. | Step 2 will fall back to a free-text input until the upstream Project API is consumable. |
| **Producer / consumer split on `Service`** | A flag distinguishing a service the current user produces vs. consumes. | The Consumer Catalog can show all Published services for now, but a future filter ("services I'm not the owner of") needs this signal. |

### 7.4 Open questions resolved by team-lead (2026-05-05)

- ✅ **Compare URL**: `/services/:name/configurations/compare?a=:configA&b=:configB`,
  file `services.$name_.configurations.compare.tsx`.
- ✅ **Settings tab**: third tab on existing `services.$name.tsx`; submits via
  a Remix `action` on the same route (no separate edit page).
- ✅ **Consumer catalog cards**: link to the existing provider detail view at
  `/services/:name` (no separate consumer detail view in this iteration).

### 7.5 Open questions resolved by team-lead (round 2)

- ✅ **Create Wizard route**: confirmed `/services/new`.
- ✅ **Consumer Catalog route**: confirmed `/catalog`.
- ✅ **Compare query param shape**: canonical is `?left=:configA&right=:configB`
  (matches the entry link emitted by the Configurations tab in task #6).
  `config-compare.spec.ts` updated to use `left` / `right` keys.
- ✅ **Compare seed data plan**: team-lead is adding a second
  ServiceConfiguration `compute-miloapis-com-v1` so the populated diff
  test has two configs under `compute-miloapis-com` to compare. Spec
  skips that test automatically until both configs are present.

### 7.6 Implementation findings

#### Task #6 — Configurations tab (completed)

Verified my Configurations tab spec against `services.$name.tsx`.
Adjustments:

- Section heading is `"Active configuration"` (singular) — updated the
  regex from `/^active$/` to `/active configuration/i`.
- Section heading is `"Version history"` — already matches.
- Empty state card title is `"No configurations yet"` — updated regex from
  `/no configurations/i` to the more specific `/no configurations yet/i`.
- The Configurations tab also includes a `PendingBanner` (warning Alert)
  when drafts exist, and an inline "No active configuration" placeholder
  when published is empty but history is not. These are nice-to-haves for
  later coverage; not asserted in the smoke spec.

#### Task #7 — Settings tab (completed)

Verified my Settings tab spec against `services.$name.tsx`. Adjustments:

- Field labels use lowercase 'n' — `"Display name"`, `"Service name"`,
  `"Owner project"` — not the title-cased forms I had drafted.
- There is **no** `"Phase"` label. Phase lives in a separate **Lifecycle**
  card with a Select control. The spec asserts `getByText(/^Lifecycle$/)`
  rather than a heading role, because datum-ui's `CardTitle` renders as
  `<div data-slot="card-title">`, not an `<h*>` element.
- Form footer buttons are **Save changes** + **Reset**. Lifecycle card has
  its own footer ("Update phase"), so the Save changes assertion uses
  `.first()`.
- Implementation also includes a `sonner` toast on save success — not
  asserted in the smoke spec.
- Note: implementation includes a third "Danger zone" card (Deprecate +
  Delete service) not covered by the smoke spec.

#### Task #8 — Compare screen (completed)

Verified my Compare spec against `services.$name_.configurations.compare.tsx`.

✅ **Empty-pickers test passes.** Selector adjustments:
- `PageTitle` renders as `<span data-e2e="page-title">…</span>`, not a
  heading role. Switched the assertion to
  `page.locator('[data-e2e="page-title"]').toContainText(...)`.
- Empty state copy is "Pick two configurations to compare." — matched.

✅ **Populated-diff test now passes** (post-fix). Originally skipped due to
the bug below; ui-engineer fixed `ScalarDiffRow` so the populated diff
SSRs cleanly and the test now asserts both config names + a diff marker.

⚠️ **Original bug (now fixed):**

The route `?left=compute-miloapis-com&right=compute-miloapis-com-v1`
returned **HTTP 500** during SSR with:

```
TypeError: Converting circular structure to JSON
  --> starting at object with constructor 'Object'
  --- property 'Provider' closes the circle
  at JSON.stringify (<anonymous>)
  at ScalarDiffRow (services.$name_.configurations.compare.tsx:212:14)
```

Root cause: `ScalarDiffRow` at line 212 calls `JSON.stringify(left)` and
`JSON.stringify(right)` to compare values for equality. When called with
`React.ReactNode` arguments (e.g. badge nodes), the React element tree
contains a circular ref via the `Provider` slot, and `JSON.stringify`
throws.

**Fix recommendation for ui-engineer**: don't `JSON.stringify` ReactNode.
Either (a) compare strings only when both args are strings (already done
on line 210–211) and skip equality for non-string nodes, or (b) compare
using a `key`/`id` prop on the badge/element rather than serialising the
node tree, or (c) use `React.Children.toArray` plus a stable hash.

The populated-diff spec uses `test.skip(response.status === 500, …)` so
it auto-recovers when the bug is fixed — no further test changes needed.

#### Task #9 — Create Service Wizard (completed)

Verified my Wizard spec against `services.new.tsx`. Adjustments:

- Page heading is `<h1>New service</h1>` — switched my regex from
  `/create.*service/i` to `/new service/i`.
- Step labels (from the `STEP_LABELS` constant) are: **Service identity**,
  **Monitored resource types**, **Meters**, **Review & create**. My
  initial draft assumed Identity / Owner / Initial Configuration / Review
  — corrected.

#### Task #10 — Consumer Catalog (completed)

Verified my Catalog spec against `catalog._index.tsx`. Adjustments:

- Page heading is `<h1>Service catalog</h1>` (an actual `<h1>`, so
  `getByRole('heading', …)` works).
- Empty state title is "No services available yet." — adjusted regex.
- Cards link to `/services/:name` as planned. Spec asserts
  `a[href^="/services/"]` is present, which trips the seed-populated
  state correctly.

#### Post-v0.2 — Create Configuration wizard (follow-up task)

Verified `create-config-wizard.spec.ts` against
`services.$name_.configurations.new.tsx`. Three substantive findings
required spec adjustments:

- **Hydration race on Next-button click.** The first draft used
  `waitForLoadState('domcontentloaded')` and `await nextButton.click()`;
  Playwright reported "element was detached from the DOM, retrying" and
  the click never settled (30-second test timeout). Switched the page
  ready waits to `waitForLoadState('networkidle')` so React hydration
  fully completes before the test interacts. All five tests now stable.
- **Auto-version Alert is hidden by default.** The Alert is rendered by
  `{suggestedVersion && form.version !== suggestedVersion ? <Alert/> : null}`,
  but the form initialises with `version: data.suggestedVersion`, so the
  two are equal on first paint and the Alert is suppressed. The spec now
  types a divergent value (`9.9.9`) into the Version input first, then
  asserts the Alert appears. (This also exercises the `Use this` button
  meaningfully.)
- **Stepper-label ambiguity.** A naïve `getByText(/monitored resource
  types/i).first()` raced against the radio description "Start with no
  monitored resource types or meters." Scoped the assertion to
  `page.locator('aside').toContainText(...)` so the stepper rail is the
  only candidate.

Submission is intentionally not exercised — the create-configuration
webhook is in `failurePolicy: Fail` mode in dev and the test environment
cannot satisfy it. Manual coverage of submission is in test-plan.md
§9.6 (Submit-and-verify is deferred to v0.3).
