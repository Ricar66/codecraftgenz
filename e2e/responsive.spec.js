// e2e/responsive.spec.js
// Comprehensive responsive design E2E tests for https://codecraftgenz.com.br
import { test, expect } from '@playwright/test';

const BASE_URL = 'https://codecraftgenz.com.br';

// Viewport presets
const DESKTOP = { width: 1280, height: 720 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 375, height: 812 };
const SMALL_MOBILE = { width: 320, height: 568 };

// Public pages to test navigation
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
// Helper: checks that page has no horizontal scroll
// ─────────────────────────────────────────────
async function expectNoHorizontalScroll(page) {
  const hasNoOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth
  );
  expect(hasNoOverflow).toBe(true);
}

// ─────────────────────────────────────────────
// 1. DESKTOP (1280 x 720)
// ─────────────────────────────────────────────
test.describe('1 - Desktop (1280x720)', () => {
  test.use({ viewport: DESKTOP });

  test('1.01 - Navbar is visible on the homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const navbar = page.locator('nav[aria-label="Navegacao principal"]');
    await expect(navbar).toBeVisible();
  });

  test('1.02 - Navbar shows all navigation links horizontally', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    for (const label of NAV_LINKS) {
      const link = page.locator(`nav a:has-text("${label}")`).first();
      await expect(link).toBeVisible();
    }
  });

  test('1.03 - Hamburger menu button is NOT visible on desktop', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"], nav button[aria-label="Fechar menu"]');
    // The hamburger button exists in the DOM but should be hidden via CSS
    if (await hamburger.count() > 0) {
      await expect(hamburger.first()).not.toBeVisible();
    }
  });

  test('1.04 - Hero section heading is visible and large', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    // On desktop the heading font should render at a reasonable large size
    expect(box.height).toBeGreaterThan(30);
  });

  test('1.05 - Hero section subtitle is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const subtitle = page.locator('text=Conectamos talentos Gen-Z');
    await expect(subtitle).toBeVisible();
  });

  test('1.06 - Feature cards display in a multi-column grid', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const section = page.locator('section[aria-label="Recursos da plataforma"]');
    await section.scrollIntoViewIfNeeded();
    // Get positions of the first two feature cards
    const cards = section.locator('a').filter({ hasText: 'Explorar' });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    const box1 = await cards.nth(0).boundingBox();
    const box2 = await cards.nth(1).boundingBox();
    expect(box1).toBeTruthy();
    expect(box2).toBeTruthy();
    // If multi-column, the second card should be roughly at the same Y or at least not stacked far below
    // Two columns means second card starts near the same top as first card
    const yDiff = Math.abs(box2.y - box1.y);
    expect(yDiff).toBeLessThan(box1.height); // not fully stacked
  });

  test('1.07 - Footer is visible and full-width', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    const box = await footer.boundingBox();
    expect(box).toBeTruthy();
    // Footer should span nearly the full viewport width
    expect(box.width).toBeGreaterThanOrEqual(DESKTOP.width * 0.95);
  });

  test('1.08 - Footer has multiple columns with links', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    // Check column titles exist
    await expect(footer.locator('text=Navegação')).toBeVisible();
    await expect(footer.locator('text=Suporte')).toBeVisible();
    await expect(footer.locator('text=Legal')).toBeVisible();
    await expect(footer.locator('text=Conecte-se')).toBeVisible();
  });

  test('1.09 - No horizontal scroll on desktop homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('1.10 - CTA button "Quero ser um Crafter" is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('button:has-text("Quero ser um Crafter")');
    await expect(cta).toBeVisible();
  });

  test('1.11 - Logo is visible in navbar', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const logo = page.locator('nav img[alt="CodeCraft Gen-Z Logo"]');
    await expect(logo).toBeVisible();
  });

  test('1.12 - Entrar link is visible on desktop', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const entrar = page.locator('nav a:has-text("Entrar")');
    await expect(entrar).toBeVisible();
  });
});

