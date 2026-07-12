// @ts-check
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://codecraftgenz.com.br';

/**
 * Helper: wait for the SPA shell to be ready after navigation.
 * Uses domcontentloaded + waits for the <nav> element to appear.
 */
async function waitForSPA(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 10000 });
}

// Navbar do site B2B (pivo 2026-06-27): Inicio, Projetos, Aplicativos, Sobre,
// Para Empresas, Entrar. As features de comunidade (Desafios, Ranking, Mentoria,
// Feedbacks, crafter) foram removidas — suas URLs redirecionam 301 -> home.
const LEGACY_REDIRECTS = ['/desafios', '/ranking', '/mentoria', '/feedbacks', '/onboarding', '/crafter/123'];

// ---------------------------------------------------------------------------
// 1. Homepage Tests
// ---------------------------------------------------------------------------
test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForSPA(page);
  });

  test('page loads successfully (HTTP 200)', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(response.status()).toBe(200);
  });

  test('title contains "CodeCraft"', async ({ page }) => {
    await expect(page).toHaveTitle(/CodeCraft/i);
  });

  test('navbar is visible', async ({ page }) => {
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('logo is visible', async ({ page }) => {
    const logo = page.locator('nav img').first();
    await expect(logo).toBeVisible();
  });

  test('logo click navigates to homepage', async ({ page }) => {
    await page.locator('nav a[href="/"], nav a[href="."]').first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('hero section is visible', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('hero section has a CTA button', async ({ page }) => {
    // CTAs reais do hero B2B: "Quero contratar a CodeCraft" (aria-label
    // "Conhecer solucoes para empresas") e "Ver nossos apps".
    const ctaButton = page.getByRole('button', { name: /contratar|empresa|apps/i }).or(
      page.locator('button').filter({ hasText: /contratar|apps/i })
    );
    await expect(ctaButton.first()).toBeVisible({ timeout: 10000 });
  });

  test('footer is visible', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  // --- Links de navbar que EXISTEM no site B2B ---

  test('navbar link "Projetos" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/projetos/i);
  });

  test('navbar link "Aplicativos" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Aplicativos$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/aplicativos/i);
  });

  test('navbar link "Sobre" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Sobre$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/sobre/i);
  });

  test('"Para Empresas" link exists and works', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /Para Empresas/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/para-empresas/i);
  });

  test('scroll down reveals animated sections', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Navigation Flow Tests (site B2B)
// ---------------------------------------------------------------------------
test.describe('Navigation Flows', () => {
  test('navigate to /projetos and verify heading', async ({ page }) => {
    await page.goto('/projetos');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /aplicativos and verify heading', async ({ page }) => {
    await page.goto('/aplicativos');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /para-empresas and verify heading', async ({ page }) => {
    await page.goto('/para-empresas');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /sobre and verify heading', async ({ page }) => {
    await page.goto('/sobre');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to page and go back with browser back button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/projetos');
    await page.waitForLoadState('domcontentloaded');
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('navigate to /login from navbar', async ({ page }) => {
    await page.goto('/');
    await waitForSPA(page);
    const loginLink = page.locator('nav a').filter({ hasText: /^Entrar$/ }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/login/i);
  });

  test('navigate to /register from login page link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const registerLink = page.locator('a').filter({ hasText: /Criar conta/i }).first();
    await expect(registerLink).toBeVisible({ timeout: 10000 });
    await registerLink.click();
    await expect(page).toHaveURL(/register/i);
  });

  test('unknown route /xyz123 shows 404 page', async ({ page }) => {
    await page.goto('/xyz123');
    await page.waitForLoadState('domcontentloaded');
    const notFoundText = page.getByText('404').first();
    await expect(notFoundText).toBeVisible({ timeout: 10000 });
  });

  test('404 page has "Voltar ao Inicio" button that works', async ({ page }) => {
    await page.goto('/xyz123');
    await page.waitForLoadState('domcontentloaded');
    const backButton = page.getByRole('button', { name: /Voltar ao In/i });
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();
    await expect(page).toHaveURL(/\/$/);
  });
});

// ---------------------------------------------------------------------------
// 2a. URLs legadas da Comunidade redirecionam para a home (301, SEO preservado)
// ---------------------------------------------------------------------------
test.describe('Legacy URLs redirect to home', () => {
  for (const legacy of LEGACY_REDIRECTS) {
    test(`${legacy} redireciona para a home`, async ({ page }) => {
      await page.goto(legacy);
      await page.waitForLoadState('domcontentloaded');
      // Apos o 301 do .htaccess, a URL final deve ser a home.
      await expect(page).toHaveURL(/codecraftgenz\.com\.br\/?$/);
    });
  }
});

// ---------------------------------------------------------------------------
// 2b. Mobile Navigation Tests
// ---------------------------------------------------------------------------
test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
  });

  test('hamburger menu opens and shows links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
  });

  test('mobile menu link navigates to /projetos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
    await menuLink.click();
    await expect(page).toHaveURL(/projetos/i);
  });

  test('mobile menu link navigates to /aplicativos', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Aplicativos$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
    await menuLink.click();
    await expect(page).toHaveURL(/aplicativos/i);
  });

  test('mobile menu closes when hamburger is toggled again', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const closeBtn = page.locator('button[aria-label*="menu" i]').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(menuLink).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Public Pages Accessibility (no auth required) — site B2B
// ---------------------------------------------------------------------------
test.describe('Public Pages Load Without Auth', () => {
  const publicRoutes = [
    { path: '/projetos', name: 'Projetos' },
    { path: '/aplicativos', name: 'Aplicativos' },
    { path: '/para-empresas', name: 'Para Empresas' },
    { path: '/sobre', name: 'Sobre' },
    { path: '/politica-privacidade', name: 'Politica de Privacidade' },
    { path: '/termos-uso', name: 'Termos de Uso' },
    { path: '/ajuda', name: 'Ajuda' },
  ];

  for (const route of publicRoutes) {
    test(`${route.name} (${route.path}) loads without authentication`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      expect(page.url()).not.toMatch(/login/i);
    });

    test(`${route.name} (${route.path}) has visible content`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const heading = page.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  }
});
