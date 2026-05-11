# UX Spec — Create Configuration Wizard (existing Service)

**Pencil nodes:** `O9haD` / `QAaQy` / `JKdfj` / `7klzj` (re-read with the original "New Configuration" framing — i.e. add a new version to an *existing* service).
**Implements task:** #20 (new — supplements the create-service flow).
**Route:** `services.$name_.configurations.new.tsx` → `/services/:name/configurations/new`

---

## 1. Purpose

Add a new version of `ServiceConfiguration` to an existing `Service`.
The Pencil mockup is the canonical "New Configuration — Compute /
Based on v3.0.0" wizard; in our API surface the meaningful payload is
just `version`, `monitoredResourceTypes[]`, `meters[]`. No identity
step — `serviceRef.name` is fixed by the URL.

| Step | Name                   | Resource fields touched                                |
| ---- | ---------------------- | ------------------------------------------------------ |
| 1    | Version & source       | `spec.version`; optionally clone MRTs/meters from existing config |
| 2    | Monitored resource types | `spec.monitoredResourceTypes[]`                      |
| 3    | Meters                 | `spec.meters[]`                                        |
| 4    | Review & create        | submit                                                 |

The new configuration is always created in `spec.phase: "Draft"`. The
user can publish it from the configurations tab afterwards (same
"Activate" pattern flagged as a future quick-win in the gap report).

---

## 2. URL contract

- Route: `/services/:name/configurations/new`. The trailing `_` on
  `services.$name_` keeps this route out of the Service detail tab
  shell so the wizard renders full-screen, like the create-service
  wizard.
- Active step: `?step=1..4`, default `1`, out-of-range falls back to
  `1`.
- Cancel/close: header `X` → confirm-when-dirty → navigate to
  `/services/:name?tab=configurations`.

---

## 3. Reuse, don't reimplement

`services.new.tsx` already owns:

- `MrtDraft`, `MeterDraft` types
- `MrtCardEditor`, `MeterCardEditor` components
- `validateStep2` (MRTs), `validateStep3` (meters) — both pure
- `StepperItem`, `FieldError`
- `NAME_RE`, `KIND_RE`, `SUBDOMAIN_RE`, `AGGREGATIONS`
- `newMrt()`, `newMeter()`

**Plan:** extract these into shared modules so both wizards consume
them. Suggested layout:

```
ui/app/components/wizard/
├── MrtCardEditor.tsx        // exported component + MrtDraft type + newMrt()
├── MeterCardEditor.tsx      // exported component + MeterDraft type + newMeter()
├── StepperItem.tsx
├── FieldError.tsx
└── wizard-validation.ts     // NAME_RE, KIND_RE, SUBDOMAIN_RE, AGGREGATIONS,
                             // validateMrts(), validateMeters(),
                             // validateConfigVersion()
```

`services.new.tsx` is updated in the same change to import from these
modules instead of defining them inline. **No behaviour change** for
the create-service wizard — purely a refactor. Run `pnpm type-check`
after.

---

## 4. Step 1 — Version & source

### Layout

```tsx
import { Alert, AlertDescription, AlertTitle } from "@datum-cloud/datum-ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@datum-cloud/datum-ui/card";
import { Input } from "@datum-cloud/datum-ui/input";
import { Label } from "@datum-cloud/datum-ui/label";
import { RadioGroup, RadioGroupItem } from "@datum-cloud/datum-ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datum-cloud/datum-ui/select";
import { Lightbulb } from "lucide-react";
```

```
<div className="flex flex-col gap-6 max-w-2xl">
  <header>
    <h2 className="text-xl font-semibold">Version &amp; source</h2>
    <p className="text-sm text-muted-foreground">
      Pick a version for this configuration. Optionally clone the
      monitored resource types and meters from an existing version
      to get started.
    </p>
  </header>

  <div className="flex flex-col gap-1.5">
    <Label htmlFor="version">Version</Label>
    <Input id="version" value={form.version} onChange={…} placeholder="e.g. 1.2.0" />
    <p className="text-xs text-muted-foreground">
      Use semantic versioning. {previousVersion ? `Previous version: ${previousVersion}.` : "This will be the first version."}
    </p>
    <FieldError message={errors.version} />
  </div>

  {suggestedVersion && (
    <Alert variant="info">
      <Lightbulb className="h-4 w-4" />
      <AlertTitle>Version suggestion</AlertTitle>
      <AlertDescription className="flex items-center gap-3">
        <span>Based on the latest version, we suggest <strong>{suggestedVersion}</strong>.</span>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => setForm({ ...form, version: suggestedVersion })}
        >
          Use this
        </button>
      </AlertDescription>
    </Alert>
  )}

  <div className="flex flex-col gap-2">
    <Label>Start from</Label>
    <RadioGroup value={form.source} onValueChange={onSourceChange}>
      <label className="flex items-start gap-3 cursor-pointer">
        <RadioGroupItem value="blank" />
        <div>
          <p className="text-sm font-medium">Blank</p>
          <p className="text-xs text-muted-foreground">Start with no monitored resource types or meters.</p>
        </div>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <RadioGroupItem value="clone" disabled={configs.length === 0} />
        <div>
          <p className="text-sm font-medium">Clone an existing version</p>
          <p className="text-xs text-muted-foreground">
            Copy MRTs and meters from a previous configuration; you can edit them in the next steps.
          </p>
        </div>
      </label>
    </RadioGroup>

    {form.source === "clone" && (
      <Select value={form.cloneFrom} onValueChange={onCloneSourceChange}>
        <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a version…" /></SelectTrigger>
        <SelectContent>
          {configs.map((c) => (
            <SelectItem key={c.metadata.name} value={c.metadata.name}>
              v{c.spec.version} ({phaseBadgeProps(c.spec.phase).label})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </div>
</div>
```

