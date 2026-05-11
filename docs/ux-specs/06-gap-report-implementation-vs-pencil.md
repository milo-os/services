# Gap Report — Service Catalog UI Implementation vs. Pencil Design

**Generated:** 2026-05-05
**Author:** ux-designer
**Pencil file:** `service-catalog-interface.pen`

This report walks every relevant Pencil screen and compares it to the
shipping Remix routes. For each screen we document:

1. The route/component that covers it (or "not implemented").
2. Pencil sections/fields **missing** from the implementation, with
   the reason classified as one of:
   - **API gap** — field not exposed by `Service` / `ServiceConfiguration` CRDs.
   - **Out of scope** — Pencil shows a feature that requires APIs/services we don't own (entitlements, telemetry, billing, communications, activity).
   - **Not built yet** — could be implemented against the existing API but isn't (deferred).
3. **Additions / deviations** — anything we ship that isn't in the design.
4. **Navigation differences** — tabs, links, breadcrumbs, sidebar.

Routes audited:

```
/services                                                   services._index.tsx
/services/:name (Overview / Configurations / Settings)      services.$name.tsx
/services/:name/configurations/:configName                  services.$name_.configurations.$configName.tsx
/services/:name/configurations/compare?left=&right=         services.$name_.configurations.compare.tsx
/services/new                                               services.new.tsx
/catalog                                                    catalog._index.tsx
```

Plus the shared shell at `components/AppLayout.tsx`.

---

## Summary table

| Pencil node | Pencil screen name                       | Implemented? | Route                                    |
| ----------- | ---------------------------------------- | ------------ | ---------------------------------------- |
| `H4KnG`     | Provider — Service List                  | ✅ partial    | `/services`                              |
| `hhwyH`     | Service Dashboard — Overview             | ✅ partial    | `/services/:name` (Overview tab)          |
| `7UXIm`     | Service Dashboard — Configurations       | ✅            | `/services/:name?tab=configurations`     |
| `OJIvM`     | Configurations — List (with banner)      | ✅            | same as above (richer variant)            |
| `5BNLr`     | Configurations — Detail                  | ✅ partial    | `/services/:name/configurations/:cfg`     |
| `haUvC`     | Configurations — Compare                 | ✅            | `/services/:name/configurations/compare` |
| `GzZys`     | Service Dashboard — Settings             | ✅            | `/services/:name?tab=settings`           |
| `O9haD`     | Wizard — Step 1 (Basic Info)             | ✅ adapted    | `/services/new?step=1`                   |
| `QAaQy`     | Wizard — Step 5 (Billing)                | ❌ N/A        | superseded by 4-step flow                |
| `JKdfj`     | Wizard — Step 6 (Telemetry)              | ❌ N/A        | superseded by 4-step flow                |
| `7klzj`     | Wizard — Step 7 (Review)                 | ✅ adapted    | `/services/new?step=4`                   |
| `yke71`     | Consumer — Service Catalog               | ✅            | `/catalog`                               |

✅ partial = Implemented at the data we own; design includes API-gap or out-of-scope content we omitted.

---

## 1. `H4KnG` — Provider Service List → `/services`

**Route:** `services._index.tsx` (Read 188 lines).

### What ships
- Page header: `Services` title + description prose.
- `New service` primary button (top-right) → `/services/new`.
- Table with columns: `Name`, `Service Name`, `Phase`, `Configurations`, `Age`, `Owner`.
- Per-row links go to `/services/:name`.
- `Failed to load data` card on loader error; empty state via `<EmptyContent>`.

### Pencil elements missing

| Element                                                          | Class       | Note                                                                                |
| ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- |
| Page title `Service Management` (we use `Services`)              | Naming      | Different copy. Consider aligning if "Service Management" is the agreed term.       |
| Subtitle `12 services · 4 GA · 6 Beta · 2 Alpha`                 | API gap     | We don't track Alpha/Beta/GA — our phases are Draft/Published/Deprecated/Retired. Could synthesise a `N total · N Published · N Draft …` summary against our phases (not built). |
| `Filter services…` search input (top-right)                      | Not built   | No search box on the list. Achievable client-side against `displayName` / `serviceName` / `description`. |
| `EXPORT` secondary button                                         | Out of scope| No export endpoint.                                                                  |
| Table columns: `LIFECYCLE` / `VERSION` / `STATUS` / `PROJECTS` / `ENTITLEMENTS` / `BILLING` / `BUDGET` / `HEALTH` / `ALERTS` (10 columns visible) | Out of scope / API gap | None of these are surfaced by the CRDs. |
| Per-row `EDIT` and `MANAGE` action buttons                        | Not built   | We rely on the row link only; no inline actions.                                    |
| Highlighted row tint (`#FFF8E1` warning fill on row 4)            | Not built   | Pencil uses the tint to flag an alert state we don't model.                         |

