# UX Spec — Create Service Wizard (4-step)

**Pencil nodes:** `O9haD` (Step 1), `QAaQy` / `JKdfj` (mid-step shell reference), `7klzj` (Review)
**Implements task:** #9
**Route:** `services.new.tsx`

---

## 1. Purpose

A guided wizard for creating a new `Service` plus its initial Draft
`ServiceConfiguration` in a single submit. The Pencil mockup is a
7-step "New Configuration" flow; the task brief calls for a 4-step
"Create Service" flow that bundles the first config — we follow the
brief and adapt the Pencil chrome (sidebar stepper, sticky footer)
to the simpler API surface.

| Step | Name              | Resource              |
| ---- | ----------------- | --------------------- |
| 1    | Service identity  | `Service`             |
| 2    | Monitored resource types | `ServiceConfiguration` (Draft) |
| 3    | Meters            | `ServiceConfiguration` (Draft) |
| 4    | Review & create   | submits both          |

The wizard always creates the new `ServiceConfiguration` in
`spec.phase: Draft`. Publishing is a follow-up action from the
configurations list — keeping the create flow short.

---

## 2. URL contract

- The wizard lives at `/services/new`.
- The active step is held in URL search param `?step=<1..4>`. Default
  to `1` when missing or out of range.
- Wizard form state lives in `useState`/`useReducer` in the route
  component. Submitting any step's "Next" button validates the step
  and navigates to `?step=<n+1>`. We do not persist intermediate state
  to localStorage in v1.
- The header `X` close button navigates to `/services` after
  confirming "Discard changes?" if any field is dirty.

---

## 3. Page chrome

```tsx
import { Button } from "@datum-cloud/datum-ui/button";
import { Separator } from "@datum-cloud/datum-ui/separator";
import { Check, ChevronRight, X } from "lucide-react";
```

```
<div className="grid h-screen grid-rows-[auto_1fr]">

  {/* 3a. Header */}
  <header className="flex items-center justify-between border-b px-14 py-6">
    <div>
      <h1 className="text-xl font-bold">New service</h1>
      <p className="text-sm text-muted-foreground">Create a service definition and its first configuration.</p>
    </div>
    <Button variant="ghost" size="icon" onClick={confirmClose} aria-label="Close">
      <X className="h-5 w-5" />
    </Button>
  </header>

  {/* 3b. Body: sidebar + content */}
  <div className="grid grid-cols-[280px_1fr] overflow-hidden">

    <aside className="border-r bg-card p-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Steps</p>
      <ol className="flex flex-col gap-1">
        <StepperItem n={1} label="Service identity"             active={step === 1} done={step > 1} />
        <StepperItem n={2} label="Monitored resource types"     active={step === 2} done={step > 2} />
        <StepperItem n={3} label="Meters"                       active={step === 3} done={step > 3} />
        <StepperItem n={4} label="Review & create"              active={step === 4} done={false} />
      </ol>
    </aside>

    <div className="flex flex-col">
      <main className="flex-1 overflow-auto px-14 py-10">
        {step === 1 && <Step1Identity        form={form} setForm={setForm} errors={errors} />}
        {step === 2 && <Step2Mrts            form={form} setForm={setForm} errors={errors} />}
        {step === 3 && <Step3Meters          form={form} setForm={setForm} errors={errors} mrts={form.mrts} />}
        {step === 4 && <Step4Review          form={form} />}
      </main>

      {/* 3c. Sticky footer */}
      <footer className="flex items-center justify-between border-t bg-card px-14 py-5">
        <Button variant="ghost" disabled={step === 1} onClick={back}>← Back</Button>
        <div className="flex gap-2">
          {step < 4 ? (
            <Button onClick={next}>Next →</Button>
          ) : (
            <Form method="post">
              <Button type="submit" disabled={!consented || submitting}>
                {submitting ? "Creating…" : "Create service"}
              </Button>
            </Form>
          )}
        </div>
      </footer>
    </div>
  </div>
</div>
```

`StepperItem` renders a row with a circular badge:
- Active step → primary fill, white number.
- Done step → success fill, white check.
- Future step → muted ring, grey number.

---

## 4. Step 1 — Service identity

### Fields

| Field         | API path                              | Validation                                                                                         |
| ------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Service name  | `Service.spec.serviceName` and `metadata.name` | Required. `^[a-z]([-a-z0-9]*[a-z0-9])?$`, ≤ 63 chars. Lowercased on input. Auto-generated from displayName by default; user can override. Must be unique across cluster (validated server-side; surface conflict errors inline). |
| Display name  | `Service.spec.displayName`            | Required. 1–120 chars. Trim before submit.                                                         |
| Description   | `Service.spec.description`            | Optional. ≤ 1000 chars. Char counter under the field.                                              |
| Owner project | `Service.spec.owner.producerProjectRef.name` | Required. k8s name regex.                                                                |

