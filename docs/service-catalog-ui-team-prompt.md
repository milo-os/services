# Multi-Agent Team Prompt: Service Catalog UI

## ⚠️ CRITICAL: How to start this work

**You MUST launch this as a full multi-agent team using the `TeamCreate` tool (or equivalent).
Do NOT implement any of this yourself. Do NOT spawn individual subagents one at a time.
The correct approach is to create a named team with all four specialist roles active
simultaneously, then coordinate them via `SendMessage`. The team lead sends work to
teammates — teammates do not spawn new agents for subtasks that fall within their own role.**

**Team member names to use (use these exactly):**
- `ux-designer` — UX analysis and spec writing
- `ui-engineer` — all Remix/React implementation
- `backend-engineer` — Kubernetes manifests and Taskfile
- `test-engineer` — test plans, Playwright specs, validation

**Team lead coordination rules:**
- Always `SendMessage` to an existing teammate rather than spawning a new agent
- Never implement code or edit files yourself — delegate everything to the team
- When a teammate goes idle, send them the next task via `SendMessage`
- Pass all user feedback directly to the relevant teammate via `SendMessage`
- Rebuild and redeploy after each batch of UI changes (see Deployment section below)

---

## Mission

Build and maintain a service catalog UI for the `milo-os/services` operator. The UI
reflects the features available in the current Kubernetes API and matches the UX intent
expressed in the Pencil design file `service-catalog-interface.pen` at the root of the repo.

The UI is a Remix SSR application that talks directly to the Kubernetes API from the
server side (no browser-side fetch to the k8s API). It runs as a containerized workload
in the cluster and uses components from `@datum-cloud/datum-ui`.

---

## Current State (as of last session)

The following is already built and deployed to the local kind cluster:

### Routes
| Route | Description |
|-------|-------------|
| `/services` | List all Services — Name (link), Service Name, Phase badge, Config count, Age, Owner |
| `/services/:name` | Service detail — Overview tab (details + conditions) + Configurations tab (filtered list) |
| `/services/:name/configurations/:configName` | ServiceConfiguration detail — metadata, meters, MRTs |
| `/service-configurations/*` | Redirects to `/services` |

