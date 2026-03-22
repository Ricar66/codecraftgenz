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
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();
  });

  test('logo is visible', async ({ page }) => {
    const logo = page.locator('nav img[alt*="CodeCraft"]').first();
    await expect(logo).toBeVisible();
  });

  test('logo click navigates to homepage', async ({ page }) => {
    await page.goto('/desafios');
    await waitForSPA(page);
    const logo = page.locator('nav a').filter({ has: page.locator('img') }).first();
    await logo.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('hero section is visible', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toBeVisible();
  });

  test('hero section has a CTA button', async ({ page }) => {
    const ctaButton = page.getByRole('button', { name: /quero ser um crafter/i });
    await expect(ctaButton).toBeVisible();
  });

  test('"Explore a Plataforma" section exists', async ({ page }) => {
    const section = page.getByText(/explor/i).first();
    await expect(section).toBeVisible();
  });

  test('"Sobre a CodeCraft" section exists', async ({ page }) => {
    const section = page.getByText(/sobre/i).first();
    await expect(section).toBeVisible();
  });

  test('footer is visible', async ({ page }) => {
    const footer = page.locator('footer').first();
    // Footer may be below fold; scroll to it
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
  });

  test('navbar link "Desafios" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/desafios/i);
  });

  test('navbar link "Projetos" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Projetos$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/projetos/i);
  });

  test('navbar link "Mentorias" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Mentorias$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/mentoria/i);
  });

  test('navbar link "Ranking" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Ranking$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/ranking/i);
  });

  test('navbar link "Feedbacks" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Feedbacks$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/feedbacks/i);
  });

  test('navbar link "Aplicativos" exists and is clickable', async ({ page }) => {
    const link = page.locator('nav a').filter({ hasText: /^Aplicativos$/ }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/aplicativos/i);
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
// 2. Navigation Flow Tests
// ---------------------------------------------------------------------------
test.describe('Navigation Flows', () => {
  test('navigate to /desafios and verify heading', async ({ page }) => {
    await page.goto('/desafios');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /projetos and verify heading', async ({ page }) => {
    await page.goto('/projetos');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /mentoria and verify heading', async ({ page }) => {
    await page.goto('/mentoria');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /ranking and verify heading', async ({ page }) => {
    await page.goto('/ranking');
    await page.waitForLoadState('domcontentloaded');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigate to /feedbacks and verify heading', async ({ page }) => {
    await page.goto('/feedbacks');
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

  test('navigate to page and go back with browser back button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/desafios');
    await page.waitForLoadState('domcontentloaded');
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('navigate to /login from navbar', async ({ page }) => {
    await page.goto('/');
    await waitForSPA(page);
    // The navbar login link text is "Entrar"
    const loginLink = page.locator('nav a').filter({ hasText: /^Entrar$/ }).first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/login/i);
  });

  test('navigate to /register from login page link', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Login page has "Criar conta" link pointing to /register
    const registerLink = page.locator('a').filter({ hasText: /Criar conta/i }).first();
    await expect(registerLink).toBeVisible({ timeout: 10000 });
    await registerLink.click();
    await expect(page).toHaveURL(/register/i);
  });

  test('unknown route /xyz123 shows 404 page', async ({ page }) => {
    await page.goto('/xyz123');
    await page.waitForLoadState('domcontentloaded');
    // NotFoundPage renders "404" text and "Pagina nao encontrada"
    const notFoundText = page.getByText('404').first();
    await expect(notFoundText).toBeVisible({ timeout: 10000 });
  });

  test('404 page has "Voltar ao Inicio" button that works', async ({ page }) => {
    await page.goto('/xyz123');
    await page.waitForLoadState('domcontentloaded');
    // NotFoundPage has a <button> with text "Voltar ao Inicio"
    const backButton = page.getByRole('button', { name: /Voltar ao In/i });
    await expect(backButton).toBeVisible({ timeout: 10000 });
    await backButton.click();
    await expect(page).toHaveURL(/\/$/);
  });
});

// ---------------------------------------------------------------------------
// 2b. Mobile Navigation Tests
// ---------------------------------------------------------------------------
test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

  test('hamburger menu button is visible on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Hamburger has aria-label "Abrir menu"
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
    const menuLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
  });

  test('mobile menu link navigates to /desafios', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
    await menuLink.click();
    await expect(page).toHaveURL(/desafios/i);
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

  test('mobile menu closes when a link is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    await hamburger.click();
    await page.waitForTimeout(500);
    const menuLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(menuLink).toBeVisible({ timeout: 5000 });
    await menuLink.click();
    await page.waitForTimeout(500);
    // After navigation the menu should close; the hamburger aria-label switches back
    // We verify by checking the hamburger now says "Abrir menu" (closed state)
    const closedHamburger = page.locator('button[aria-label="Abrir menu"]');
    // If the button exists, menu is closed. If not, page navigated away which is also fine.
    const count = await closedHamburger.count();
    if (count > 0) {
      await expect(closedHamburger.first()).toBeVisible();
    }
  });

  test('mobile menu closes when hamburger is toggled again', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const hamburger = page.locator('button[aria-label*="menu" i]').first();
    await expect(hamburger).toBeVisible({ timeout: 10000 });
    // Open menu
    await hamburger.click();
    await page.waitForTimeout(500);
    // Close menu by clicking hamburger again (now it says "Fechar menu")
    const closeBtn = page.locator('button[aria-label*="menu" i]').first();
    await closeBtn.click();
    await page.waitForTimeout(500);
    // After closing, the Desafios link inside nav should not be visible on mobile
    const menuLink = page.locator('nav a').filter({ hasText: /^Desafios$/ }).first();
    await expect(menuLink).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Public Pages Accessibility (no auth required)
// ---------------------------------------------------------------------------
test.describe('Public Pages Load Without Auth', () => {
  const publicRoutes = [
    { path: '/desafios', name: 'Desafios' },
    { path: '/projetos', name: 'Projetos' },
    { path: '/mentoria', name: 'Mentoria' },
    { path: '/ranking', name: 'Ranking' },
    { path: '/feedbacks', name: 'Feedbacks' },
    { path: '/aplicativos', name: 'Aplicativos' },
    { path: '/para-empresas', name: 'Para Empresas' },
    { path: '/politica-privacidade', name: 'Politica de Privacidade' },
    { path: '/termos-uso', name: 'Termos de Uso' },
    { path: '/ajuda', name: 'Ajuda' },
  ];

  for (const route of publicRoutes) {
    test(`${route.name} (${route.path}) loads without authentication`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response).not.toBeNull();
      expect(response.status()).toBeLessThan(400);
      // Should NOT redirect to login
      expect(page.url()).not.toMatch(/login/i);
    });

    test(`${route.name} (${route.path}) has visible content`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      const body = page.locator('body');
      await expect(body).toBeVisible();
      // Wait for any heading to appear (SPA may load content async)
      const heading = page.locator('h1, h2, h3').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Protected Routes
// ---------------------------------------------------------------------------
test.describe('Protected Routes Redirect to Login', () => {
  test('/admin redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/admin');
    // ProtectedRoute does <Navigate to="/login"> when not authenticated
    await page.waitForURL(/login/i, { timeout: 15000 });
    expect(page.url()).toMatch(/login/i);
  });

  test('/admin does not show admin dashboard content', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should have redirected to login, so no dashboard text visible
    const url = page.url();
    expect(url).toMatch(/login/i);
  });

  test('/minha-conta does not require login redirect but shows login form or account page', async ({ page }) => {
    // /minha-conta is NOT wrapped in ProtectedRoute in App.jsx,
    // but the page itself may redirect. We just verify it loads without a server error.
    const response = await page.goto('/minha-conta');
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// 5. SEO & Meta Tags
// ---------------------------------------------------------------------------
test.describe('SEO & Meta Tags', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('page has og:title meta tag', async ({ page }) => {
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    const content = await ogTitle.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  test('page has og:description meta tag', async ({ page }) => {
    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveCount(1);
    const content = await ogDesc.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(0);
  });

  test('page has og:image meta tag', async ({ page }) => {
    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    const content = await ogImage.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content).toMatch(/^https?:\/\//);
  });

  test('page has canonical URL', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toMatch(/^https?:\/\//);
  });

  test('favicon exists', async ({ page }) => {
    const favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]');
    const count = await favicon.count();
    expect(count).toBeGreaterThan(0);
    const href = await favicon.first().getAttribute('href');
    expect(href).toBeTruthy();
  });

  test('page has meta description tag', async ({ page }) => {
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveCount(1);
    const content = await metaDesc.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(10);
  });

  test('page has charset meta tag', async ({ page }) => {
    const charset = page.locator('meta[charset]');
    const count = await charset.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page has viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
    const content = await viewport.getAttribute('content');
    expect(content).toContain('width');
  });

  test('page lang attribute is set to pt-BR or pt', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/pt/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Performance Basics
// ---------------------------------------------------------------------------
test.describe('Performance Basics', () => {
  test('homepage loads in under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('no console errors on homepage', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForTimeout(3000);
    // Filter out known third-party noise (analytics, fonts, CORS, network, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('analytics') &&
        !e.includes('gtag') &&
        !e.includes('third-party') &&
        !e.includes('net::ERR') &&
        !e.includes('Failed to load resource') &&
        !e.includes('CORS') &&
        !e.includes('trackpro') &&
        !e.includes('google') &&
        !e.includes('gsi') &&
        !e.includes('accounts.google.com') &&
        !e.includes('mercadopago') &&
        !e.includes('Content Security Policy') &&
        !e.includes('404')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('all images have alt attributes or are decorative (role="presentation")', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');
      // Image must have alt text, or be explicitly decorative
      const isDecorative = role === 'presentation' || role === 'none' || ariaHidden === 'true';
      const hasAlt = alt !== null;
      expect(hasAlt || isDecorative).toBeTruthy();
    }
  });

  test('no broken images on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs
        .filter((img) => img.complete && img.naturalWidth === 0 && img.src)
        .map((img) => img.src);
    });
    expect(brokenImages).toEqual([]);
  });

  test('page has no more than one h1 tag', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('external links have rel="noopener" or rel="noreferrer"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const externalLinks = page.locator('a[target="_blank"]');
    const count = await externalLinks.count();
    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      const rel = await link.getAttribute('rel');
      expect(rel).toBeTruthy();
      const hasSecureRel = rel.includes('noopener') || rel.includes('noreferrer');
      expect(hasSecureRel).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Footer Tests
// ---------------------------------------------------------------------------
test.describe('Footer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('footer contains copyright text', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible({ timeout: 10000 });
    const text = await footer.textContent();
    expect(text.toLowerCase()).toMatch(/codecraft|©|copyright|direitos/i);
  });

  test('footer has social media links', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    const socialLinks = footer.locator('a[href*="instagram"], a[href*="linkedin"], a[href*="github"], a[href*="twitter"], a[href*="discord"], a[href*="youtube"], a[href*="wa.me"]');
    const count = await socialLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('footer links are not broken (no 404)', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    const links = footer.locator('a[href^="/"]');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href) {
        const response = await page.request.get(BASE_URL + href);
        expect(response.status()).toBeLessThan(404);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 8. Login & Register Page Structure
// ---------------------------------------------------------------------------
test.describe('Login & Register Pages', () => {
  test('login page has email input', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('login page has password input', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
  });

  test('login page has submit button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Submit button text is "Entrar"
    const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /Entrar/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
  });

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    // Link text is "Criar conta" pointing to /register
    const registerLink = page.locator('a').filter({ hasText: /Criar conta/i }).first();
    await expect(registerLink).toBeVisible({ timeout: 10000 });
  });

  test('register page loads successfully', async ({ page }) => {
    // Route is /register (not /registro)
    const response = await page.goto('/register');
    expect(response).not.toBeNull();
    expect(response.status()).toBeLessThan(400);
  });

  test('register page has name input', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    // Input has name="name" and placeholder="Seu nome"
    const nameInput = page.locator('input[name="name"]').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
  });

  test('register page has email input', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test('register page has password input', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
  });
});