### Behaviour

- **Suggested version**: if `previousVersion` parses as semver
  (`major.minor.patch`), suggest `${major}.${minor + 1}.0`. If no
  prior config exists, suggest `1.0.0`. The user can override.
- **Clone**: when the user picks a clone source, immediately copy
  `spec.monitoredResourceTypes` and `spec.meters` into `form.mrts`
  and `form.meters` (one-time, deep-cloned). Switching back to
  `blank` clears them. Switching to a different clone source replaces
  them.
- **No release-notes field**. The Pencil mockup includes a markdown
  "Release Notes" textarea — there is no field on
  `ServiceConfiguration` to hold it. **Omit** per the existing gap
  analysis policy.

### Validation rules (`validateConfigVersion`)

| Field   | Rule                                                                                                  |
| ------- | ----------------------------------------------------------------------------------------------------- |
| version | Required. Match `^\d+\.\d+\.\d+$` (strict semver, no pre-release). 1–32 chars. Unique among existing configs of this service (case-insensitive). The metadata.name `${params.name}-v${version.replace(/\./g, "-")}` must also be a valid k8s name (≤ 253 chars). |
| source  | Required. Either `blank` or `clone`.                                                                  |
| cloneFrom (when `source === "clone"`) | Required. Must be the metadata.name of one of the loader-returned configs. |

---

## 5. Steps 2 & 3 — MRTs and Meters (reuse)

Render `<MrtCardEditor>` and `<MeterCardEditor>` from
`~/components/wizard/`. Layout, empty state, "Add another" button,
trash-icon delete, and per-card validation are identical to
`services.new.tsx` steps 2 and 3 — no UI changes.

The only difference: when the user arrived at this wizard via the
`clone` option, the lists are pre-populated. The user edits in place
before submit.

---

## 6. Step 4 — Review & create

### Layout

```
<div className="flex flex-col gap-6 max-w-3xl">
  <header>
    <h2 className="text-xl font-semibold">Review &amp; create</h2>
    <p className="text-sm text-muted-foreground">
      Confirm the values below. The new configuration is created in <strong>Draft</strong>.
    </p>
  </header>

  {/* Configuration summary card */}
  <Card>
    <CardHeader><CardTitle>Configuration v{form.version} (Draft)</CardTitle></CardHeader>
    <CardContent>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
        <DefRow label="Service">{service.spec.displayName} (<code className="font-mono text-xs">{service.spec.serviceName}</code>)</DefRow>
        <DefRow label="Version">{form.version}</DefRow>
        <DefRow label="Source">{form.source === "clone" ? `Cloned from v${cloneSourceVersion}` : "Blank"}</DefRow>
        <DefRow label="Phase">Draft</DefRow>
        <DefRow label="Monitored resource types">{form.mrts.length}</DefRow>
        <DefRow label="Meters">{form.meters.length}</DefRow>
      </dl>
    </CardContent>
  </Card>

  {/* Changes-from card (only when cloning) */}
  {form.source === "clone" && cloneSource && (
    <Card>
      <CardHeader><CardTitle>Changes from v{cloneSourceVersion}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ChangesSummary leftMrts={cloneSource.spec.monitoredResourceTypes} rightMrts={form.mrts}
                        leftMeters={cloneSource.spec.meters}              rightMeters={form.meters} />
      </CardContent>
    </Card>
  )}

  {/* Created in Draft notice */}
  <Alert variant="info">
    <AlertTitle>Created in Draft</AlertTitle>
    <AlertDescription>
      The new configuration is created in <strong>Draft</strong>. Publish from the Configurations tab when you're ready.
    </AlertDescription>
  </Alert>

  {/* Confirmation checkbox */}
  <label className="flex items-start gap-3 cursor-pointer">
    <Checkbox checked={consented} onCheckedChange={(v) => setConsented(v === true)} />
    <span className="text-sm">I confirm the version and contents are correct.</span>
  </label>
</div>
```

