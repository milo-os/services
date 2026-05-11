import { test, expect } from '@playwright/test';

/**
 * Curated walkthrough used to generate the automated UI demo recording.
 * Runs against a seeded kind cluster (hack/seed-dev.yaml).
 *
 * Keep this script slow and deliberate — it is the reviewer's first look
 * at the UI, not a regression guard. Assertions are minimal: just enough
 * to confirm each screen loaded before moving on.
 */
test('service catalog walkthrough', async ({ page }) => {
  // ── 1. Consumer catalog ──────────────────────────────────────────────────
  await page.goto('/catalog');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: /service catalog/i })
  ).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(3_000);

  // ── 2. Services list (provider view) ─────────────────────────────────────
  await page.goto('/services');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: /services/i }).first()
  ).toBeVisible({ timeout: 10_000 });
  // Let viewer read the phase badges
  await page.waitForTimeout(3_000);

  // ── 3. Service detail — Compute ───────────────────────────────────────────
  await page.getByRole('link', { name: 'compute-miloapis-com' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2_500);

  // ── 4. Configurations tab ─────────────────────────────────────────────────
  const configsTab = page.getByRole('tab', { name: /configurations/i });
  if (await configsTab.isVisible()) {
    await configsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3_000);

    // Open the published configuration if one exists
    const viewLink = page.getByRole('link', { name: /view/i }).first();
    if (await viewLink.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await viewLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3_000);
      await page.goBack();
      await page.waitForLoadState('networkidle');
    }
  }

  // ── 5. New service wizard ─────────────────────────────────────────────────
  await page.goto('/services/new');
  await page.waitForLoadState('networkidle');
  await expect(
    page.getByRole('heading', { name: /new service/i })
  ).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1_500);

  // Step 1 — Service identity
  const displayNameInput = page.getByLabel(/display name/i);
  await displayNameInput.click();
  // Type deliberately so the viewer can follow along
  await displayNameInput.pressSequentially('Analytics Platform', { delay: 60 });
  await page.waitForTimeout(1_000);

  const descInput = page.getByLabel(/description/i);
  await descInput.click();
  await descInput.pressSequentially(
    'Usage analytics and cost attribution for Milo-hosted workloads.',
    { delay: 30 }
  );
  await page.waitForTimeout(1_000);

  const ownerInput = page.getByLabel(/owner project/i);
  await ownerInput.click();
  await ownerInput.pressSequentially('platform-producer-project', { delay: 40 });
  await page.waitForTimeout(2_000);

  // Advance to Step 2 (Monitored resource types)
  const nextBtn = page.getByRole('button', { name: /next/i });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(2_500);
  }

  // ── 6. Consumer catalog — outro ───────────────────────────────────────────
  await page.goto('/catalog');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2_500);
});