### Layout

- `<h2>Service identity</h2>`
- `<p className="text-muted-foreground">Public metadata for the new service. Service name is the immutable canonical key — it cannot be changed later.</p>`
- Form fields stacked, each with `<Label>` + `<Input>` (or `<Textarea>` for description).
- Below `Display name`, render a small computed slug preview: `Service name will be: <strong>{slugify(displayName)}</strong>` with a "Customize" link that reveals the editable Service name input.

### Helper text

- `Service name`: "Lowercase letters, digits and hyphens. Used in URLs and across configurations."
- `Display name`: "Shown in the catalog and in dashboards."
- `Owner project`: "Project that owns and operates this service."

---

## 5. Step 2 — Monitored resource types

The wizard maintains `form.mrts: MrtDraft[]` where:

```ts
type MrtDraft = {
  type: string;                  // unique within the array, kebab-case
  displayName: string;
  description: string;
  gvk: { group: string; kind: string };
  labels: string[];              // free-form labels surfaced in the catalog
};
```

### Layout

- `<h2>Monitored resource types</h2>`
- `<p>Define the resources whose usage this service will meter. You can add more later by editing the configuration.</p>`
- Empty state: a dashed-border card centred in the content area with body
  `No monitored resource types yet.` and a primary `Add resource type` button.
- Once at least one exists, render a stacked list of `<Card>` per MRT
  with: `<CardHeader>` showing `type` + `delete` icon-button on the right,
  `<CardContent>` with the form fields inline.
- A footer `Add another` button below the last card.

### Per-MRT validation

| Field          | Rule                                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| type           | Required. Unique within the list. `^[a-z]([-a-z0-9]*[a-z0-9])?$`.                   |
| displayName    | Required. 1–120 chars.                                                              |
| description    | Optional. ≤ 500 chars.                                                              |
| gvk.group      | Required. RFC 1123 subdomain. e.g. `compute.miloapis.com`.                          |
| gvk.kind       | Required. PascalCase, must start with uppercase letter.                             |
| labels[]       | Optional. Free-form chip input.                                                     |