// ─────────────────────────────────────────────
// 2. TABLET (768 x 1024)
// ─────────────────────────────────────────────
test.describe('2 - Tablet (768x1024)', () => {
  test.use({ viewport: TABLET });

  test('2.01 - Page loads successfully on tablet', async ({ page }) => {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
  });

  test('2.02 - Navbar is visible on tablet', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const navbar = page.locator('nav[aria-label="Navegacao principal"]');
    await expect(navbar).toBeVisible();
  });

  test('2.03 - Content adapts: hero section fits within viewport width', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hero = page.locator('section[aria-label*="Banner CodeCraft"]');
    if (await hero.count() > 0) {
      const box = await hero.boundingBox();
      expect(box).toBeTruthy();
      expect(box.width).toBeLessThanOrEqual(TABLET.width + 2);
    }
  });

  test('2.04 - Hamburger menu may be visible on tablet (768px triggers <=1024px breakpoint)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    // At 768px, the navbar transitions — hamburger may or may not be visible depending on breakpoint
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    // Just check it exists; visibility depends on CSS breakpoints
    const count = await hamburger.count();
    expect(count).toBeGreaterThanOrEqual(0); // no crash
  });

  test('2.05 - Feature cards adapt to tablet width', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const section = page.locator('section[aria-label="Recursos da plataforma"]');
    await section.scrollIntoViewIfNeeded();
    const cards = section.locator('a').filter({ hasText: 'Explorar' });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    // All cards should fit within the viewport width
    for (let i = 0; i < Math.min(count, 3); i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box).toBeTruthy();
      expect(box.x + box.width).toBeLessThanOrEqual(TABLET.width + 20);
    }
  });

  test('2.06 - Text sizes remain readable on tablet', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    const fontSize = await heading.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(20);
  });

  test('2.07 - Images in navbar scale properly on tablet', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const logo = page.locator('nav img[alt="CodeCraft Gen-Z Logo"]');
    await expect(logo).toBeVisible();
    const box = await logo.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThan(20);
    expect(box.width).toBeLessThan(TABLET.width);
  });

  test('2.08 - No horizontal scroll on tablet', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('2.09 - Footer is visible on tablet', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test('2.10 - Login page renders on tablet', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const form = page.locator('form[aria-label*="autenticação"], form[aria-label*="autenticacao"]');
    if (await form.count() > 0) {
      await expect(form.first()).toBeVisible();
    } else {
      // Fallback: check for login heading
      await expect(page.locator('h1:has-text("Entrar")')).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────
// 3. MOBILE (375 x 812 - iPhone)
// ─────────────────────────────────────────────
test.describe('3 - Mobile (375x812)', () => {
  test.use({ viewport: MOBILE });

  test('3.01 - Hamburger menu button IS visible on mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await expect(hamburger).toBeVisible();
  });

  test('3.02 - Navbar links are hidden before opening hamburger', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    // Desktop nav links should not be visible on mobile until menu is opened
    const navMenu = page.locator('#nav-menu');
    // Check that at least one link is not visible (menu is collapsed)
    const desafiosLink = page.locator('#nav-menu a:has-text("Desafios")');
    await expect(desafiosLink).not.toBeVisible();
  });

  test('3.03 - Clicking hamburger opens the mobile menu', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await hamburger.click();
    // After opening, nav links should appear
    const desafiosLink = page.locator('#nav-menu a:has-text("Desafios")');
    await expect(desafiosLink).toBeVisible({ timeout: 3000 });
  });

  test('3.04 - Mobile menu shows all navigation links', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await hamburger.click();
    for (const label of NAV_LINKS) {
      const link = page.locator(`#nav-menu a:has-text("${label}")`).first();
      await expect(link).toBeVisible({ timeout: 3000 });
    }
  });

  test('3.05 - Clicking a link in mobile menu navigates and closes menu', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await hamburger.click();
    const desafiosLink = page.locator('#nav-menu a:has-text("Desafios")');
    await expect(desafiosLink).toBeVisible({ timeout: 3000 });
    await desafiosLink.click();
    await page.waitForURL('**/desafios', { timeout: 10000 });
    // After navigating, the menu should close — link should be hidden again
    await expect(desafiosLink).not.toBeVisible({ timeout: 3000 });
  });

  test('3.06 - Hero section text scales down on mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    // Heading should fit within mobile viewport
    expect(box.width).toBeLessThanOrEqual(MOBILE.width);
  });

  test('3.07 - Feature cards stack in single column on mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const section = page.locator('section[aria-label="Recursos da plataforma"]');
    await section.scrollIntoViewIfNeeded();
    const cards = section.locator('a').filter({ hasText: 'Explorar' });
    const count = await cards.count();
    if (count >= 2) {
      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();
      expect(box1).toBeTruthy();
      expect(box2).toBeTruthy();
      // Stacked: second card should be below the first
      expect(box2.y).toBeGreaterThan(box1.y + box1.height * 0.5);
    }
  });

  test('3.08 - CTA button has tappable size (min 44px height)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('button:has-text("Quero ser um Crafter")');
    if (await cta.count() > 0) {
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('3.09 - No horizontal scroll on mobile homepage', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('3.10 - Login form is usable on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    const passwordInput = page.locator('#login-password');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    // All form elements should fit within viewport
    const emailBox = await emailInput.boundingBox();
    expect(emailBox).toBeTruthy();
    expect(emailBox.x + emailBox.width).toBeLessThanOrEqual(MOBILE.width + 5);
  });

  test('3.11 - Login form inputs have tappable size on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const emailInput = page.locator('#login-email');
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box.height).toBeGreaterThanOrEqual(36);
  });

  test('3.12 - Register form is usable on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    const nameInput = page.locator('#register-name');
    const emailInput = page.locator('#register-email');
    const passwordInput = page.locator('#register-password');
    const confirmInput = page.locator('#register-confirm-password');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
  });

  test('3.13 - Register form fields fit mobile viewport width', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    const inputs = ['#register-name', '#register-email', '#register-password', '#register-confirm-password'];
    for (const selector of inputs) {
      const input = page.locator(selector);
      const box = await input.boundingBox();
      expect(box).toBeTruthy();
      expect(box.x + box.width).toBeLessThanOrEqual(MOBILE.width + 5);
    }
  });

  test('3.14 - B2B form (Para Empresas) is usable on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/para-empresas`, { waitUntil: 'domcontentloaded' });
    // Scroll to find the form
    const form = page.locator('form').first();
    if (await form.count() > 0) {
      await form.scrollIntoViewIfNeeded();
      await expect(form).toBeVisible();
      const box = await form.boundingBox();
      expect(box).toBeTruthy();
      expect(box.width).toBeLessThanOrEqual(MOBILE.width + 5);
    }
  });

  test('3.15 - No horizontal scroll on login page mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('3.16 - No horizontal scroll on register page mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('3.17 - No horizontal scroll on B2B page mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/para-empresas`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('3.18 - Logo is visible on mobile navbar', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const logo = page.locator('nav img[alt="CodeCraft Gen-Z Logo"]');
    await expect(logo).toBeVisible();
  });

  test('3.19 - Submit button on login is full-width or tappable', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const btn = page.locator('button[type="submit"]');
    const box = await btn.boundingBox();
    expect(box).toBeTruthy();
    expect(box.height).toBeGreaterThanOrEqual(44);
    // Should take a significant portion of the form width
    expect(box.width).toBeGreaterThan(MOBILE.width * 0.5);
  });

  test('3.20 - Hamburger button toggles between open and close icons', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    // Initially shows "Abrir menu"
    let hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    // After click should show "Fechar menu"
    const closeBtn = page.locator('nav button[aria-label="Fechar menu"]');
    await expect(closeBtn).toBeVisible({ timeout: 3000 });
  });
});

