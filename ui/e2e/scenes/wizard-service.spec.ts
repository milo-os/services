import { test } from '@playwright/test';

test('new service wizard', async ({ page }) => {
  await page.goto('/services/new');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('h1').filter({ hasText: /new service/i }).waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1_000);

  // ── Step 1 — Service identity ─────────────────────────────────────────────
  const displayNameInput = page.getByLabel(/display name/i);
  await displayNameInput.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  await displayNameInput.fill('Analytics Platform');
  await page.waitForTimeout(300);

  await page.getByLabel(/description/i).fill(
    'Usage analytics and cost attribution for Milo-hosted workloads.'
  );
  await page.waitForTimeout(300);

  await page.getByLabel(/owner project/i).fill('platform-producer-project');
  await page.waitForTimeout(2_000);

  // ── Step 2 — Monitored resource types ─────────────────────────────────────
  const nextBtn = page.getByRole('button', { name: /next/i });
  await nextBtn.click().catch(() => {});
  await page.waitForTimeout(2_000);

  const addMrtBtn = page.getByRole('button', { name: /add.*resource type|add mrt/i }).first();
  if (await addMrtBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await addMrtBtn.click();
    await page.waitForTimeout(400);
    const typeInput = page.getByPlaceholder(/resource type/i).first();
    if (await typeInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await typeInput.fill('analytics.miloapis.com/Job');
    }
    await page.waitForTimeout(1_500);
  } else {
    await page.waitForTimeout(1_500);
  }

  // ── Step 3 — Meters ───────────────────────────────────────────────────────
  await nextBtn.click().catch(() => {});
  await page.waitForTimeout(2_500);

  // ── Step 4 — Review ───────────────────────────────────────────────────────
  await nextBtn.click().catch(() => {});
  await page.waitForTimeout(2_500);
});