The Next button is enabled even with **zero MRTs** — meters can exist
without MRTs (it's a soft warning at step 4 if both are empty).

---

## 6. Step 3 — Meters

```ts
type MeterDraft = {
  name: string;
  displayName: string;
  description: string;
  measurement: { aggregation: "Sum" | "Max" | "Average" | "Count"; unit: string };
  billing: { consumedUnit: string; pricingUnit: string };
  monitoredResourceTypes: string[];   // references mrt.type values from step 2
};
```

### Layout

Same pattern as step 2: empty state + stacked cards + `Add another`.
The `monitoredResourceTypes` field is a multi-select populated from
the names entered in step 2; if step 2 is empty, render the
multi-select but disabled with helper text "Add a monitored resource
type in step 2 to bind meters to it."

### Per-meter validation

| Field                          | Rule                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| name                           | Required. Unique. `^[a-z]([-a-z0-9]*[a-z0-9])?$`.                          |
| displayName                    | Required. 1–120 chars.                                                     |
| description                    | Optional. ≤ 500 chars.                                                     |
| measurement.aggregation        | Required. One of Sum / Max / Average / Count.                              |
| measurement.unit               | Required. Free text (e.g. `bytes`, `requests`, `seconds`).                 |
| billing.consumedUnit           | Required. Free text.                                                       |
| billing.pricingUnit            | Required. Free text.                                                       |
| monitoredResourceTypes         | At least one when `form.mrts.length > 0`. Optional otherwise.              |

---

## 7. Step 4 — Review & create

Read-only summary, grouped:

- **Service** card → identity fields from step 1.
- **Initial configuration** card → labelled `v1.0.0 (Draft)`. Body:
  table rows for "Monitored resource types" (count + bullet list of
  display names) and "Meters" (count + bullet list).

Below the cards, an `Alert variant="info"` reads:

> The service and its first configuration will be created in **Draft**.
> Publish from the Configurations tab when you're ready to expose it
> to consumers.

Then a `<Checkbox>` `I understand` style confirmation:

> "I confirm the service name and owner project are correct. The
> service name cannot be changed after creation."

Submit button enabled only when the checkbox is checked.

---

## 8. Submit action

Single Remix `action` posted only from step 4. It performs **two**
sequential `fetchK8s` calls.

```ts
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const payload = JSON.parse(form.get("payload") as string) as WizardForm;

  // 1) Create Service
  const service = await fetchK8s<Service>(request, "/apis/services.miloapis.com/v1alpha1/services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiVersion: "services.miloapis.com/v1alpha1",
      kind: "Service",
      metadata: { name: payload.serviceName },
      spec: {
        serviceName: payload.serviceName,
        displayName: payload.displayName,
        description: payload.description ?? "",
        phase: "Draft",
        owner: { producerProjectRef: { name: payload.ownerProject } },
      },
    }),
  });

  // 2) Create initial ServiceConfiguration
  const configName = `${payload.serviceName}-v1-0-0`;
  await fetchK8s(request, "/apis/services.miloapis.com/v1alpha1/serviceconfigurations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiVersion: "services.miloapis.com/v1alpha1",
      kind: "ServiceConfiguration",
      metadata: { name: configName },
      spec: {
        serviceRef: { name: payload.serviceName },
        version: "1.0.0",
        phase: "Draft",
        monitoredResourceTypes: payload.mrts,
        meters: payload.meters,
      },
    }),
  });

  return redirect(`/services/${payload.serviceName}#configurations`);
}
```

If step 1 succeeds but step 2 fails, the action **does not** roll back
step 1. Instead it returns `json({ error: ..., partial: { serviceCreated: true } })`
and the UI shows an inline error: "Service `<name>` was created but
the initial configuration failed: <message>. You can retry creating
the configuration from the service detail page." This is acceptable
because Service is the canonical resource and a service with no
configuration is a valid intermediate state in the CRD model.

Always use `import { json, redirect } from "@remix-run/node"` —
never `Response.json()`.

---

## 9. Component imports

```tsx
import { Alert, AlertDescription } from "@datum-cloud/datum-ui/alert";
import { Button } from "@datum-cloud/datum-ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@datum-cloud/datum-ui/card";
import { Checkbox } from "@datum-cloud/datum-ui/checkbox";
import { Input } from "@datum-cloud/datum-ui/input";
import { Label } from "@datum-cloud/datum-ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datum-cloud/datum-ui/select";
import { Separator } from "@datum-cloud/datum-ui/separator";
import { Textarea } from "@datum-cloud/datum-ui/textarea";
```

---

## 10. Gap analysis vs. Pencil design

| Pencil element                                              | Status   | Reason                                                          |
| ----------------------------------------------------------- | -------- | --------------------------------------------------------------- |
| 7-step flow (Basic Info, Dependencies, IAM, Quota, Billing, Telemetry, Activity, Review) | **Reduce to 4** | API only models Service + MRTs + Meters. Per task brief.     |
| Header subtitle "Based on v3.0.0"                            | **Omit** | This is for editing/duplicating an existing config; create flow has no parent version. |
| "Save Draft" footer button                                   | **Omit** | We do not persist mid-flight state. The user can close and start over. |
| "Versioning Suggestion" inline blue panel on step 1          | **Omit** | Initial version is hard-coded `1.0.0`.                          |
| Dependencies / IAM / Quota / Billing / Telemetry steps       | **Omit** | None of these have API surface. (Billing rates and meters are different concepts.) |
| `Activation impact` warning on Review                        | **Omit** | We are creating Draft, not activating. No impact to existing entitlements. |
| `Save as draft` + `Create & activate` split buttons on Review | **Replace** | Single `Create service` button — always creates Draft.        |
| Sidebar stepper                                              | Render    | Adapted to 4 steps.                                              |
| Sticky footer with Back / Next                               | Render    | Same shell.                                                      |
| `X` close icon in header                                     | Render    | With dirty-state confirmation.                                   |

---

## 11. Acceptance checklist (for ui-engineer)

- [ ] Route is `services.new.tsx`.
- [ ] `?step=1..4` controls the active step; out-of-range falls back to 1.
- [ ] Wizard state held in route component (no localStorage).
- [ ] Header `X` confirms before discarding when fields are dirty.
- [ ] Sidebar stepper highlights active and completed steps.
- [ ] Step 1 auto-generates `serviceName` from `displayName` (slugify) and lets the user override.
- [ ] Step 2 supports add/edit/remove MRTs; per-MRT validation; allows zero MRTs.
- [ ] Step 3 supports add/edit/remove meters; multi-select for `monitoredResourceTypes` populated from step 2.
- [ ] Step 4 renders a read-only summary plus a confirm checkbox; submit disabled until checked.
- [ ] Single `action` issues two POSTs (Service then ServiceConfiguration), redirects to `/services/<name>#configurations` on success.
- [ ] Partial success (Service created but Config failed) renders an inline error and does not retry the Service POST.
- [ ] All imports use `@datum-cloud/datum-ui` subpaths.
- [ ] No `Response.json()` anywhere.