### `<ChangesSummary>`

Reuse `diffByKey` and `countDiff` from `~/lib/diff.ts` (already
written for the compare screen — see spec #3 / task #8). Render two
short lines:

```
Monitored resource types: +2 added · −1 removed · 1 modified · 4 unchanged
Meters:                   +1 added · 3 unchanged
```

If a category has zero changes, write `no changes`. If the entire
diff is zero, write `Identical to v<source>.`

This is value-add over the Pencil mockup's "Changes from v3.0.0"
bullet list — same intent, derived from the actual diff.

---

## 7. Submit action

```ts
export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const raw = form.get("payload");
  if (typeof raw !== "string") {
    return json({ ok: false, error: "Missing wizard payload." }, { status: 400 });
  }

  const payload = JSON.parse(raw) as WizardForm;
  const serviceName = params.name!;

  // Re-validate server-side. Reuse shared validators.
  const errors = {
    ...validateConfigVersion(payload, existingVersions),
    ...validateMrts(payload.mrts),
    ...validateMeters(payload.meters, payload.mrts),
  };
  if (Object.keys(errors).length > 0) {
    return json({ ok: false, error: Object.values(errors).join(" ") }, { status: 400 });
  }

  const configName = `${serviceName}-v${payload.version.replace(/\./g, "-")}`;
  try {
    await fetchK8s(request, "/apis/services.miloapis.com/v1alpha1/serviceconfigurations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiVersion: "services.miloapis.com/v1alpha1",
        kind: "ServiceConfiguration",
        metadata: { name: configName },
        spec: {
          serviceRef: { name: serviceName },
          version: payload.version,
          phase: "Draft",
          monitoredResourceTypes: payload.mrts,
          meters: payload.meters,
        },
      }),
    });
  } catch (e) {
    return json(
      { ok: false, error: `Failed to create configuration: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  return redirect(`/services/${encodeURIComponent(serviceName)}?tab=configurations`);
}
```

- **No partial-success branch**. Unlike the create-service wizard,
  this is a single-resource create — either it succeeds or it
  doesn't.
- **Always Draft.** Even if/when an "Activate" path lands later,
  this wizard creates Draft only. Two-step (create → publish) keeps
  the wizard simple and the audit trail clean.
- **Use `import { json, redirect } from "@remix-run/node"`** — never
  `Response.json()`.

### Inline error rendering

Per the brief: errors render an inline `<Alert variant="destructive">`
above the wizard content (same pattern as `services.new.tsx`):

```tsx
{actionData && !actionData.ok ? (
  <Alert variant="destructive" className="mb-6">
    <AlertTitle>Couldn't create configuration</AlertTitle>
    <AlertDescription>{actionData.error}</AlertDescription>
  </Alert>
) : null}
```

---

## 8. Loader contract

```ts
export async function loader({ request, params }: LoaderFunctionArgs) {
  const name = params.name!;
  const [service, configList] = await Promise.all([
    fetchK8s<Service>(request, `/apis/services.miloapis.com/v1alpha1/services/${encodeURIComponent(name)}`),
    fetchK8s<KubeList<ServiceConfiguration>>(request, `/apis/services.miloapis.com/v1alpha1/serviceconfigurations`),
  ]);
  const mine = (configList.items ?? []).filter((c) => c.spec.serviceRef.name === service.metadata.name);
  // Newest first; useful for the clone-from select default and version suggestion.
  mine.sort((a, b) => {
    const at = a.status?.publishedAt ?? a.metadata.creationTimestamp;
    const bt = b.status?.publishedAt ?? b.metadata.creationTimestamp;
    return new Date(bt).getTime() - new Date(at).getTime();
  });
  const previousVersion = mine.find((c) => c.spec.version)?.spec.version ?? null;
  const suggestedVersion = suggestNextVersion(previousVersion);
  return json({
    service,
    configs: mine,
    existingVersions: mine.map((c) => c.spec.version).filter(Boolean),
    previousVersion,
    suggestedVersion,
  });
}
```

`suggestNextVersion(prev)` — parses prev as `major.minor.patch`,
returns `${major}.${minor + 1}.0`. Returns `"1.0.0"` when prev is
null / unparseable. Lives in `~/components/wizard/wizard-validation.ts`.

---

## 9. Page chrome

Mirror `services.new.tsx`:

- Header: title `New configuration`, subtitle `for {service.spec.displayName}` (mockup says "New Configuration — Compute" — use displayName here). `X` close button on the right (confirm when dirty).
- Sidebar (260px, `Steps`): four `<StepperItem>`s — `Version & source`, `Monitored resource types`, `Meters`, `Review & create`.
- Content: scrollable, `px-10 py-8`.
- Sticky footer: `← Back` (disabled on step 1) + `Next →` / `Create configuration`. Next is disabled when current step has validation errors. Submit is gated on the consent checkbox.

---

## 10. Gap analysis vs. Pencil

| Pencil element                                              | Status      | Reason                                                              |
| ----------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| Header subtitle "Based on v3.0.0"                           | Render      | Render only when source === "clone". Otherwise show the service name. |
| Step 1 — Version field                                       | Render      |                                                                     |
| Step 1 — Release Notes textarea                             | **Omit**    | No release-notes field on ServiceConfiguration (API gap; flagged in §10.2 of gap report — backend-engineer is reviewing). |
| Step 1 — Version Suggestion blue panel                      | Render      | Generated from `previousVersion`. "Use this" button populates the field. |
| Steps 2 (Dependencies), 3 (IAM), 4 (Quota)                   | **Omit**    | API gap. Flagged out-of-scope in gap report.                         |
| Step 5 (Billing) — separate destinations / metric mappings   | **Replace** | Per-meter billing (consumedUnit / pricingUnit) is the actual API surface, edited inside the meter editor in step 3. |
| Step 6 (Telemetry)                                          | **Replace** | Telemetry config is the MRT + meter pair, edited in steps 2 & 3.    |
| Step 7 (Activity)                                           | **Omit**    | Out of scope.                                                        |
| Step 8 (Review) — Configuration Summary card                | Render      | Keys aligned to API fields.                                          |
| Step 8 (Review) — Changes from v3.0.0 bullet list            | **Replace** | Replaced with `<ChangesSummary>` derived from `diffByKey()`. Renders only when source === "clone". |
| Step 8 (Review) — Activation Impact warning ("12 active entitlements affected") | **Omit** | Out of scope (no entitlement API). And not relevant — we always create Draft, not activate. |
| Step 8 (Review) — `Save as Draft` + `Create & Activate` split | **Replace** | Single `Create configuration` button — always Draft.              |
| `Save Draft` footer button (every step)                     | **Omit**    | No mid-flight persistence (mirrors the create-service wizard).      |

---

## 11. Acceptance checklist (for ui-engineer)

- [ ] Refactor: extract `MrtCardEditor`, `MeterCardEditor`, `StepperItem`, `FieldError`, validation helpers, and shared types from `services.new.tsx` into `~/components/wizard/`. Update `services.new.tsx` imports. `pnpm type-check` passes.
- [ ] Route file is `services.$name_.configurations.new.tsx`. Trailing `_` to break out of the tab shell.
- [ ] Loader returns `{ service, configs, existingVersions, previousVersion, suggestedVersion }`.
- [ ] `?step=1..4` controls the active step; out-of-range falls back to `1`.
- [ ] Step 1: version input + suggestion panel + RadioGroup for `blank` / `clone` + clone-source `<Select>`. "Use this" applies the suggested version.
- [ ] Choosing a clone source deep-copies `spec.monitoredResourceTypes` and `spec.meters` into the wizard form. Switching to `blank` clears them.
- [ ] Steps 2 & 3 reuse the shared `<MrtCardEditor>` and `<MeterCardEditor>`.
- [ ] Step 4: summary card; "Changes from v<source>" card only when cloning, populated via `diffByKey`; info Alert; consent Checkbox.
- [ ] Action POSTs the config with `metadata.name = <serviceName>-v<version-with-dashes>`, `spec.phase: "Draft"`. Server re-validates with shared helpers.
- [ ] On success → redirect to `/services/<name>?tab=configurations`.
- [ ] On error → inline `<Alert variant="destructive">` at the top of the wizard content.
- [ ] Header `X` close confirms when dirty (via `window.confirm` like the create-service wizard) and routes to `/services/<name>?tab=configurations` on confirm.
- [ ] `import { json, redirect } from "@remix-run/node"` — no `Response.json()`.
- [ ] All `@datum-cloud/datum-ui` imports use subpaths.
- [ ] Update the disabled `New configuration` placeholder buttons in `services.$name.tsx` (top-right of the configurations tab body and the empty-state card) to enabled `<Link>` elements pointing at `/services/<name>/configurations/new`. Drop the `Coming soon` tooltip.
