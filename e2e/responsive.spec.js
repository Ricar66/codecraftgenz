// @ts-check
import { test, expect } from '@playwright/test';

// Viewport presets
const DESKTOP = { width: 1280, height: 720 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 375, height: 812 };
const SMALL_MOBILE = { width: 320, height: 568 };

// Public pages to test responsive behavior
const PUBLIC_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/desafios', name: 'Desafios' },
  { path: '/projetos', name: 'Projetos' },
  { path: '/mentoria', name: 'Mentorias' },
  { path: '/ranking', name: 'Ranking' },
  { path: '/feedbacks', name: 'Feedbacks' },
  { path: '/aplicativos', name: 'Aplicativos' },
  { path: '/para-empresas', name: 'Para Empresas' },
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
];

// Navigation link labels present in the navbar
const NAV_LINKS = ['Inicio', 'Desafios', 'Projetos', 'Mentorias', 'Ranking', 'Feedbacks', 'Aplicativos', 'Para Empresas'];

// ─────────────────────────────────────────────
// Helper: navigate and wait for SPA shell
// ─────────────────────────────────────────────
async function visitAndWait(page, path = '/') {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 10000 });
}

// ─────────────────────────────────────────────
// Helper: checks that page has no horizontal scroll
// ─────────────────────────────────────────────
async function expectNoHorizontalScroll(page) {
  const hasNoOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
  );
  expect(hasNoOverflow).toBe(true);
}