### Additions / deviations
- Column `Configurations` with a count is **not in the Pencil mockup** but is useful and shipping (powered by a parallel `serviceconfigurations` list query).
- Column `Age` (relative time from `metadata.creationTimestamp`) is **not in the Pencil mockup**; ours uses `relativeAge()` from `~/lib/format`.
- Top-nav `Catalog` / `My Services` / `Providers` from the Pencil chrome is absent — we use a left sidebar with `Catalog` and `Services` only.

### Navigation
- **Pencil:** dark top nav with three tabs — `Catalog`, `My Services`, `Providers`. We do not have tenant/provider context.
- **Implementation:** left sidebar with `Browse → Catalog` and `Manage → Services`, plus a horizontal breadcrumb header.

---

## 2. `hhwyH` — Service Dashboard Overview → `/services/:name` (Overview tab)

**Route:** `services.$name.tsx` (Read 1127 lines), `Tabs[value="overview"]` body lines 1021–1108.

### What ships
- `<PageTitle>` with `displayName` and `description`.
- Tabs: `Overview`, `Configurations`, `Settings` (3 tabs).
- Overview body:
  - **Details** card with `Service Name`, `Display Name`, `Phase` (badge), `Owner Project`, `Published At`, `Description`.
  - **Conditions** card with a table of `Type / Status / Reason / Message / Last Transition`.

### Pencil elements missing (sections of the design)

| Pencil element                                              | Class         | Note                                                                                                |
| ----------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------- |
| Service icon (`server` lucide in primary-light tile)        | API gap       | No `icon` field on `Service`.                                                                       |
| `GA` / `ACTIVE` badge pair next to title                    | API gap       | We don't track Alpha/Beta/GA. Phase badge is shown in the Details card body only, not next to the title. |
| Sub-line `compute.datumapis.com` under the title            | Not built     | This is `spec.serviceName` — the canonical reverse-DNS identifier (already in the loader). Distinct from `metadata.name`, which is the URL slug. Render it under the title in `<PageTitle>`. |
| Tabs: `Adoption`, `Communications`, `Activity`              | Out of scope  | No adoption metrics, comms, or activity log APIs.                                                  |
| Right-side **Quick Actions** card (`New Configuration`, `Notify Consumers`, `View in Catalog`, `Export Config`) | Mixed | `New Configuration`: not built (deferred). `Notify Consumers`, `Export Config`: out of scope. `View in Catalog`: not built — we could link to `/catalog#<name>` if the service is `Published`. |
| Documentation chip row (`Documentation`, `Quickstart`, `API Reference`) | API gap | No URLs on `Service`.                                                                       |
| Category chips (`Compute`, `Infrastructure`, `Workloads`)   | API gap       | No `categories` field.                                                                              |
| Stat cards row (`TOTAL ENTITLEMENTS 142 +8%`, `ACTIVE PROJECTS 89 +5%`, `SERVICE HEALTH 98%`, `ACTIVE ALERTS 1`) | Out of scope | All four are runtime/usage data — no API.                                                |
| Active Configuration card duplicate (left-bottom) showing `v3.0.0` summary | Not built | We surface this only inside the Configurations tab. Could be added to Overview later.    |
| **Recent Activity** card (right-bottom)                     | Out of scope  | No activity log.                                                                                    |

### Additions / deviations
- **Conditions** card is shipped on the Overview tab but is absent from the Pencil mockup. This is a Kubernetes-native surface that adds value for operators.
- `Published At` row is shown in plain text via `formatPublishedAt`; the Pencil mockup uses a chip-style "Activated …" line on the active config card.

### Navigation
- **Pencil tabs:** Overview, Configurations, Adoption, Communications, Activity, Settings (6 tabs).
- **Implementation tabs:** Overview, Configurations, Settings (3 tabs). 3 missing tabs (Adoption / Communications / Activity) are entirely out of scope.

---

## 3. `7UXIm` & `OJIvM` — Configurations Tab → `/services/:name?tab=configurations`

