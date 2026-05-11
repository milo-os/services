# UX Spec — Service Detail: Settings Tab

**Pencil node:** `GzZys` (frame "Service Dashboard - Settings")
**Implements task:** #7
**Route:** `services.$name.tsx`, content under the `Settings` tab.

---

## 1. Purpose

A single pane for editing the mutable fields of a `Service` and for the
two destructive actions (deprecate, delete). The Pencil mockup shows
several editorial fields the API does not have yet (icon, categories,
documentation URLs); per the task brief we scope this tab to **what
the CRD actually supports**:

| Form field    | API path                              | Editable? |
| ------------- | ------------------------------------- | --------- |
| Display name  | `spec.displayName`                    | yes       |
| Description   | `spec.description`                    | yes       |
| Owner project | `spec.owner.producerProjectRef.name`  | yes       |
| Phase         | `spec.phase`                          | yes (with rules — see §4) |
| Service name  | `spec.serviceName`                    | **no** — read-only, immutable canonical key |

`status.publishedAt` and `status.conditions` are read-only; surface them
on the Overview tab, not here.

---

## 2. Page chrome

The page header (icon, displayName, badges, breadcrumb back link) and
tab strip are owned by `services.$name.tsx`. This work renders the body
when the active tab is `Settings`.

- Tab label: `Settings` — last in the tab strip, matches the existing
  Overview / Configurations / Settings ordering. (The Pencil mockup
  shows extra tabs — Adoption, Communications, Activity — which are
  out of scope.)

---

## 3. Component tree

```tsx
import { Button } from "@datum-cloud/datum-ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@datum-cloud/datum-ui/card";
import { Input } from "@datum-cloud/datum-ui/input";
import { Label } from "@datum-cloud/datum-ui/label";
import { Textarea } from "@datum-cloud/datum-ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datum-cloud/datum-ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@datum-cloud/datum-ui/alert-dialog";
import { Form, useActionData, useNavigation } from "@remix-run/react";
```

```
<div className="flex flex-col gap-8 max-w-3xl">

  {/* 3a. Service Identity */}
  <Card>
    <CardHeader>
      <CardTitle>Service identity</CardTitle>
      <CardDescription>Public-facing metadata for this service.</CardDescription>
    </CardHeader>
    <Form method="post" replace>
      <input type="hidden" name="intent" value="updateIdentity" />
      <CardContent className="flex flex-col gap-5">

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceName">Service name</Label>
          <Input id="serviceName" name="serviceName" value={service.spec.serviceName} disabled />
          <p className="text-xs text-muted-foreground">Immutable. Used as the canonical reference from configurations.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" name="displayName" defaultValue={service.spec.displayName} required maxLength={120} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={service.spec.description} rows={4} maxLength={1000} />
          <p className="text-xs text-muted-foreground">{(description ?? "").length} / 1000</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerProject">Owner project</Label>
          <Input id="ownerProject" name="ownerProject" defaultValue={service.spec.owner?.producerProjectRef?.name} required />
          <p className="text-xs text-muted-foreground">Project that owns this service. Must reference an existing project.</p>
        </div>

      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button type="reset" variant="ghost">Reset</Button>
        <Button type="submit" disabled={navigation.state !== "idle"}>
          {navigation.state !== "idle" ? "Saving…" : "Save changes"}
        </Button>
      </CardFooter>
    </Form>
  </Card>

  {/* 3b. Lifecycle phase */}
  <Card>
    <CardHeader>
      <CardTitle>Lifecycle</CardTitle>
      <CardDescription>Controls visibility to consumers.</CardDescription>
    </CardHeader>
    <Form method="post" replace>
      <input type="hidden" name="intent" value="updatePhase" />
      <CardContent className="flex flex-col gap-3">
        <Select name="phase" defaultValue={service.spec.phase}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Draft">Draft — not visible to consumers</SelectItem>
            <SelectItem value="Published">Published — listed in the catalog</SelectItem>
            <SelectItem value="Deprecated">Deprecated — visible but discouraged</SelectItem>
            <SelectItem value="Retired" disabled={!canRetire}>Retired — frozen, no new use</SelectItem>
          </SelectContent>
        </Select>
        <PhaseTransitionHelp from={service.spec.phase} />
      </CardContent>
      <CardFooter className="justify-end gap-2 border-t">
        <Button type="submit" disabled={navigation.state !== "idle"}>Update phase</Button>
      </CardFooter>
    </Form>
  </Card>

  {/* 3c. Danger zone */}
  <Card className="border-destructive">
    <CardHeader className="bg-destructive/5">
      <CardTitle className="text-destructive">Danger zone</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-6 pt-6">

      <DangerRow
        title="Deprecate service"
        body="Hide from the consumer catalog and warn existing consumers. Reversible — you can republish later."
      >
        <Button variant="destructive" onClick={() => submitPhase("Deprecated")}
                disabled={service.spec.phase === "Deprecated" || service.spec.phase === "Retired"}>
          Deprecate service
        </Button>
      </DangerRow>

      <Separator />

      <DangerRow
        title="Delete service"
        body={
          configurationCount > 0
            ? `Cannot delete: ${configurationCount} configuration${configurationCount === 1 ? "" : "s"} still reference this service. Delete or retire them first.`
            : "Permanently remove this service. This cannot be undone."
        }
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={configurationCount > 0}>Delete service</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {service.spec.displayName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Type <code>{service.spec.serviceName}</code> below to confirm. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input name="confirm" autoComplete="off" />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} disabled={typedConfirm !== service.spec.serviceName}>
                Delete service
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DangerRow>

    </CardContent>
  </Card>
</div>
```