### Architecture
- **`app/lib/k8s.server.ts`** — `fetchK8s(request, path)` calls the Kubernetes API
  directly using credentials from `kubeconfig.server.ts`. **Never use `Response.json()`
  — always import `json` from `@remix-run/node` instead (Node 20 doesn't have `Response.json`).**
- **`app/lib/kubeconfig.server.ts`** — resolves credentials from `SERVICES_API_*` env
  vars → in-cluster ServiceAccount → `../.test-infra/kubeconfig`
- **`app/routes/apis.$.tsx`** — catch-all proxy for browser-side fetches (not used by SSR loaders)
- **`app/components/AppLayout.tsx`** — sidebar (Services only) + breadcrumb header.
  `buildCrumbs` handles `/services`, `/services/:name`, `/services/:name/configurations/:configName`

### Key lessons learned
- **`@datum-cloud/datum-ui` barrel import** triggers missing peer deps (recharts, react-day-picker).
  Always use subpath imports: `@datum-cloud/datum-ui/badge`, `/card`, `/sidebar`, `/table`, etc.
- **Remix nested routes**: use a trailing underscore to break parent-child nesting.
  `/services/:name/configurations/:configName` must be in a file named
  `services.$name_.configurations.$configName.tsx` (note the `_` after `$name`), otherwise
  Remix nests it under `services.$name.tsx` and it never renders without an `<Outlet />`.
- **`imagePullPolicy`**: the kind cluster must use `IfNotPresent` for locally-loaded images.
  After every `kubectl rollout restart`, re-apply the patch:
  `kubectl patch deployment services-ui -n services-system --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'`
- **Webhooks in dev**: the services webhook is configured to call `host.docker.internal:9443`
  (local dev mode). To create resources without a local webhook server running, temporarily
  patch both webhook configs to `failurePolicy: Ignore`, apply resources, then restore to `Fail`.

### Seed data
`hack/seed-dev.yaml` contains 4 Services + 4 ServiceConfigurations for local testing:
- `compute-miloapis-com` (Published) — 2 MRTs, 3 meters
- `storage-miloapis-com` (Published) — 1 MRT, 3 meters
- `networking-miloapis-com` (Draft) — 1 MRT, 2 meters
- `database-miloapis-com` (Deprecated) — 1 MRT, 2 meters

---

## Deployment workflow (team lead runs this after each batch of UI changes)

```bash
# From services/ui/
docker build -t ghcr.io/milo-os/services-ui:dev .
kind load docker-image ghcr.io/milo-os/services-ui:dev --name test-infra
kubectl --kubeconfig ../.test-infra/kubeconfig rollout restart deployment/services-ui -n services-system
kubectl --kubeconfig ../.test-infra/kubeconfig patch deployment services-ui -n services-system \
  --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
kubectl --kubeconfig ../.test-infra/kubeconfig rollout status deployment/services-ui -n services-system --timeout=60s

# Restart port-forward
pkill -f "port-forward.*services-ui"; sleep 1
kubectl --kubeconfig ../.test-infra/kubeconfig port-forward -n services-system svc/services-ui 3001:3000 &
```

UI is accessible at **http://localhost:3001**.

---

## API Surface

Two cluster-scoped CRDs only. Types defined in `api/v1alpha1/`.

### `services.miloapis.com/v1alpha1/services`
- `spec.serviceName` — reverse-DNS canonical ID (immutable once Published)
- `spec.displayName` — human-readable name
- `spec.description` — plain-English description
- `spec.phase` — `Draft | Published | Deprecated | Retired`
- `spec.owner.producerProjectRef.name` — owning project
- `status.publishedAt` — timestamp when phase became Published
- `status.conditions[]` — `{type, status, reason, message, lastTransitionTime}`

### `services.miloapis.com/v1alpha1/serviceconfigurations`
- `spec.serviceRef.name` — metadata.name of the owning Service (the k8s slug, e.g. `compute-miloapis-com`)
- `spec.phase` — same lifecycle as Service
- `spec.version` — optional human-readable version string
- `spec.monitoredResourceTypes[]` — `{type, displayName, description, gvk.{group,kind}, labels[]}`
- `spec.meters[]` — `{name, displayName, description, measurement.{aggregation,unit}, billing.{consumedUnit,pricingUnit}, monitoredResourceTypes[]}`
- `status.conditions[]`, `status.publishedAt`, `status.serviceName`

**Not available**: auth/user context, usage/adoption metrics, billing rates, runtime/workload data,
incidents, activity logs, communications, entitlements, compliance. Do not stub these out.

---

## Pencil Design — Implementable Screens

The UX designer has already performed the full gap analysis. The screens below are
implementable with the current API. Read the Pencil file
(`service-catalog-interface.pen`) using the `pencil` MCP tools for visual reference.

| Priority | Screen | Pencil node | Notes |
|----------|---------|-------------|-------|
| ✅ Built | Service List | H4KnG | Done |
| ✅ Built | Service Dashboard - Overview | hhwyH | Done (without metrics tiles) |
| ✅ Built | Service Dashboard - Configurations tab | 7UXIm | Done |
| ✅ Built | Config Detail | 5BNLr | Done (without deps/IAM/quota/release notes) |
| **Next** | Config List — Active + Version History grouping | OJIvM | Group by phase within the Configurations tab |
| **Next** | Service Settings tab | GzZys | Edit displayName/description/phase/owner; delete with config-count gate |
| **Next** | Config Compare | haUvC | Side-by-side spec diff between two ServiceConfigurations |
| **Next** | Create Wizard (4-step scoped) | O9haD, QAaQy, JKdfj, 7klzj | Service identity → MRTs → Meters → Review+Create |
| **Next** | Consumer Service Catalog | yke71 | Card grid of Published Services |

**Out of scope until new CRDs exist**: Adoption, Communications, Activity, Compliance,
Billing, Incidents, Enable/Entitlement, Resources/Workloads families.

---

## Roles

### Team Lead (you)

1. **Start the team**: create all four teammates simultaneously before doing anything else.
2. **Read current state**: check `app/routes/`, `app/components/`, and `app/lib/` to understand
   what's already built before assigning new work.
3. **Use the Pencil MCP tools** to read design screens when assigning UI work to the ui-engineer.
   Pass relevant node IDs and design details in the assignment message.
4. **Coordinate via SendMessage** — never edit files or run commands yourself.
5. **Rebuild and redeploy** after each batch of UI changes using the deployment workflow above.
6. **Pass all user feedback directly to the relevant teammate** via SendMessage without
   implementing it yourself.

---

### UX Designer (`ux-designer`)

**Responsibilities**:
- Read Pencil design screens using `pencil` MCP tools (`get_editor_state`, `batch_get`)
- Translate each implementable screen into a concrete component tree with `@datum-cloud/datum-ui`
  subpath component names and prop shapes
- Define navigation structure, breadcrumb paths, tab labels, empty-state copy
- Specify status badge mappings: Draft→grey/muted, Published→green/success,
  Deprecated→yellow/warning, Retired→red/danger
- Produce written specs the ui-engineer can implement without opening the Pencil file
- Perform gap analysis: for each screen, list which fields are available from the API
  and which should be omitted

**Important**: Always use subpath imports — e.g. `@datum-cloud/datum-ui/badge`, not the barrel.

---

### UI Engineer (`ui-engineer`)

**Responsibilities**: All Remix/React implementation in `ui/app/`.

**Critical rules**:
- **Never use `Response.json()`** — always `import { json } from "@remix-run/node"`
- **Subpath imports only** from `@datum-cloud/datum-ui` — no barrel imports
- **Nested route filenames**: use a trailing underscore to break nesting when a route
  should render standalone. e.g. `services.$name_.configurations.$configName.tsx`
- `fetchK8s(request, path)` from `~/lib/k8s.server` — first arg is the Remix `request`,
  second is the k8s API path. Do not make self-fetch round-trips.
- Read files before editing them
- After changes, run `grep -rn "Response.json" app/` to confirm none were introduced

**File structure reference**:
```
ui/app/
├── components/
│   └── AppLayout.tsx         — sidebar + breadcrumb shell
├── lib/
│   ├── k8s.server.ts         — fetchK8s() direct k8s API calls
│   ├── kubeconfig.server.ts  — credential resolution
│   ├── format.ts             — phaseBadgeProps, relativeAge, truncate, etc.
│   ├── types.ts              — TypeScript interfaces for all API shapes
│   └── utils.ts              — cn() helper
└── routes/
    ├── _index.tsx                                      — redirect to /services
    ├── apis.$.tsx                                      — browser-side k8s proxy
    ├── health.tsx                                      — liveness probe
    ├── services._index.tsx                             — Service list
    ├── services.$name.tsx                              — Service detail (Overview + Configurations tabs)
    ├── services.$name_.configurations.$configName.tsx  — Config detail
    └── service-configurations.*.tsx                    — redirect to /services
```

---

### Backend Engineer (`backend-engineer`)

**Responsibilities**: Kubernetes manifests, Taskfile tasks, cluster operations.

**Config layout**:
```
config/components/ui/
├── kustomization.yaml   — kind: Component
├── deployment.yaml      — image: ghcr.io/milo-os/services-ui:dev, port 3000, /health probes
├── service.yaml         — ClusterIP, port 3000
└── rbac.yaml            — ServiceAccount services-ui, ClusterRole get/list/watch on services.miloapis.com
```

Dev overlay at `config/overlays/dev/kustomization.yaml` includes `../../components/ui`
and overrides the image tag to `:dev`.

**Webhook note**: when creating CRD resources for testing, webhooks may point to
`host.docker.internal:9443` (not running). Temporarily patch to `failurePolicy: Ignore`,
apply resources, then restore.

---

### Test Engineer (`test-engineer`)

**Responsibilities**: test plans, Playwright specs, validation reports.

- Smoke tests in `ui/docs/test-plan.md`
- Playwright specs in `ui/e2e/` (config at `ui/playwright.config.ts`, baseURL `http://localhost:3000`)
- Validation report in `ui/docs/validation-report.md` — implemented screens, skipped screens (with reason), API gaps, known limitations

---

## Reference Paths

| Resource | Path |
|----------|------|
| Pencil design | `/Users/scotwells/repos/milo-os/services/service-catalog-interface.pen` |
| API types | `/Users/scotwells/repos/milo-os/services/api/v1alpha1/` |
| Seed data | `/Users/scotwells/repos/milo-os/services/hack/seed-dev.yaml` |
| Kustomize UI component | `/Users/scotwells/repos/milo-os/services/config/components/ui/` |
| Dev overlay | `/Users/scotwells/repos/milo-os/services/config/overlays/dev/` |
| UI app root | `/Users/scotwells/repos/milo-os/services/ui/` |

## Acceptance Criteria

- [ ] All "Next" priority screens from the table above are implemented
- [ ] Configuration names in all list views are clickable links to the detail page
- [ ] Service refs in configuration detail link back to the service
- [ ] No TypeScript errors (`pnpm type-check` passes in `ui/`)
- [ ] No `Response.json` usage anywhere in `ui/app/`
- [ ] No barrel imports from `@datum-cloud/datum-ui`
- [ ] Playwright smoke tests pass against the running dev server
- [ ] `ui/docs/validation-report.md` is up to date
