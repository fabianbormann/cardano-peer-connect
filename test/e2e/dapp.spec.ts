import { test, expect, Browser } from '@playwright/test';

test('DApp peer connect initializes, shows a peer ID and renders a QR code', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/test/e2e/test_dApp.html');

  const address = page.locator('#address');

  // Peer ID must be non-empty and match the fingerprint format: dapp-<base36hash>-<base24timestamp>
  await expect(address).not.toBeEmpty();
  const text = await address.textContent();
  expect(text).toMatch(/^dapp-[a-z0-9]+-[a-z0-9]+$/);

  // QR code SVG must be rendered inside the container
  await expect(page.locator('#qr-code svg')).toBeVisible();
});

// ── Shared setup ──────────────────────────────────────────────────────────────
// Opens DApp and wallet in isolated contexts, waits until the wallet's API is
// injected into the DApp.  Caller is responsible for closing both contexts.
async function connectAndInjectApi(browser: Browser) {
  const dappContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const walletContext = await browser.newContext({ baseURL: 'http://localhost:3000' });

  await dappContext.addInitScript(() => localStorage.clear());
  await walletContext.addInitScript(() => localStorage.clear());

  const dappPage = await dappContext.newPage();
  const walletPage = await walletContext.newPage();

  await dappPage.goto('/test/e2e/test_dApp.html');

  const dappPeerId = await dappPage.locator('#address').textContent();
  expect(dappPeerId).toMatch(/^dapp-[a-z0-9]+-[a-z0-9]+$/);

  // `serve` strips .html extensions and query params in redirects, so we pass
  // the DApp peer ID via localStorage using a second init script (runs after clear).
  await walletContext.addInitScript((id: string) => {
    localStorage.setItem('test-dapp-peer-id', id);
  }, dappPeerId as string);

  await walletPage.goto('/test/e2e/test_wallet.html');

  await expect(dappPage.locator('#connection-status')).toHaveText('Connected', { timeout: 15_000 });
  await expect(walletPage.locator('#connection-status')).toHaveText('Connected', { timeout: 15_000 });
  await expect(dappPage.locator('#api-status')).toHaveText('API Injected', { timeout: 15_000 });

  return { dappPage, walletPage, dappContext, walletContext };
}

// ── Two-instance tests ────────────────────────────────────────────────────────

test('DApp and wallet exchange CIP-30 messages', async ({ browser }) => {
  const { dappPage, dappContext, walletContext } = await connectAndInjectApi(browser);
  try {
    await dappPage.locator('#btn-get-network-id').click();
    await expect(dappPage.locator('#network-id')).toHaveText('1', { timeout: 10_000 });
  } finally {
    await dappContext.close();
    await walletContext.close();
  }
});

test('DApp signs data and wallet returns a verifiable fake signature', async ({ browser }) => {
  const { dappPage, dappContext, walletContext } = await connectAndInjectApi(browser);
  try {
    await dappPage.locator('#sign-addr').fill('addr_test1mock');
    await dappPage.locator('#sign-message').fill('Hello, Cardano!');
    await dappPage.locator('#btn-sign-data').click();

    // Result section becomes visible once the RPC completes
    await expect(dappPage.locator('#sign-result')).toBeVisible({ timeout: 10_000 });

    // Payload is the UTF-8 hex encoding of "Hello, Cardano!"
    await expect(dappPage.locator('#sign-payload-hex'))
      .toHaveText('48656c6c6f2c2043617264616e6f21');

    // Signature and key must be non-empty hex strings
    await expect(dappPage.locator('#sign-signature')).toHaveText(/^[0-9a-f]+$/);
    await expect(dappPage.locator('#sign-key')).toHaveText(/^[0-9a-f]+$/);

    // Decoded signature confirms the wallet received the correct address and message
    await expect(dappPage.locator('#sign-decoded')).toContainText('FAKE-SIG');
    await expect(dappPage.locator('#sign-decoded')).toContainText('addr_test1mock');
    await expect(dappPage.locator('#sign-decoded')).toContainText('Hello, Cardano!');
  } finally {
    await dappContext.close();
    await walletContext.close();
  }
});