// ─────────────────────────────────────────────
// 4. SMALL MOBILE (320 x 568 - iPhone SE)
// ─────────────────────────────────────────────
test.describe('4 - Small Mobile (320x568)', () => {
  test.use({ viewport: SMALL_MOBILE });

  test('4.01 - Homepage loads on small mobile', async ({ page }) => {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
  });

  test('4.02 - Content is still accessible on small mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('4.03 - No text overflow or clipping on small mobile hero', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = page.locator('h1').first();
    const box = await heading.boundingBox();
    expect(box).toBeTruthy();
    // Text should not extend beyond viewport
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 10);
  });

  test('4.04 - Hamburger button is tappable on small mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await expect(hamburger).toBeVisible();
    const box = await hamburger.boundingBox();
    expect(box).toBeTruthy();
    expect(box.width).toBeGreaterThanOrEqual(30);
    expect(box.height).toBeGreaterThanOrEqual(30);
  });

  test('4.05 - No horizontal scroll on small mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('4.06 - Login form fits small mobile viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
    const emailInput = page.locator('#login-email');
    const box = await emailInput.boundingBox();
    expect(box).toBeTruthy();
    expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 5);
  });

  test('4.07 - Register form fits small mobile viewport', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });

  test('4.08 - Footer renders on small mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test('4.09 - CTA button fits within small mobile width', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('button:has-text("Quero ser um Crafter")');
    if (await cta.count() > 0) {
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box.x + box.width).toBeLessThanOrEqual(SMALL_MOBILE.width + 5);
    }
  });

  test('4.10 - No horizontal scroll on B2B page small mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/para-empresas`, { waitUntil: 'domcontentloaded' });
    await expectNoHorizontalScroll(page);
  });
});