`DangerRow` is a tiny local component — `<div class="flex items-center
justify-between gap-4">` with a title/body block on the left and the
button slot on the right.

---

## 4. Validation rules

| Field         | Rule                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| displayName   | Required. 1–120 chars. Trim before submit.                                                   |
| description   | Optional. ≤ 1000 chars.                                                                      |
| ownerProject  | Required. Must match `^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$` (k8s name). Server validates existence. |
| serviceName   | Read-only. Never sent in PATCH.                                                              |
| phase         | Allowed transitions:                                                                          |
|               |  • `Draft` → `Published`, `Retired`                                                          |
|               |  • `Published` → `Deprecated`, `Retired`                                                     |
|               |  • `Deprecated` → `Published`, `Retired`                                                     |
|               |  • `Retired` → terminal (no transitions; phase select is disabled)                           |

`canRetire` is true when `configurationCount === 0` OR all configs are
themselves `Retired`. The `<PhaseTransitionHelp>` component renders a
short hint under the select describing what each transition means
(consumers gain/lose visibility, etc.).

---

## 5. Action handlers

Single `action` in `services.$name.tsx`. Branch on `formData.get("intent")`.

```ts
export async function action({ request, params }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");
  const name = params.name!;

  switch (intent) {
    case "updateIdentity": {
      const patch = [
        { op: "replace", path: "/spec/displayName", value: form.get("displayName") },
        { op: "replace", path: "/spec/description", value: form.get("description") || "" },
        { op: "replace", path: "/spec/owner/producerProjectRef/name", value: form.get("ownerProject") },
      ];
      await fetchK8s(request, `/apis/services.miloapis.com/v1alpha1/services/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json-patch+json" },
        body: JSON.stringify(patch),
      });
      return json({ ok: true, intent });
    }
    case "updatePhase":
    case "deprecate": {
      const phase = intent === "deprecate" ? "Deprecated" : form.get("phase");
      const patch = [{ op: "replace", path: "/spec/phase", value: phase }];
      await fetchK8s(request, `/apis/services.miloapis.com/v1alpha1/services/${name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json-patch+json" },
        body: JSON.stringify(patch),
      });
      return json({ ok: true, intent });
    }
    case "delete": {
      if (form.get("confirm") !== form.get("serviceName")) {
        return json({ ok: false, error: "Confirmation did not match." }, { status: 400 });
      }
      await fetchK8s(request, `/apis/services.miloapis.com/v1alpha1/services/${name}`, {
        method: "DELETE",
      });
      return redirect("/services");
    }
    default:
      return json({ ok: false, error: "Unknown intent." }, { status: 400 });
  }
}
```

**Important:** never use `Response.json()`. Always
`import { json } from "@remix-run/node"`.

Show success via a toast (`useToast` from `@datum-cloud/datum-ui/use-toast`)
keyed off `actionData?.ok && actionData.intent`. Show errors via inline
form errors plus toast.

---

## 6. Confirmation copy

| Action                       | Title / button                              | Body                                                                                                                       |
| ---------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Deprecate from Danger zone   | `Deprecate service` (destructive button)    | Inline copy: "Hide from the consumer catalog and warn existing consumers. Reversible — you can republish later."         |
| Delete (config count > 0)    | Button disabled                             | Hover/inline: `Cannot delete: N configuration(s) still reference this service. Delete or retire them first.`              |
| Delete (config count = 0)    | `Delete <displayName>?` (AlertDialog title) | `Type <serviceName> below to confirm. This action cannot be undone.` Confirm button enabled only when typed text matches. |

---

## 7. Loader contract

`services.$name.tsx` already loads the `Service`. Extend it to fetch
the configurations referencing the service so we can compute
`configurationCount` for the delete gate. (Spec #1 already requires
this — reuse the same data.)

```ts
return json({
  service,
  configurations: mine,                     // all phases
  configurationCount: mine.length,          // for delete gate
  drafts, published, history,               // for Configurations tab
});
```

`configurationCount` for the **delete** gate counts configs in
`{Draft, Published, Deprecated}`. `Retired` configs do not block
deletion — they are inert.

---

## 8. Gap analysis vs. Pencil design

| Pencil element                                | Status      | Reason                                                       |
| --------------------------------------------- | ----------- | ------------------------------------------------------------ |
| Display name input                            | Render      | `spec.displayName`                                           |
| Description textarea                          | Render      | `spec.description`                                           |
| Owner project (mockup omits this)             | **Add**     | Required by task brief; not in Pencil but we need it         |
| Icon picker section                           | **Omit**    | No icon field in CRD                                         |
| Categories tag input                          | **Omit**    | No categories field in CRD                                   |
| Documentation card (docs/quickstart/api URLs) | **Omit**    | None of these fields exist in CRD                            |
| Launch Stage (Alpha/Beta/GA/Deprecated)       | **Replace** | Use `spec.phase` (Draft/Published/Deprecated/Retired) — the actual API. Renamed section to "Lifecycle". |
| Deprecate Service danger row                  | Render      | Wraps a phase patch to `Deprecated`                          |
| Delete Service danger row                     | Render      | Gated by `configurationCount` instead of "entitled projects" |
| "142 entitled projects will be notified"      | **Omit**    | No notification system; runtime data not exposed             |

---

## 9. Acceptance checklist (for ui-engineer)

- [ ] Settings tab body renders three cards: Identity, Lifecycle, Danger zone.
- [ ] `serviceName` input is disabled.
- [ ] Submit posts to the route's own action with the correct `intent` value.
- [ ] Identity submit issues a JSON-merge patch via `fetchK8s`.
- [ ] Phase submit honours allowed-transition rules (disable disallowed `<SelectItem>`s).
- [ ] Delete button disabled when `configurationCount > 0`; tooltip explains why.
- [ ] Delete confirmation requires typing the `serviceName` exactly.
- [ ] Successful delete redirects to `/services` with a toast.
- [ ] Loader returns `configurationCount` (only counts non-Retired configs).
- [ ] No `Response.json()` anywhere. All `@datum-cloud/datum-ui` imports use subpaths.