test('DApp signData rejects with the wallet-thrown CIP-30 error object', async ({ browser }) => {
  const { dappPage, dappContext, walletContext } = await connectAndInjectApi(browser);
  try {
    // The mock wallet throws DataSignError {code: 3} when the message is 'THROW'
    await dappPage.locator('#sign-addr').fill('addr_test1mock');
    await dappPage.locator('#sign-message').fill('THROW');
    await dappPage.locator('#btn-sign-data').click();

    await expect(dappPage.locator('#sign-error')).toBeVisible({ timeout: 10_000 });
    await expect(dappPage.locator('#sign-error')).toContainText('"code":3');
    await expect(dappPage.locator('#sign-error')).toContainText('User declined');
  } finally {
    await dappContext.close();
    await walletContext.close();
  }
});

test('Wallet method resolving undefined reaches the DApp as null (no hang)', async ({ browser }) => {
  const { dappPage, dappContext, walletContext } = await connectAndInjectApi(browser);
  try {
    await dappPage.locator('#btn-get-collateral').click();
    await expect(dappPage.locator('#collateral-result')).toHaveText('null', { timeout: 10_000 });
  } finally {
    await dappContext.close();
    await walletContext.close();
  }
});

test('signing timeout is configurable and rejects instead of resolving', async ({ browser }) => {
  const dappContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const walletContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  await dappContext.addInitScript(() => localStorage.clear());
  await walletContext.addInitScript(() => localStorage.clear());
  // Tell the test dApp page to construct with a 2s signing timeout
  await dappContext.addInitScript(() => localStorage.setItem('test-signing-timeout-ms', '2000'));

  const dappPage = await dappContext.newPage();
  const walletPage = await walletContext.newPage();
  await dappPage.goto('/test/e2e/test_dApp.html');
  const dappPeerId = await dappPage.locator('#address').textContent();
  await walletContext.addInitScript((id: string) => {
    localStorage.setItem('test-dapp-peer-id', id);
  }, dappPeerId as string);
  await walletPage.goto('/test/e2e/test_wallet.html');
  await expect(dappPage.locator('#api-status')).toHaveText('API Injected', { timeout: 15_000 });

  try {
    // 'HANG' makes the mock wallet never respond → the 2s override must reject
    await dappPage.locator('#sign-message').fill('HANG');
    await dappPage.locator('#btn-sign-data').click();
    await expect(dappPage.locator('#sign-error')).toBeVisible({ timeout: 8_000 });
    await expect(dappPage.locator('#sign-error')).toContainText('timed out');
  } finally {
    await dappContext.close();
    await walletContext.close();
  }
});

test('wallet uses an injected peerId and does not touch localStorage for ids', async ({ browser }) => {
  const dappContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  const walletContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
  await dappContext.addInitScript(() => localStorage.clear());
  await walletContext.addInitScript(() => localStorage.clear());

  const dappPage = await dappContext.newPage();
  const walletPage = await walletContext.newPage();
  await dappPage.goto('/test/e2e/test_dApp.html');
  const dappPeerId = await dappPage.locator('#address').textContent();

  await walletContext.addInitScript((id: string) => {
    localStorage.setItem('test-dapp-peer-id', id);
    localStorage.setItem('test-wallet-peer-id', 'wallet-injected-abc123');
  }, dappPeerId as string);
  await walletPage.goto('/test/e2e/test_wallet.html');

  await expect(dappPage.locator('#wallet-address')).toHaveText('wallet-injected-abc123', { timeout: 15_000 });

  // id derivation must not have written the fingerprint keys
  const walletIdKey = await walletPage.evaluate(() => localStorage.getItem('peer-connect-wallet-id'));
  const discIdKey = await walletPage.evaluate(() => localStorage.getItem('peer-connect-wallet-discovery-id'));
  const autoConnectDiscIdKey = await walletPage.evaluate(() => localStorage.getItem('cardano-peer-discovery-id'));
  expect(walletIdKey).toBeNull();
  expect(discIdKey).toBeNull();
  expect(autoConnectDiscIdKey).toBeNull();

  await dappContext.close();
  await walletContext.close();
});