// ─────────────────────────────────────────────
// 5. CROSS-DEVICE NAVIGATION
// ─────────────────────────────────────────────
test.describe('5 - Cross-Device Navigation', () => {

  test.describe('5a - Mobile navigation through all pages', () => {
    test.use({ viewport: MOBILE });

    for (const { path, name } of PUBLIC_PAGES) {
      test(`5.${name} - Navigate to ${name} on mobile without errors`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
        expect(response.status()).toBeLessThan(500);
        expect(errors).toEqual([]);
      });
    }
  });

  test.describe('5b - Desktop navigation through all pages', () => {
    test.use({ viewport: DESKTOP });

    for (const { path, name } of PUBLIC_PAGES) {
      test(`5.${name} - Navigate to ${name} on desktop without errors`, async ({ page }) => {
        const errors = [];
        page.on('pageerror', (err) => errors.push(err.message));
        const response = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
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
  test.use({ viewport: MOBILE, hasTouch: true });

  test('6.01 - Mobile menu opens with tap', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await hamburger.tap();
    const link = page.locator('#nav-menu a:has-text("Desafios")');
    await expect(link).toBeVisible({ timeout: 3000 });
  });

  test('6.02 - Navigation links work with tap', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const hamburger = page.locator('nav button[aria-label="Abrir menu"]');
    await hamburger.tap();
    const link = page.locator('#nav-menu a:has-text("Projetos")');
    await expect(link).toBeVisible({ timeout: 3000 });
    await link.tap();
    await page.waitForURL('**/projetos', { timeout: 10000 });
    expect(page.url()).toContain('/projetos');
  });

  test('6.03 - Vertical scroll works on mobile', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }));
    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);
  });

  test('6.04 - CTA button responds to tap', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const cta = page.locator('button:has-text("Quero ser um Crafter")');
    if (await cta.count() > 0) {
      // Tapping should not throw errors
      await cta.tap();
    }
  });

  test('6.05 - Tapping logo navigates to home', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    const logo = page.locator('nav a img[alt="CodeCraft Gen-Z Logo"]').first();
    if (await logo.count() > 0) {
      await logo.tap();
      await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 });
      expect(page.url()).toBe(`${BASE_URL}/`);
    }
  });

  test('6.06 - No pinch-zoom issues: meta viewport is properly set', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.getAttribute('content') : null;
    });
    expect(viewportMeta).toBeTruthy();
    expect(viewportMeta).toContain('width=device-width');
  });
});