`OJIvM` is the richer variant (with the pending banner). Both map to the same implementation (`services.$name.tsx` lines 492–594, `ConfigurationsTabBody`).

### What ships
- Top-right `New configuration` button — **disabled** with `Coming soon` tooltip (TODO #9 — a separate config wizard).
- Pending banner (`<Alert variant="warning">`) when any config has `phase=Draft`. Shows `View` link + a disabled `Activate` button.
- Section `Active configuration` (uppercase muted heading): `<ActiveConfigCard>` per Published config; `border-2 border-success-300`.
- Section `Version history`: hidden when empty; `<HistoryConfigCard>` per Deprecated/Retired config.
- Each card shows `v<version>` heading, phase badge (re-labelled — see §11 below), date label (`Activated …` / `Superseded …` / `Retired …`), MRT and meter counts, and `View details` + `Compare` actions.
- Empty-state card when there are zero configurations.

### Pencil elements missing

| Element                                                              | Class         | Note                                                                                       |
| -------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ |
| Card body release notes (e.g. "Added persistent volume support …")   | API gap       | No `releaseNotes` / `description` field on `ServiceConfiguration`.                         |
| Card meta row chips: `2 dependencies`, `2 resources`, `2 roles`, `2 quota`, `2 billing`, `2 metrics` (6 fields) | API gap | We only have `meters` and `monitoredResourceTypes` counts. Both are shipped. |
| `Activated by provider-admin@datum.cloud` byline                     | API gap       | No author/identity on the resource.                                                        |
| `142 entitlements on this configuration` footer line                 | Out of scope  | Runtime data.                                                                              |
| `(was active 26 days)` duration on history cards                     | Not built     | Could derive from the next version's `publishedAt` — deferred.                             |
| `EXPORT` action button on every card                                 | Out of scope  | No export endpoint.                                                                        |
| `ROLLBACK` action button on history cards                            | Out of scope  | No rollback API; controller manages phase transitions.                                     |
| `Activate` button on the pending banner                               | Not built (disabled stub) | Currently rendered disabled; would require a phase-transition action wired to PATCH. |
| `New configuration` CTA (functional)                                  | Not built     | Currently disabled; spec #4 covers a wizard inside the create-service flow but no standalone "create configuration" wizard exists. |

### Additions / deviations
- Card phase badge is **re-labelled**: `Published` → `Active`, `Deprecated` → `Superseded`, `Retired` → `Retired`. Pencil shows the same labels — alignment intentional.
- Empty-state card (`No configurations yet` + disabled `New configuration` button) is **not in the Pencil mockup** but needed because zero-config services are common.
- `New configuration` placeholder button at the top of the list is rendered even when configs exist (Pencil only shows it on a wizard entry from another screen).

### Navigation
- Cards link to `/services/:name/configurations/:cfgName` (`View details`) and `/services/:name/configurations/compare?left=:cfgName` (`Compare`). Compare destination matches the design's `COMPARE` action; `View details` matches `VIEW DETAILS`.

---

## 4. `5BNLr` — Configurations Detail → `/services/:name/configurations/:cfgName`

**Route:** `services.$name_.configurations.$configName.tsx` (Read 275 lines).

### What ships
- `← Back` link to `/services/:name?tab=configurations`.
- `<PageTitle>` with the config `metadata.name`.
- **Details** card: `Service Ref` (link), `Phase` (badge), `Meters` count, `Resource Types` count.
- **Meters** card: per-meter `<MeterCard>` showing name, displayName, description, `Aggregation`, `Unit`, `Consumed Unit`, `Pricing Unit`, `Monitored Resource Types` (chips).
- **Monitored Resource Types** card: per-MRT `<MrtCard>` showing type, displayName, description, `GVK Group`, `GVK Kind`, `Labels` (chips).
- Empty-state `<EmptyContent>` for both meters and MRTs.

### Pencil elements missing (the design has 9 sections; we have 3)

| Pencil section          | Class         | Notes                                                                                       |
| ----------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `metaCard` (top)        | ✅ shipped     | We render Details card with the supported fields.                                           |
| `releaseNotesCard`      | API gap       | No release-notes field on the CRD.                                                          |
| `depSection` (Dependencies) | API gap   | No dependency graph in the API.                                                             |
| `iamResSection` (IAM Resources) | API gap | No IAM resource model.                                                                     |
| `iamRolesSection` (IAM Roles)   | API gap | No IAM roles model.                                                                        |
| `quotaSection`          | API gap       | No quota model.                                                                             |
| `billingSection`        | API gap       | We have meter `billing.consumedUnit` / `pricingUnit`, which are shown inside the Meters card — but the dedicated Billing section in the Pencil aggregates billing rules differently and we don't model that. |
| `telemetrySection`      | Out of scope  | No telemetry surface.                                                                       |
| `activitySection`       | Out of scope  | No activity log.                                                                            |

### Additions / deviations
- **Meters & Monitored Resource Types** are first-class top-level cards. The Pencil mockup buries them inside Billing/Telemetry sections; we promote them because they're the meaningful data we own.
- Header lacks the version-prominent title (`Configuration v3.0.0` with phase badge inline). Currently we use the Kubernetes resource name (`<serviceName>-v<version>`) as the title. Consider rendering `v<version>` + phase badge in the header for consistency with `ActiveConfigCard`.

### Navigation
- Single back link to `?tab=configurations`. No breadcrumb; the AppLayout shell renders the breadcrumb (`Services / <name> / <configName>`).

---

## 5. `haUvC` — Configurations Compare → `/services/:name/configurations/compare`

**Route:** `services.$name_.configurations.compare.tsx` (Read 864 lines).

### What ships
- Loader-driven compare with URL params `?left=&right=`.
- Two `<Select>` dropdowns (with explicit `Left` / `Right` labels above them) and a `<ArrowLeftRight>` swap button between them.
- Empty state when one or both are missing; `These are the same configuration` alert when left===right.
- Summary `<Alert variant="info">` with synthesized counts (`+N monitored resource type · −N meters · N modified` or `Configurations are identical.`).
- **Configuration metadata** card: `Version`, `Phase` (badges), `Published at`. Header shows `metadata.name` for each side.
- **Monitored resource types** diff card: per-entry `<MrtDiffEntry>` with state badge (Added / Removed / Modified) and a per-field 3-column table (Field / Left / Right) tinted red on the left for missing-on-the-right and green on the right for new.
- **Meters** diff card: same shape, with meter fields (`Name`, `Display name`, `Description`, `Aggregation`, `Unit`, `Billing — consumed unit`, `Billing — pricing unit`, `Bound monitored resource types`).
- Sort order: removed → added → modified (provided by `sortDiff` in `~/lib/diff`).

### Pencil elements missing

| Element                                          | Class        | Note                                                                                |
| ------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| Pencil version selector chips (compact pill UI)  | Style        | We use full-width `<Select>` instead of pill buttons. Functionally equivalent.      |
| Summary banner extras: `+1 dependency · +1 quota bucket · +1 billing metric · +3 permissions · No IAM role changes` | API gap | We replaced with MRT + meter counts.                                          |
| `DEPENDENCIES` diff card                         | API gap      | No dependency graph.                                                                 |
| `IMPACT IF v3.0.0 ACTIVATED (CURRENTLY ON v2.5.0)` impact card with `142 entitlements affected`, dependency/quota/billing impact bullets | Out of scope | Runtime data. |

### Additions / deviations
- **Replacement diff sections**: Configuration metadata, Monitored resource types, Meters — none of these exist as named sections in the Pencil mockup; we added them because they're the actual diff surface.
- Both selects appear with `Left` / `Right` micro-headings — Pencil shows two unlabelled chips. Our labels are explicit and accessible.

### Navigation
- `← Back to configurations` link. Compare is a separate route from the tab shell (per spec #3 it's `services.$name_.configurations.compare.tsx` with the trailing `_`). AppLayout breadcrumb resolves the last segment to `Compare` (per `buildCrumbs`).

---

## 6. `GzZys` — Settings Tab → `/services/:name?tab=settings`

**Route:** `services.$name.tsx` lines 648–960 (`SettingsTabBody`).

### What ships
- **Service identity** card: `Service name` (disabled, immutable), `Display name`, `Description` (1000-char counter), `Owner project`. Form posts `intent=updateIdentity` with JSON-patch.
- **Lifecycle** card: phase `<Select>` honouring `ALLOWED_TRANSITIONS`; `<PhaseTransitionHelp>` describing the chosen transition; `Update phase` submit disabled when no transition selected; explicit terminal-state messaging when phase is `Retired`.
- **Danger zone** card (red-tinted header): `Deprecate service` row (disabled when already Deprecated/Retired) and `Delete service` row (disabled with explanatory text when configurations still reference the service). Delete confirmation `<Dialog>` requires the user to type the exact `serviceName`.

### Pencil elements missing

| Element                                                  | Class         | Note                                                                       |
| -------------------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| **Documentation** card (Docs URL / Quickstart URL / API URL) | API gap   | No URL fields.                                                              |
| **Service Identity → Icon** picker                        | API gap       | No `icon` field.                                                            |
| **Service Identity → Categories** chip input              | API gap       | No `categories` field.                                                      |
| **Launch Stage** Alpha/Beta/GA/Deprecated radio          | API gap       | We use `phase` instead (Draft/Published/Deprecated/Retired). Renamed section to "Lifecycle". |
| Danger zone copy `142 entitled projects will be notified` | Out of scope  | Runtime data; we use configuration count instead.                           |

### Additions / deviations
- **Owner project** field exists in the impl but **not** in the Pencil mockup (mockup omits owner). Required by the API.
- **Lifecycle** card title differs (Pencil: `Launch Stage`).
- Delete confirmation requires typing the canonical `serviceName` — Pencil has a generic destructive button.

### Navigation
- Tab is `Settings` in both designs and impl.

---

## 7. `O9haD` / `QAaQy` / `JKdfj` / `7klzj` — Wizard → `/services/new`

**Route:** `services.new.tsx` (Read 1230 lines).

The Pencil mockup is a **7-step "New Configuration"** flow (Basic Info → Dependencies → IAM → Quota → Billing → Telemetry → Activity → Review). Per the task brief we shipped a **4-step "Create Service"** flow.

| Pencil step              | Implemented? | Where                          |
| ------------------------ | ------------ | ------------------------------ |
| 1. Basic Info            | ✅ adapted    | `Step1Identity` (step=1)        |
| 2. Dependencies          | ❌            | API gap                         |
| 3. IAM                   | ❌            | API gap                         |
| 4. Quota                 | ❌            | API gap                         |
| 5. Billing               | ❌            | API gap (per-meter billing fields are inside step 3 instead) |
| 6. Telemetry             | ❌            | Out of scope                    |
| 7. Activity              | ❌            | Out of scope                    |
| 8. Review                | ✅            | `Step4Review` (step=4)          |
| *(implementation extra)* | ✅            | `Step2Mrts` — Pencil has no MRT step |
| *(implementation extra)* | ✅            | `Step3Meters` — Pencil hides meters in Billing |

### What ships in our 4-step flow

**Header:** `New service` title + subtitle, single `X` close button (confirms when dirty). Pencil shows `New Configuration — Compute` with a `Based on v3.0.0` subline (we have neither — the impl is a "create service from scratch" flow, not "version a config based on …").

**Sidebar stepper** (260px wide, `Steps` group): four `<StepperItem>`s with `done` / `active` / `pending` states.

**Step 1 — Service identity:** displayName (auto-slugs to serviceName), Customize toggle for serviceName, description with `0 / 1000` counter, ownerProject.

**Step 2 — Monitored resource types:** empty state (`No monitored resource types yet` + `Add resource type`); when populated, stack of `<MrtCardEditor>` cards with type / displayName / description / GVK group / GVK kind / labels chip input + `Add another` button. Per-MRT delete via trash icon.

**Step 3 — Meters:** same shape as step 2 with meter fields. The "Bound monitored resource types" multi-select is populated from step 2 and shows a helper string when MRT list is empty.

**Step 4 — Review & create:** read-only summary cards (Service identity + Initial configuration v1.0.0 (Draft) with bullet lists of MRTs and meters), info `<Alert>` ("Created in Draft"), confirmation `<Checkbox>`. Submit button gated on the checkbox.

**Footer:** sticky `← Back` and `Next →` / `Create service`. Next is disabled while the current step has validation errors. Create button shows `Creating…` while submitting.

**Submit:** sequential POSTs — Service then ServiceConfiguration `<serviceName>-v1-0-0`. On Service success but ServiceConfiguration failure, returns `partial: { serviceCreated: true }` and surfaces an inline destructive `<Alert>`. Redirects to `/services/<name>?tab=configurations` on full success.

### Pencil elements missing

| Pencil step / element                          | Class         | Note                                                                                |
| ---------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `Save draft` footer button (every step)        | Not built     | We don't persist mid-flight wizard state; closing discards.                         |
| `Versioning Suggestion` panel on step 1        | Not built     | `Suggested patch change` callout — we hard-code `v1.0.0`.                          |
| `Based on v3.0.0` subtitle in header           | N/A           | Our wizard creates from scratch.                                                    |
| Step 2 (Dependencies)                          | API gap       | No dependency model.                                                                 |
| Step 3 (IAM)                                   | API gap       | No IAM model.                                                                        |
| Step 4 (Quota)                                 | API gap       | No quota model.                                                                      |
| Step 5 (Billing) — Add billing rule rows       | API gap       | The CRD's billing fields are per-meter (consumedUnit / pricingUnit), shipped in step 3. |
| Step 6 (Telemetry) — Add telemetry sources     | Out of scope  | No telemetry pipeline configuration in CRD.                                         |
| Step 7 (Activity) — N/A label                  | Out of scope  |                                                                                     |
| `Save as Draft` + `Create & Activate` split on Review | Replaced | Single `Create service` button — always creates Draft (no activate path).            |
| Activation impact warning on Review            | N/A           | Not relevant when always creating Draft.                                            |

### Additions / deviations
- **Step 2 (MRTs)** and **Step 3 (Meters)** have no Pencil counterparts — they're new steps tailored to the API.
- **`I confirm the service name and owner project are correct`** checkbox is added on Review; Pencil uses an "I have reviewed all changes …" checkbox (similar concept, different copy).
- **Validation** is client-side per step plus server-side re-validation on submit.

### Navigation
- URL param `?step=N` controls the active step; Pencil has no URL contract for the wizard.

---

## 8. `yke71` — Consumer Catalog → `/catalog`

**Route:** `catalog._index.tsx` (Read 170 lines).

### What ships
- Loader filters `phase === "Published"`, sorts by `displayName` (locale-aware ascending).
- Header: `Service catalog` h1 + subtitle.
- Search input (top, 100 max-w-sm) — client-side filter against `displayName`, `serviceName`, `description`. Not pushed to URL.
- Responsive grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6`).
- Per-card: placeholder `<Server>` icon in `bg-primary/10` tile, `Published` success badge top-right, `displayName` h3, `by <ownerProject>` (mono, fallback `Unknown`), `description` clamped to 3 lines (fallback `No description provided.`).
- Card is wrapped in `<Link to="/services/:name">` with focus-ring styles.
- Two empty states: "No services available yet" (no published services) and "No matches for `<query>`" + Clear button (search miss).

### Pencil elements missing

| Element                                                     | Class         | Note                                                                                |
| ----------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| Filter chip row: `All`, `Compute`, `Storage`, `Networking`, `Security`, `AI/ML` | API gap | No `categories` field.                                                              |
| Grid/list view toggle (top right of filter bar)             | Not built     | Single grid view.                                                                    |
| Per-card distinct icons (`cpu`, `hard-drive`, `shield`, `network`, `brain`, `database`) | API gap | No `icon` field — single placeholder used.                                  |
| `GA` badge inside each card                                  | API gap       | We always show `Published`. `Alpha`/`Beta`/`GA` don't exist in our phases.          |
| `ENABLE` primary CTA inside each card                        | Out of scope  | No entitlement API. Whole card is the link instead.                                  |
| Top nav with notification bell + avatar                      | Out of scope  | Not part of this work.                                                               |
| Page title `Service Catalog` size `48px tracking -2`         | Style         | Impl uses `text-4xl` (32px). Could bump to `text-5xl`.                               |

### Additions / deviations
- Two-empty-state pattern (catalog empty vs. search empty) is added — Pencil shows only the populated state.
- Owner project is rendered with monospaced font; Pencil uses `by Provider Name` in regular weight.

### Navigation
- AppLayout sidebar exposes `/catalog` under the `Browse` group (per `AppLayout.tsx` lines 84–98). Card links go to `/services/:name`. Pencil top nav suggests `Catalog`, `My Services`, `Providers` tabs which we do not implement (no provider/tenant concept).

---

## 9. Cross-cutting observations

These apply to every screen and may warrant a single follow-up rather than per-screen fixes.

### Phase semantics mismatch
- **Pencil** uses `Alpha` / `Beta` / `GA` / `Deprecated` for service maturity ("Launch Stage") and `Active` / `Superseded` / `Retired` for configuration lifecycle.
- **API** uses a single `Phase` enum on both `Service` and `ServiceConfiguration`: `Draft` / `Published` / `Deprecated` / `Retired`.
- **Implementation** maps `Published`→`Active`, `Deprecated`→`Superseded` only on **configuration cards**. Service phase is shown verbatim. This is centralised in `phaseBadgeProps` in `~/lib/format.ts`. Confirm with backend whether `Alpha`/`Beta`/`GA` will ever be modelled — if so, the mapping needs to grow.

### Top navigation mismatch
- **Pencil** every screen carries a dark global top nav with `DATUM CLOUD` brand, `Services` / `Catalog` / `Settings` tabs, notification bell, avatar.
- **Implementation** uses a left sidebar (`SidebarProvider` from `@datum-cloud/datum-ui/sidebar`) with `Browse → Catalog` and `Manage → Services`, plus a thin top header with breadcrumbs only.
- Decision: confirm whether the sidebar shell is the canonical layout going forward or whether a top-nav refactor is planned.

### Out-of-scope feature surfaces
The following Pencil concepts are pervasive but have **no API surface and no controller work**:
- **Adoption / Entitlements** — counts (e.g. `142 entitlements`), affected projects, "+8% from last month" trends.
- **Communications** — notifications, consumer-facing announcements.
- **Activity** — audit log of who did what, when.
- **Telemetry** — metrics, alerts, health.
- **Billing** as a pricing surface (not the per-meter billing fields we already model).
- **Quota / IAM / Dependencies** as discoverable graphs.
- **Documentation URLs**, **icons**, **categories** as metadata.

If/when these become API surfaces, the Pencil mockup tells us exactly where they belong.

### Items that **could** be built against the existing API and aren't yet

> **Zero-backend-work tickets.** Everything in this list is a UI-only
> change — the API surface is already there. Confirmed with
> backend-engineer 2026-05-05.

- **Service-list filter/search input** (`H4KnG`).
- **Service-list summary line** (`N total · N Published · N Draft …`).
- **Configurations tab → "was active N days"** — derive from the next-newer version's `status.publishedAt` minus this version's `status.publishedAt`.
- **`Activate` action** on the Draft pending banner — `PATCH /spec/phase` from `Draft` to `Published`. The webhook already validates this transition.
- **`New configuration` (standalone)** — separate from the create-service wizard.
- **Service Overview Quick Actions card** — at minimum `View in Catalog` (`<Link to="/catalog">`) when `phase === "Published"`.
- **Service-detail header sub-line** — render `spec.serviceName` (the canonical reverse-DNS identifier, e.g. `compute.miloapis.com`) under the title in `<PageTitle>`. This is a first-class field already in the loader; do **not** confuse it with `metadata.name` (the URL slug).
- **Configuration-detail header chrome** — show `v<version>` + phase badge inline with the title for `ServiceConfiguration` detail (currently the title is the k8s resource name).

### Items shipped that are **not** in the Pencil design (additions)
- `Conditions` table on the Overview tab (operator-facing).
- `Configurations` count column on the service list.
- `Age` column (relative time) on the service list.
- Delete-confirmation typed-name gate on the Settings danger zone.
- URL-driven step state (`?step=N`) on the wizard.
- `?tab=` URL contract on the service detail page.
- Empty states for configurations tab, catalog, search-no-match.

---

## 10. Recommended next steps (advisory)

These are not required by the audit task, but flagging for the team lead.

1. **Quick wins (existing API):**
   - Add a search input to the service list (`H4KnG`).
   - Add a phase summary line under the service list title.
   - Wire the Draft `Activate` button to a `PATCH /spec/phase` action.
   - Add `View in Catalog` quick-action on the Overview tab when `phase===Published`.
   - Render `v<version>` + phase badge in the configuration-detail page header.

2. **Backend cross-check needed (send to backend-engineer):**
   - Decision on `Alpha`/`Beta`/`GA` maturity vs. our `Phase` enum.
   - Whether `Service` will ever carry `icon`, `categories`, `documentation` URLs, or release-notes.
   - Whether `ServiceConfiguration` will ever carry release-notes / commit-notes.
   - Whether `Service`/`ServiceConfiguration` should track an immutable author identity (`created-by` annotation?) for the "Activated by" byline.
   - Whether a future `Entitlement` / `Adoption` resource is in scope for the catalog UI.

3. **Out-of-scope confirmations:**
   - Adoption metrics, comms, activity log, telemetry, IAM/quota/dependencies, billing rates, export/rollback — confirm these are intentionally deferred so the design system can be pruned or split.

---

*End of report.*