// ─────────────────────────────────────────────
// 1. DESKTOP (1280 x 720)
// ─────────────────────────────────────────────
test.describe('1 - Desktop (1280x720)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visitAndWait(page, '/');
  });

  test('1.01 - Navbar is visible on the homepage', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible({ timeout: 10000 });
  });

  test('1.02 - Navbar shows all navigation links horizontally', async ({ page }) => {
    for (const label of NAV_LINKS) {
      const link = page.locator('nav a').filter({ hasText: new RegExp(`^${label}$`) }).first();
      await expect(link).toBeVisible({ timeout: 10000 });
    }
  });

  test('1.03 - Hamburger menu button is NOT visible on desktop', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    // The hamburger button exists in the DOM but should be hidden via CSS on desktop
    if (await hamburger.count() > 0) {
      await expect(hamburger).not.toBeVisible();
    }
  });

  test('1.04 - Hero section heading is visible and large', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    expect(box.height).toBeGreaterThan(30);
  });

  test('1.05 - Hero section subtitle is visible', async ({ page }) => {
    const subtitle = page.getByText(/Conectamos talentos Gen-Z/i).first();
    await expect(subtitle).toBeVisible({ timeout: 10000 });
  });

  test('1.06 - Footer is visible and full-width', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10000 });
    const box = await footer.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThanOrEqual(DESKTOP.width * 0.95);
  });

  test('1.07 - Footer has column titles', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText('Suporte')).toBeVisible({ timeout: 10000 });
    await expect(footer.getByText('Legal')).toBeVisible({ timeout: 10000 });
  });

  test('1.08 - No horizontal scroll on desktop homepage', async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test('1.09 - CTA button "Quero ser um Crafter" is visible', async ({ page }) => {
    const cta = page.getByRole('button', { name: /quero ser um crafter/i });
    await expect(cta).toBeVisible({ timeout: 10000 });
  });

  test('1.10 - Logo is visible in navbar', async ({ page }) => {
    const logo = page.locator('nav img[alt*="CodeCraft"]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
  });

  test('1.11 - Entrar link is visible on desktop', async ({ page }) => {
    const entrar = page.locator('nav a').filter({ hasText: /^Entrar$/ }).first();
    await expect(entrar).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 2. TABLET (768 x 1024)
// ─────────────────────────────────────────────
test.describe('2 - Tablet (768x1024)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(TABLET);
    await visitAndWait(page, '/');
  });

  test('2.01 - Page loads successfully on tablet', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible({ timeout: 10000 });
  });

  test('2.02 - Navbar is visible on tablet', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible({ timeout: 10000 });
  });

  test('2.03 - Content adapts: hero heading fits within viewport width', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(TABLET.width + 2);
  });

  test('2.04 - Hamburger may or may not be visible on tablet', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    const isHamburgerVisible = await hamburger.isVisible();
    if (isHamburgerVisible) {
      // If hamburger exists, nav links should be hidden
      const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
      await expect(desafiosLink).not.toBeVisible();
    } else {
      // If no hamburger, links should be directly visible (desktop layout)
      const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
      await expect(desafiosLink).toBeVisible({ timeout: 10000 });
    }
  });

  test('2.05 - Text sizes remain readable on tablet', async ({ page }) => {
    const heading = page.locator('h1').first();
    const fontSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test('2.06 - Logo scales properly on tablet', async ({ page }) => {
    const logo = page.locator('nav img[alt*="CodeCraft"]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
    const box = await logo.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(20);
    expect(box.width).toBeLessThan(TABLET.width);
  });

  test('2.07 - No horizontal scroll on tablet', async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test('2.08 - Footer is visible on tablet', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10000 });
  });

  test('2.09 - Login page renders on tablet', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// 3. MOBILE (375 x 812 - iPhone)
// ─────────────────────────────────────────────
test.describe('3 - Mobile (375x812)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitAndWait(page, '/');
  });

  test('3.01 - Hamburger menu button IS visible on mobile', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
  });

  test('3.02 - Navbar links are hidden before opening hamburger', async ({ page }) => {
    const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(desafiosLink).not.toBeVisible();
  });

  test('3.03 - Clicking hamburger opens the mobile menu', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await hamburger.click();
    await page.waitForTimeout(500);
    const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(desafiosLink).toBeVisible({ timeout: 5000 });
  });

  test('3.04 - Mobile menu shows all navigation links', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await hamburger.click();
    await page.waitForTimeout(500);
    for (const label of NAV_LINKS) {
      const link = page.locator('nav a').filter({ hasText: new RegExp(`^${label}$`) }).first();
      await expect(link).toBeVisible({ timeout: 5000 });
    }
  });

  test('3.05 - Clicking a link in mobile menu navigates and closes menu', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await hamburger.click();
    await page.waitForTimeout(500);
    const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(desafiosLink).toBeVisible({ timeout: 5000 });
    await desafiosLink.click();
    await expect(page).toHaveURL(/desafios/i);
    // After navigating, the link should be hidden again (menu closed)
    await page.waitForTimeout(500);
    await expect(desafiosLink).not.toBeVisible({ timeout: 5000 });
  });

  test('3.06 - Hero section text scales down on mobile', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeLessThanOrEqual(MOBILE.width);
  });

  test('3.07 - CTA button has tappable size (min 44px height)', async ({ page }) => {
    const cta = page.getByRole('button', { name: /quero ser um crafter/i });
    if (await cta.count() > 0) {
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('3.08 - No horizontal scroll on mobile homepage', async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test('3.09 - Login form is usable on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Entrar/i }).first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    // Form elements should fit within viewport
    const emailBox = await emailInput.boundingBox();
    expect(emailBox).toBeTruthy();
    expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(MOBILE.width + 5);
  });

  test('3.10 - Login form inputs have tappable size on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box.height).toBeGreaterThanOrEqual(36);
  });

  test('3.11 - Register form is usable on mobile', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    const nameInput = page.locator('input[name="name"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test('3.12 - Register form fields fit mobile viewport width', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    const nameInput = page.locator('input[name="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    const box = await nameInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width + 5);
  });

  test('3.13 - No horizontal scroll on login page mobile', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
  });

  test('3.14 - No horizontal scroll on register page mobile', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
  });

  test('3.15 - No horizontal scroll on B2B page mobile', async ({ page }) => {
    await page.goto('/para-empresas');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
  });

  test('3.16 - Logo is visible on mobile navbar', async ({ page }) => {
    const logo = page.locator('nav img[alt*="CodeCraft"]').first();
    await expect(logo).toBeVisible({ timeout: 10000 });
  });

  test('3.17 - Submit button on login is full-width or tappable', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const btn = page.locator('button[type="submit"]').filter({ hasText: /Entrar/i }).first();
    await expect(btn).toBeVisible({ timeout: 10000 });
    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThan(MOBILE.width * 0.5);
  });

  test('3.18 - Hamburger button toggles between open and close', async ({ page }) => {
    // Initially shows "Abrir menu"
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    // After click should show "Fechar menu"
    const closeBtn = page.locator('button[aria-label="Fechar menu"]');
    await expect(closeBtn).toBeVisible({ timeout: 5000 });
  });

  test('3.19 - Footer is visible on mobile', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10000 });
  });

  test('3.20 - Footer fits within mobile viewport', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    const box = await footer.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeLessThanOrEqual(MOBILE.width + 1);
  });
});