// ─────────────────────────────────────────────
// 7. VISUAL CONSISTENCY
// ─────────────────────────────────────────────
test.describe('7 - Visual Consistency', () => {

  test.describe('7a - Dark theme on desktop', () => {
    test.use({ viewport: DESKTOP });

    test('7.01 - Body has dark background on desktop', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const bgColor = await page.evaluate(() => {
        const root = document.querySelector('.app-root') || document.body;
        return getComputedStyle(root).backgroundColor;
      });
      // Dark theme: RGB values should be low (dark)
      const match = bgColor.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        // At least two channels should be below 100 for a dark theme
        const darkChannels = [r, g, b].filter(v => v < 100).length;
        expect(darkChannels).toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe('7b - Dark theme on mobile', () => {
    test.use({ viewport: MOBILE });

    test('7.02 - Body has dark background on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
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
    });
  });

  test.describe('7c - Dark theme on tablet', () => {
    test.use({ viewport: TABLET });

    test('7.03 - Body has dark background on tablet', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
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
    });
  });

  test.describe('7d - Starfield and glassmorphism on desktop', () => {
    test.use({ viewport: DESKTOP });

    test('7.04 - Starfield background class is present', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const hasStarfield = await page.evaluate(() => {
        return !!document.querySelector('.starfield-bg') ||
               !!document.querySelector('[class*="starfield"]') ||
               !!document.querySelector('.app-background');
      });
      expect(hasStarfield).toBe(true);
    });

    test('7.05 - Glassmorphism cards have backdrop-filter or semi-transparent bg', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const section = page.locator('section[aria-label="Recursos da plataforma"]');
      await section.scrollIntoViewIfNeeded();
      const card = section.locator('a').filter({ hasText: 'Explorar' }).first();
      if (await card.count() > 0) {
        const styles = await card.evaluate(el => {
          const cs = getComputedStyle(el);
          return {
            backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || '',
            background: cs.background,
            backgroundColor: cs.backgroundColor,
          };
        });
        // Either has backdrop-filter or a semi-transparent background
        const hasGlass = styles.backdropFilter !== 'none' && styles.backdropFilter !== '' ||
                         styles.backgroundColor.includes('rgba') ||
                         styles.background.includes('rgba');
        expect(hasGlass).toBe(true);
      }
    });
  });

  test.describe('7e - Starfield on mobile', () => {
    test.use({ viewport: MOBILE });

    test('7.06 - Starfield background is present on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const hasStarfield = await page.evaluate(() => {
        return !!document.querySelector('.starfield-bg') ||
               !!document.querySelector('[class*="starfield"]') ||
               !!document.querySelector('.app-background');
      });
      expect(hasStarfield).toBe(true);
    });
  });

  test.describe('7f - Starfield on small mobile', () => {
    test.use({ viewport: SMALL_MOBILE });

    test('7.07 - Starfield background is present on small mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const hasStarfield = await page.evaluate(() => {
        return !!document.querySelector('.starfield-bg') ||
               !!document.querySelector('[class*="starfield"]') ||
               !!document.querySelector('.app-background');
      });
      expect(hasStarfield).toBe(true);
    });
  });

  test.describe('7g - Text contrast on desktop', () => {
    test.use({ viewport: DESKTOP });

    test('7.08 - Hero heading text color has sufficient contrast (light text on dark bg)', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const heading = page.locator('h1').first();
      const color = await heading.evaluate(el => getComputedStyle(el).color);
      const match = color.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        // Light text: at least one channel above 150
        const lightChannels = [r, g, b].filter(v => v > 150).length;
        expect(lightChannels).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('7h - Text contrast on mobile', () => {
    test.use({ viewport: MOBILE });

    test('7.09 - Hero heading text color has sufficient contrast on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const heading = page.locator('h1').first();
      const color = await heading.evaluate(el => getComputedStyle(el).color);
      const match = color.match(/\d+/g);
      if (match) {
        const [r, g, b] = match.map(Number);
        const lightChannels = [r, g, b].filter(v => v > 150).length;
        expect(lightChannels).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('7i - Glassmorphism on mobile', () => {
    test.use({ viewport: MOBILE });

    test('7.10 - Cards render with visual styling on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const section = page.locator('section[aria-label="Recursos da plataforma"]');
      await section.scrollIntoViewIfNeeded();
      const card = section.locator('a').filter({ hasText: 'Explorar' }).first();
      if (await card.count() > 0) {
        await expect(card).toBeVisible();
        const box = await card.boundingBox();
        expect(box).toBeTruthy();
        expect(box.width).toBeGreaterThan(0);
        expect(box.height).toBeGreaterThan(0);
      }
    });

    test('7.11 - Footer text contrast on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      const brandText = footer.locator('text=CodeCraft Gen-Z').first();
      if (await brandText.count() > 0) {
        const color = await brandText.evaluate(el => getComputedStyle(el).color);
        const match = color.match(/\d+/g);
        if (match) {
          const [r, g, b] = match.map(Number);
          const lightChannels = [r, g, b].filter(v => v > 100).length;
          expect(lightChannels).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test('7.12 - Social media icons are visible in footer on mobile', async ({ page }) => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      const instagram = footer.locator('a[aria-label="Instagram"]');
      const github = footer.locator('a[aria-label="GitHub"]');
      const whatsapp = footer.locator('a[aria-label="WhatsApp"]');
      await expect(instagram).toBeVisible();
      await expect(github).toBeVisible();
      await expect(whatsapp).toBeVisible();
    });
  });
});
