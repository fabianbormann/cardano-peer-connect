import { test, expect } from '@playwright/test';

test('renders the connect panel and a dApp peer id (no wallet needed)', async ({ page }) => {
  await page.goto('/');

  // App mounted (catches runtime import / mount failures the build alone misses).
  await expect(page.getByRole('heading', { name: 'CIP-45 Demo dApp' })).toBeVisible();

  // The peer id is available offline (DAppPeerConnect uses an explicit peerjs id),
  // so it renders without a live signaling connection or a paired wallet.
  await expect(page.getByText(/dapp-[a-z0-9]+-[a-z0-9]+/i)).toBeVisible({ timeout: 15_000 });

  // Before any wallet pairs, the API is absent.
  await expect(page.getByText('No API')).toBeVisible();
});