// ─────────────────────────────────────────────
// 4. SMALL MOBILE (320 x 568 - iPhone SE)
// ─────────────────────────────────────────────
test.describe('4 - Small Mobile (320x568)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(SMALL_MOBILE);
    await visitAndWait(page, '/');
  });

  test('4.01 - Homepage loads on small mobile', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible({ timeout: 10000 });
  });

  test('4.02 - Content is still accessible on small mobile', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('4.03 - No text overflow on small mobile hero', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 10);
  });

  test('4.04 - Hamburger button is tappable on small mobile', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    const box = await hamburger.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThanOrEqual(30);
    expect(box.height).toBeGreaterThanOrEqual(30);
  });

  test('4.05 - No horizontal scroll on small mobile', async ({ page }) => {
    await expectNoHorizontalScroll(page);
  });

  test('4.06 - Login form fits small mobile viewport', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 5);
  });

  test('4.07 - Register form fits small mobile viewport', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
  });

  test('4.08 - Footer renders on small mobile', async ({ page }) => {
    const footer = page.locator('footer').first();
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10000 });
  });

  test('4.09 - CTA button fits within small mobile width', async ({ page }) => {
    const cta = page.getByRole('button', { name: /quero ser um crafter/i });
    if (await cta.count() > 0) {
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 5);
    }
  });

  test('4.10 - No horizontal scroll on B2B page small mobile', async ({ page }) => {
    await page.goto('/para-empresas');
    await page.waitForLoadState('domcontentloaded');
    await expectNoHorizontalScroll(page);
  });
});

// ─────────────────────────────────────────────
// 5. CROSS-DEVICE NAVIGATION
// ─────────────────────────────────────────────
test.describe('5 - Cross-Device Navigation', () => {
  test.describe('5a - Mobile navigation through all pages', () => {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`5a.${name} - Navigate to ${name} on mobile without errors`, async ({ page }) => {
        await page.setViewportSize(MOBILE);
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        const response = await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
        expect(response).not.toBeNull();
        expect(response.status()).toBeLessThan(500);
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('5b - Desktop navigation through all pages', () => {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`5b.${name} - Navigate to ${name} on desktop without errors`, async ({ page }) => {
        await page.setViewportSize(DESKTOP);
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        const response = await page.goto(path);
        await page.waitForLoadState('domcontentloaded');
        expect(response).not.toBeNull();
        expect(response.status()).toBeLessThan(500);
        expect(errors).toEqual([]);
      });
    }
  });
});

// ─────────────────────────────────────────────
// 6. TOUCH INTERACTIONS (Mobile)
// ─────────────────────────────────────────────
test.describe('6 - Touch Interactions (Mobile)', () => {
  test.use({ hasTouch: true });

  test('6.01 - Mobile menu opens with tap', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitAndWait(page, '/');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.tap();
    await page.waitForTimeout(500);
    const link = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(link).toBeVisible({ timeout: 5000 });
  });

  test('6.02 - Navigation links work with tap', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitAndWait(page, '/');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.tap();
    await page.waitForTimeout(500);
    const link = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(link).toBeVisible({ timeout: 5000 });
    await link.tap();
    await expect(page).toHaveURL(/projetos/i);
  });

  test('6.03 - Vertical scroll works on mobile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitAndWait(page, '/');
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }));
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });

  test('6.04 - CTA button responds to tap', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await visitAndWait(page, '/');
    const cta = page.getByRole('button', { name: /quero ser um crafter/i });
    if (await cta.count() > 0) {
      await cta.tap();
    }
  });

  test('6.05 - Tapping logo navigates to home', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/desafios');
    await page.waitForLoadState('domcontentloaded');
    const logoLink = page.locator('nav a').filter({ has: page.locator('img') }).first();
    if (await logoLink.count() > 0) {
      await logoLink.tap();
      await expect(page).toHaveURL(/\/$/);
    }
  });

  test('6.06 - Meta viewport is properly set', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });
});

// ─────────────────────────────────────────────
// 7. VIEWPORT RESIZE BEHAVIOR
// ─────────────────────────────────────────────
test.describe('7 - Viewport Resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await visitAndWait(page, '/');
  });

  test('7.01 - Resizing from desktop to mobile shows hamburger', async ({ page }) => {
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).not.toBeVisible();
    // Resize to mobile
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(500);
    await expect(hamburger).toBeVisible({ timeout: 10000 });
  });

  test('7.02 - Resizing from mobile to desktop hides hamburger and shows links', async ({ page }) => {
    // Start from mobile (override the beforeEach desktop viewport)
    await page.setViewportSize(MOBILE);
    await page.waitForTimeout(500);
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    // Resize to desktop
    await page.setViewportSize(DESKTOP);
    await page.waitForTimeout(500);
    await expect(hamburger).not.toBeVisible();
    const desafiosLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(desafiosLink).toBeVisible({ timeout: 10000 });
  });

  test('7.03 - Dark background is consistent across viewports', async ({ page }) => {
    for (const vp of [DESKTOP, TABLET, MOBILE]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const bgColor = await page.evaluate(() => {
        const root = document.querySelector('.app-root') || document.body;
        return getComputedStyle(root).backgroundColor;
      });
      const match = bgColor.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        const darkChannels = [r, g, b].filter(v => v < 100).length;
        expect(darkChannels).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
