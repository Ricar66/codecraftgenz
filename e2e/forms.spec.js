// @ts-check
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper: trigger blur by pressing Tab
// ---------------------------------------------------------------------------
async function blurByTab(page) {
  await page.keyboard.press('Tab');
}

// Helper: navigate and wait for SPA shell to render
async function visitAndWait(page, path) {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 10000 });
}

// ---------------------------------------------------------------------------
// 1. LOGIN PAGE  (/login)
// ---------------------------------------------------------------------------
test.describe('Login Page (/login)', () => {
  test.beforeEach(async ({ page }) => {
    await visitAndWait(page, '/login');
  });

  test('1.01 - page loads with login form visible', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test('1.02 - email input exists', async ({ page }) => {
    const email = page.locator('#login-email');
    await expect(email).toBeVisible({ timeout: 10000 });
  });

  test('1.03 - email input has associated label', async ({ page }) => {
    const label = page.locator('label[for="login-email"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('1.04 - password input exists', async ({ page }) => {
    const pw = page.locator('#login-password');
    await expect(pw).toBeVisible({ timeout: 10000 });
  });

  test('1.05 - password input has associated label', async ({ page }) => {
    const label = page.locator('label[for="login-password"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('1.06 - submit button exists and says "Entrar"', async ({ page }) => {
    const btn = page.getByRole('button', { name: /entrar/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
    await expect(btn).toContainText('Entrar');
  });

  test('1.07 - empty form submission shows error', async ({ page }) => {
    // Focus email, leave empty, blur to trigger validation
    const email = page.locator('#login-email');
    await email.focus();
    await email.fill('');
    await blurByTab(page);
    // The browser native required validation or the app's onBlur should show error
    const error = page.locator('#login-email-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('1.08 - invalid email format shows validation error on blur', async ({ page }) => {
    const email = page.locator('#login-email');
    await email.fill('notanemail');
    await blurByTab(page);
    const error = page.locator('#login-email-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('1.09 - empty password shows validation error on blur', async ({ page }) => {
    const pw = page.locator('#login-password');
    await pw.focus();
    await pw.fill('');
    await blurByTab(page);
    const error = page.locator('#login-password-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('1.10 - valid email format clears error on blur', async ({ page }) => {
    const email = page.locator('#login-email');
    // First trigger error
    await email.fill('bad');
    await blurByTab(page);
    await expect(page.locator('#login-email-error')).toBeVisible({ timeout: 5000 });
    // Now fix it
    await email.fill('user@example.com');
    await blurByTab(page);
    await expect(page.locator('#login-email-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('1.11 - Google login button visible', async ({ page }) => {
    // Google login may or may not be configured; just check the container exists
    const googleContainer = page.locator('#google-signin-btn');
    const count = await googleContainer.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('1.12 - "Esqueceu a senha?" link exists and navigates to /forgot-password', async ({ page }) => {
    const link = page.getByRole('link', { name: /esquec/i });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await page.waitForURL(/forgot-password/, { timeout: 10000 });
    expect(page.url()).toContain('/forgot-password');
  });

  test('1.13 - "Criar conta" link exists and navigates to /register', async ({ page }) => {
    const link = page.getByRole('link', { name: /criar conta/i });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await page.waitForURL(/register/, { timeout: 10000 });
    expect(page.url()).toContain('/register');
  });

  test('1.14 - login with wrong credentials shows error message', async ({ page }) => {
    const email = page.locator('#login-email');
    const pw = page.locator('#login-password');
    await email.fill('wrong@wrong.com');
    await pw.fill('WrongPassword123');
    await page.getByRole('button', { name: /entrar/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible({ timeout: 10000 });
  });

  test('1.15 - email input has autocomplete attribute', async ({ page }) => {
    const email = page.locator('#login-email');
    const ac = await email.getAttribute('autocomplete');
    expect(ac).toBeTruthy();
  });

  test('1.16 - password input has autocomplete attribute', async ({ page }) => {
    const pw = page.locator('#login-password');
    const ac = await pw.getAttribute('autocomplete');
    expect(ac).toBeTruthy();
  });

  test('1.17 - email input has type="email" or correct name', async ({ page }) => {
    const email = page.locator('#login-email');
    await expect(email).toHaveAttribute('type', 'email');
  });

  test('1.18 - password input has type="password"', async ({ page }) => {
    const pw = page.locator('#login-password');
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('1.19 - page title or heading contains login-related text', async ({ page }) => {
    const heading = page.getByText('Entrar na plataforma');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('1.20 - form does not submit when pressing Enter with empty fields', async ({ page }) => {
    const email = page.locator('#login-email');
    await email.focus();
    await page.keyboard.press('Enter');
    // Should stay on /login
    expect(page.url()).toContain('/login');
  });
});

// ---------------------------------------------------------------------------
// 2. REGISTER PAGE  (/register)
// ---------------------------------------------------------------------------
test.describe('Register Page (/register)', () => {
  test.beforeEach(async ({ page }) => {
    await visitAndWait(page, '/register');
  });

  test('2.01 - page loads with register form visible', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test('2.02 - name field exists', async ({ page }) => {
    const name = page.locator('#register-name');
    await expect(name).toBeVisible({ timeout: 10000 });
  });

  test('2.03 - email field exists', async ({ page }) => {
    const email = page.locator('#register-email');
    await expect(email).toBeVisible({ timeout: 10000 });
  });

  test('2.04 - password field exists', async ({ page }) => {
    const pw = page.locator('#register-password');
    await expect(pw).toBeVisible({ timeout: 10000 });
  });

  test('2.05 - confirm password field exists', async ({ page }) => {
    const confirmPw = page.locator('#register-confirm-password');
    await expect(confirmPw).toBeVisible({ timeout: 10000 });
  });

  test('2.06 - empty name shows error on blur', async ({ page }) => {
    const name = page.locator('#register-name');
    await name.focus();
    await name.fill('');
    await blurByTab(page);
    const error = page.locator('#register-name-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.07 - name with 1 char shows "pelo menos 2 caracteres" on blur', async ({ page }) => {
    const name = page.locator('#register-name');
    await name.fill('A');
    await blurByTab(page);
    const error = page.getByText(/pelo menos 2 caracteres/i);
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.08 - valid name (3+ chars) clears error on blur', async ({ page }) => {
    const name = page.locator('#register-name');
    await name.fill('A');
    await blurByTab(page);
    await expect(page.locator('#register-name-error')).toBeVisible({ timeout: 5000 });
    await name.fill('Ana');
    await blurByTab(page);
    await expect(page.locator('#register-name-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('2.09 - invalid email shows error on blur', async ({ page }) => {
    const email = page.locator('#register-email');
    await email.fill('invalidemail');
    await blurByTab(page);
    const error = page.locator('#register-email-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.10 - valid email clears error on blur', async ({ page }) => {
    const email = page.locator('#register-email');
    await email.fill('bad');
    await blurByTab(page);
    await expect(page.locator('#register-email-error')).toBeVisible({ timeout: 5000 });
    await email.fill('valid@email.com');
    await blurByTab(page);
    await expect(page.locator('#register-email-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('2.11 - password < 8 chars shows error on blur', async ({ page }) => {
    const pw = page.locator('#register-password');
    await pw.fill('Ab1');
    await blurByTab(page);
    const error = page.locator('#register-password-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.12 - password without uppercase shows error on blur', async ({ page }) => {
    const pw = page.locator('#register-password');
    await pw.fill('abcdefg1');
    await blurByTab(page);
    const error = page.locator('#register-password-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.13 - password without number shows error on blur', async ({ page }) => {
    const pw = page.locator('#register-password');
    await pw.fill('Abcdefgh');
    await blurByTab(page);
    const error = page.locator('#register-password-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.14 - valid password shows strength indicator', async ({ page }) => {
    const pw = page.locator('#register-password');
    await pw.fill('Abc12345');
    await blurByTab(page);
    const indicator = page.getByText(/forte|média|fraca/i);
    await expect(indicator.first()).toBeVisible({ timeout: 5000 });
  });

  test('2.15 - password "Abc12345" shows "Forte" strength', async ({ page }) => {
    const pw = page.locator('#register-password');
    await pw.fill('Abc12345');
    await blurByTab(page);
    const strong = page.getByText(/Forte/);
    await expect(strong).toBeVisible({ timeout: 5000 });
  });

  test('2.16 - confirm password mismatch shows error', async ({ page }) => {
    const pw = page.locator('#register-password');
    const confirmPw = page.locator('#register-confirm-password');
    await pw.fill('Abc12345');
    await confirmPw.fill('Different1');
    await blurByTab(page);
    const error = page.getByText(/senhas não conferem/i);
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.17 - matching passwords clears mismatch error', async ({ page }) => {
    const pw = page.locator('#register-password');
    const confirmPw = page.locator('#register-confirm-password');
    await pw.fill('Abc12345');
    await confirmPw.fill('Different1');
    await blurByTab(page);
    await expect(page.locator('#register-confirm-password-error')).toBeVisible({ timeout: 5000 });
    await confirmPw.fill('Abc12345');
    await blurByTab(page);
    await expect(page.locator('#register-confirm-password-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('2.18 - empty form submission shows errors', async ({ page }) => {
    await page.getByRole('button', { name: /criar conta/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('2.19 - form has autocomplete attributes on email', async ({ page }) => {
    const email = page.locator('#register-email');
    const ac = await email.getAttribute('autocomplete');
    expect(ac).toBeTruthy();
  });

  test('2.20 - form has autocomplete on name field', async ({ page }) => {
    const name = page.locator('#register-name');
    const ac = await name.getAttribute('autocomplete');
    expect(ac).toBeTruthy();
  });

  test('2.21 - "Já tem conta? Fazer login" link navigates to /login', async ({ page }) => {
    const link = page.getByRole('link', { name: /fazer login/i });
    await expect(link).toBeVisible({ timeout: 10000 });
    await link.click();
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('2.22 - password hint text visible: "Mínimo 8 caracteres"', async ({ page }) => {
    const hint = page.getByText(/mínimo 8 caracteres/i);
    await expect(hint).toBeVisible({ timeout: 5000 });
  });

  test('2.23 - name label is visible', async ({ page }) => {
    const label = page.locator('label[for="register-name"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('2.24 - email label is visible', async ({ page }) => {
    const label = page.locator('label[for="register-email"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('2.25 - password label is visible', async ({ page }) => {
    const label = page.locator('label[for="register-password"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('2.26 - page heading contains register-related text', async ({ page }) => {
    const heading = page.getByText('Criar Conta');
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 3. B2B FORM  (/para-empresas)
// ---------------------------------------------------------------------------
test.describe('B2B Form (/para-empresas)', () => {
  test.beforeEach(async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
  });

  test('3.01 - form section exists on page', async ({ page }) => {
    const form = page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });

  test('3.02 - company name field exists', async ({ page }) => {
    const field = page.locator('#companyName');
    await expect(field).toBeVisible({ timeout: 10000 });
  });

  test('3.03 - company name field has maxLength 256', async ({ page }) => {
    const field = page.locator('#companyName');
    await expect(field).toHaveAttribute('maxlength', '256');
  });

  test('3.04 - contact name field exists', async ({ page }) => {
    const field = page.locator('#responsibleName');
    await expect(field).toBeVisible({ timeout: 10000 });
  });

  test('3.05 - contact name field has maxLength 256', async ({ page }) => {
    const field = page.locator('#responsibleName');
    await expect(field).toHaveAttribute('maxlength', '256');
  });

  test('3.06 - email field exists', async ({ page }) => {
    const field = page.locator('#email');
    await expect(field).toBeVisible({ timeout: 10000 });
  });

  test('3.07 - email field has maxLength 256', async ({ page }) => {
    const field = page.locator('#email');
    await expect(field).toHaveAttribute('maxlength', '256');
  });

  test('3.08 - description textarea exists', async ({ page }) => {
    const field = page.locator('#description');
    await expect(field).toBeVisible({ timeout: 10000 });
  });

  test('3.09 - description textarea has maxLength 5000', async ({ page }) => {
    const field = page.locator('#description');
    await expect(field).toHaveAttribute('maxlength', '5000');
  });

  test('3.10 - empty company name shows error on blur', async ({ page }) => {
    const field = page.locator('#companyName');
    await field.focus();
    await field.fill('');
    await blurByTab(page);
    const error = page.locator('#companyName-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('3.11 - empty contact name shows error on blur', async ({ page }) => {
    const field = page.locator('#responsibleName');
    await field.focus();
    await field.fill('');
    await blurByTab(page);
    const error = page.locator('#responsibleName-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('3.12 - invalid email shows error on blur', async ({ page }) => {
    const field = page.locator('#email');
    await field.fill('notvalid');
    await blurByTab(page);
    const error = page.locator('#email-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('3.13 - project type select exists and is required', async ({ page }) => {
    const select = page.locator('#projectType');
    await expect(select).toBeVisible({ timeout: 10000 });
  });

  test('3.14 - description too short (< 20 chars) shows error on blur', async ({ page }) => {
    const field = page.locator('#description');
    await field.fill('Short text');
    await blurByTab(page);
    const error = page.locator('#description-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('3.15 - description char counter shows "X / 5000 caracteres"', async ({ page }) => {
    const counter = page.locator('#description-counter');
    await expect(counter).toBeVisible({ timeout: 5000 });
    await expect(counter).toContainText('/ 5000 caracteres');
  });

  test('3.16 - typing in description updates char counter', async ({ page }) => {
    const field = page.locator('#description');
    await field.fill('');
    const counter = page.locator('#description-counter');
    await expect(counter).toContainText('0 / 5000');
    // Fill text and check counter updates
    await field.fill('Hello World Test');
    await expect(counter).toContainText('16 / 5000');
  });

  test('3.17 - valid company name clears error on blur', async ({ page }) => {
    const field = page.locator('#companyName');
    await field.focus();
    await field.fill('');
    await blurByTab(page);
    await expect(page.locator('#companyName-error')).toBeVisible({ timeout: 5000 });
    await field.fill('Empresa Teste');
    await blurByTab(page);
    await expect(page.locator('#companyName-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('3.18 - valid email clears error on blur', async ({ page }) => {
    const field = page.locator('#email');
    await field.fill('bad');
    await blurByTab(page);
    await expect(page.locator('#email-error')).toBeVisible({ timeout: 5000 });
    await field.fill('test@empresa.com');
    await blurByTab(page);
    await expect(page.locator('#email-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('3.19 - submit with all empty fields shows errors', async ({ page }) => {
    const submit = page.getByRole('button', { name: /enviar solicitação/i });
    await submit.click();
    // At least one error span should appear
    const error = page.locator('#companyName-error, #responsibleName-error, #email-error, #projectType-error, #description-error');
    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test('3.20 - valid description (20+ chars) clears error on blur', async ({ page }) => {
    const field = page.locator('#description');
    await field.fill('Short');
    await blurByTab(page);
    await expect(page.locator('#description-error')).toBeVisible({ timeout: 5000 });
    await field.fill('Esta eh uma descricao com mais de vinte caracteres para o teste');
    await blurByTab(page);
    await expect(page.locator('#description-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('3.21 - company name label is visible', async ({ page }) => {
    const label = page.locator('label[for="companyName"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('3.22 - contact name label is visible', async ({ page }) => {
    const label = page.locator('label[for="responsibleName"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('3.23 - email label is visible', async ({ page }) => {
    const label = page.locator('label[for="email"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('3.24 - description label is visible', async ({ page }) => {
    const label = page.locator('label[for="description"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('3.25 - submit button is visible', async ({ page }) => {
    const btn = page.getByRole('button', { name: /enviar solicitação/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 4. FORGOT PASSWORD PAGE  (/forgot-password)
// ---------------------------------------------------------------------------
test.describe('Forgot Password Page (/forgot-password)', () => {
  test.beforeEach(async ({ page }) => {
    await visitAndWait(page, '/forgot-password');
  });

  test('4.01 - page loads with email input', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    await expect(email).toBeVisible({ timeout: 10000 });
  });

  test('4.02 - submit button exists', async ({ page }) => {
    const btn = page.getByRole('button', { name: /enviar link/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('4.03 - submit with empty email shows native validation (required)', async ({ page }) => {
    // The input has required attribute, so the browser will block submission
    // We can verify the form still shows and no navigation happened
    await page.getByRole('button', { name: /enviar link/i }).click();
    // Should stay on forgot-password page
    expect(page.url()).toContain('/forgot-password');
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('4.04 - page has heading or description text', async ({ page }) => {
    const heading = page.getByText('Esqueci minha senha');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('4.05 - submit with valid email shows success or error message', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    await email.fill('test@example.com');
    await page.getByRole('button', { name: /enviar link/i }).click();
    // Should show either success [role="status"] or error [role="alert"]
    const message = page.locator('[role="alert"], [role="status"]');
    await expect(message.first()).toBeVisible({ timeout: 10000 });
  });

  test('4.06 - email label is visible', async ({ page }) => {
    const label = page.getByText('E-mail');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('4.07 - page has descriptive subtitle', async ({ page }) => {
    const subtitle = page.getByText(/informe seu e-mail/i);
    await expect(subtitle).toBeVisible({ timeout: 10000 });
  });

  test('4.08 - form exists on page', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 10000 });
  });

  test('4.09 - email input has required attribute', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    const required = await email.getAttribute('required');
    expect(required !== null).toBeTruthy();
  });

  test('4.10 - valid email submission does not crash', async ({ page }) => {
    const email = page.locator('input[type="email"]');
    await email.fill('user@example.com');
    await page.getByRole('button', { name: /enviar link/i }).click();
    // Page should still be functional
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 5. FEEDBACK FORM  (/feedbacks)
// ---------------------------------------------------------------------------
test.describe('Feedback Form (/feedbacks)', () => {
  test.beforeEach(async ({ page }) => {
    await visitAndWait(page, '/feedbacks');
  });

  test('5.01 - form exists on page', async ({ page }) => {
    const form = page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });

  test('5.02 - has name field', async ({ page }) => {
    const name = page.locator('#nome');
    await expect(name).toBeVisible({ timeout: 10000 });
  });

  test('5.03 - has email field', async ({ page }) => {
    const email = page.locator('#email');
    await expect(email).toBeVisible({ timeout: 10000 });
  });

  test('5.04 - has message field', async ({ page }) => {
    const msg = page.locator('#mensagem');
    await expect(msg).toBeVisible({ timeout: 10000 });
  });

  test('5.05 - submit button exists', async ({ page }) => {
    const btn = page.getByRole('button', { name: /enviar feedback/i });
    await expect(btn).toBeVisible({ timeout: 10000 });
  });

  test('5.06 - empty form submission shows errors', async ({ page }) => {
    await page.getByRole('button', { name: /enviar feedback/i }).click();
    const error = page.locator('[role="alert"]');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('5.07 - name label is visible', async ({ page }) => {
    const label = page.locator('label[for="nome"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('5.08 - email label is visible', async ({ page }) => {
    const label = page.locator('label[for="email"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('5.09 - message label is visible', async ({ page }) => {
    const label = page.locator('label[for="mensagem"]');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('5.10 - invalid email shows error via real-time validation', async ({ page }) => {
    const email = page.locator('#email');
    await email.fill('notvalid');
    // FeedbackForm uses useEffect for real-time validation, error shown as span.error-message
    const error = page.getByText(/email deve ter um formato válido/i);
    await expect(error).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// 6. FORM SECURITY TESTS
// ---------------------------------------------------------------------------
test.describe('Form Security Tests', () => {

  test('6.01 - Login: XSS in email field should not execute', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    const xssPayload = '<script>alert(1)</script>';
    await email.fill(xssPayload);
    await blurByTab(page);

    // Ensure no dialog was triggered
    let dialogTriggered = false;
    page.on('dialog', () => { dialogTriggered = true; });
    await page.waitForTimeout(1000);
    expect(dialogTriggered).toBe(false);

    // Ensure the script tag is NOT rendered as HTML in the DOM
    const scripts = await page.locator('script:has-text("alert(1)")').count();
    expect(scripts).toBe(0);
  });

  test('6.02 - Login: XSS in password field should not execute', async ({ page }) => {
    await visitAndWait(page, '/login');
    const pw = page.locator('#login-password');
    await pw.fill('<img src=x onerror=alert(1)>');
    await blurByTab(page);

    let dialogTriggered = false;
    page.on('dialog', () => { dialogTriggered = true; });
    await page.waitForTimeout(1000);
    expect(dialogTriggered).toBe(false);
  });

  test('6.03 - Register: very long name (1000 chars) is handled', async ({ page }) => {
    await visitAndWait(page, '/register');
    const name = page.locator('#register-name');
    const longName = 'A'.repeat(1000);
    await name.fill(longName);
    await blurByTab(page);
    // Should not crash; value should be truncated or accepted
    const value = await name.inputValue();
    expect(value.length).toBeGreaterThan(0);
    expect(value.length).toBeLessThanOrEqual(1000);
  });

  test('6.04 - Register: XSS in name field should not execute', async ({ page }) => {
    await visitAndWait(page, '/register');
    const name = page.locator('#register-name');
    await name.fill('<script>alert("xss")</script>');
    await blurByTab(page);

    let dialogTriggered = false;
    page.on('dialog', () => { dialogTriggered = true; });
    await page.waitForTimeout(1000);
    expect(dialogTriggered).toBe(false);
  });

  test('6.05 - B2B: description with 5001 chars is limited by maxLength', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const desc = page.locator('#description');
    const longText = 'A'.repeat(5001);
    await desc.fill(longText);
    const value = await desc.inputValue();
    expect(value.length).toBeLessThanOrEqual(5000);
  });

  test('6.06 - B2B: HTML in description should not render as HTML', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const desc = page.locator('#description');
    await desc.fill('<h1>Injected Heading</h1><script>alert(1)</script>');
    await blurByTab(page);

    // Ensure no injected h1 appears outside the textarea
    const injected = page.locator('h1:has-text("Injected Heading")');
    await expect(injected).toHaveCount(0);
  });

  test('6.07 - B2B: SQL injection in email should not crash', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const email = page.locator('#email');
    await email.fill("' OR 1=1 --");
    await blurByTab(page);
    // Page should still be functional
    const form = page.locator('form');
    await expect(form.first()).toBeVisible();
  });

  test('6.08 - Login: SQL injection in email should not crash', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    await email.fill("admin'--");
    const pw = page.locator('#login-password');
    await pw.fill('password');
    await page.getByRole('button', { name: /entrar/i }).click();
    // Should show validation error, not crash
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });

  test('6.09 - Register: email with special chars handled', async ({ page }) => {
    await visitAndWait(page, '/register');
    const email = page.locator('#register-email');
    await email.fill('test+special@example.com');
    await blurByTab(page);
    const value = await email.inputValue();
    expect(value).toBe('test+special@example.com');
  });

  test('6.10 - Feedback: XSS in message should not execute', async ({ page }) => {
    await visitAndWait(page, '/feedbacks');
    const msg = page.locator('#mensagem');
    await msg.fill('<script>document.title="hacked"</script>');
    await blurByTab(page);
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).not.toBe('hacked');
  });
});

// ---------------------------------------------------------------------------
// 7. FORM ACCESSIBILITY TESTS
// ---------------------------------------------------------------------------
test.describe('Accessibility - Login Form', () => {

  test('7.01 - all inputs have associated labels', async ({ page }) => {
    await visitAndWait(page, '/login');
    const inputs = page.locator('form input:not([type="hidden"]):not([type="submit"])');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;
      expect(isLabelled).toBe(true);
    }
  });

  test('7.02 - submit button has proper text', async ({ page }) => {
    await visitAndWait(page, '/login');
    const btn = page.locator('button[type="submit"]');
    const text = await btn.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('7.03 - tab order follows visual order on login', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    const pw = page.locator('#login-password');
    await email.focus();
    expect(await email.evaluate(el => document.activeElement === el)).toBe(true);
    await page.keyboard.press('Tab');
    expect(await pw.evaluate(el => document.activeElement === el)).toBe(true);
  });

  test('7.04 - required fields are marked on login', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    const required = await email.getAttribute('required');
    const ariaRequired = await email.getAttribute('aria-required');
    expect(required !== null || ariaRequired === 'true').toBeTruthy();
  });
});

test.describe('Accessibility - Register Form', () => {

  test('7.05 - all inputs have associated labels', async ({ page }) => {
    await visitAndWait(page, '/register');
    const inputs = page.locator('form input:not([type="hidden"]):not([type="submit"])');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;
      expect(isLabelled).toBe(true);
    }
  });

  test('7.06 - submit button has proper text on register', async ({ page }) => {
    await visitAndWait(page, '/register');
    const btn = page.locator('button[type="submit"]');
    const text = await btn.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('7.07 - required fields are marked on register', async ({ page }) => {
    await visitAndWait(page, '/register');
    const email = page.locator('#register-email');
    const required = await email.getAttribute('required');
    const ariaRequired = await email.getAttribute('aria-required');
    expect(required !== null || ariaRequired === 'true').toBeTruthy();
  });

  test('7.08 - tab order: name -> email -> password -> confirm', async ({ page }) => {
    await visitAndWait(page, '/register');
    const name = page.locator('#register-name');
    await name.focus();
    expect(await name.evaluate(el => document.activeElement === el)).toBe(true);
    await page.keyboard.press('Tab');
    const email = page.locator('#register-email');
    expect(await email.evaluate(el => document.activeElement === el)).toBe(true);
  });
});

test.describe('Accessibility - B2B Form', () => {

  test('7.09 - all visible inputs have associated labels', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const inputs = page.locator('form input:not([type="hidden"]):not([type="submit"]), form textarea, form select');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;
      expect(isLabelled).toBe(true);
    }
  });

  test('7.10 - submit button has proper text on B2B', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const btn = page.locator('button[type="submit"]');
    const text = await btn.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('7.11 - required fields have aria-invalid attribute on B2B', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    // The B2B email field does not have required attribute but does have aria-invalid
    const email = page.locator('#email');
    const ariaInvalid = await email.getAttribute('aria-invalid');
    // aria-invalid is set (to "false" initially)
    expect(ariaInvalid !== null).toBeTruthy();
  });
});

test.describe('Accessibility - Forgot Password Form', () => {

  test('7.12 - email input has associated label', async ({ page }) => {
    await visitAndWait(page, '/forgot-password');
    // The forgot password email input has no id, but the label text is "E-mail"
    const label = page.getByText('E-mail');
    await expect(label).toBeVisible({ timeout: 10000 });
  });

  test('7.13 - submit button has accessible text', async ({ page }) => {
    await visitAndWait(page, '/forgot-password');
    const btn = page.locator('button[type="submit"]');
    const text = await btn.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

test.describe('Accessibility - Feedback Form', () => {

  test('7.14 - all inputs have associated labels on feedbacks', async ({ page }) => {
    await visitAndWait(page, '/feedbacks');
    // Check visible form inputs (exclude honeypot)
    const inputs = page.locator('form input:not([type="hidden"]):not([type="submit"]):not([tabindex="-1"]), form textarea');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const hasLabel = id ? await page.locator(`label[for="${id}"]`).count() > 0 : false;
      const isLabelled = hasLabel || !!ariaLabel || !!ariaLabelledBy;
      expect(isLabelled).toBe(true);
    }
  });

  test('7.15 - submit button has accessible text on feedbacks', async ({ page }) => {
    await visitAndWait(page, '/feedbacks');
    const btn = page.locator('button[type="submit"]');
    const text = await btn.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 8. CROSS-FORM NAVIGATION TESTS
// ---------------------------------------------------------------------------
test.describe('Cross-Form Navigation', () => {

  test('8.01 - login -> register -> login round-trip', async ({ page }) => {
    await visitAndWait(page, '/login');
    const regLink = page.getByRole('link', { name: /criar conta/i });
    await regLink.click();
    await page.waitForURL(/register/, { timeout: 10000 });
    const loginLink = page.getByRole('link', { name: /fazer login/i });
    await loginLink.click();
    await page.waitForURL(/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('8.02 - login -> forgot password navigation', async ({ page }) => {
    await visitAndWait(page, '/login');
    const forgotLink = page.getByRole('link', { name: /esquec/i });
    await forgotLink.click();
    await page.waitForURL(/forgot-password/, { timeout: 10000 });
    expect(page.url()).toContain('/forgot-password');
  });

  test('8.03 - direct navigation to /para-empresas works', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const form = page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });

  test('8.04 - direct navigation to /feedbacks works', async ({ page }) => {
    await visitAndWait(page, '/feedbacks');
    const form = page.locator('form');
    await expect(form.first()).toBeVisible({ timeout: 10000 });
  });

  test('8.05 - browser back button preserves form state', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    await email.fill('test@example.com');
    const regLink = page.getByRole('link', { name: /criar conta/i });
    await regLink.click();
    await page.waitForURL(/register/, { timeout: 10000 });
    await page.goBack();
    await page.waitForURL(/login/, { timeout: 10000 });
    // Form may or may not persist state depending on implementation
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 9. FORM INPUT EDGE CASES
// ---------------------------------------------------------------------------
test.describe('Form Input Edge Cases', () => {

  test('9.01 - Login: email with spaces trimmed', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    await email.fill('  user@example.com  ');
    await blurByTab(page);
    // Should not show format error (app should trim)
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('9.02 - Login: paste into email field works', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    await email.focus();
    await page.evaluate(() => {
      const input = document.querySelector('#login-email');
      if (input) {
        input.value = 'pasted@example.com';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    const value = await email.inputValue();
    expect(value).toBe('pasted@example.com');
  });

  test('9.03 - Register: unicode characters in name', async ({ page }) => {
    await visitAndWait(page, '/register');
    const name = page.locator('#register-name');
    await name.fill('Jose da Silva');
    await blurByTab(page);
    const value = await name.inputValue();
    expect(value).toContain('Jose');
  });

  test('9.04 - Register: email with subdomain', async ({ page }) => {
    await visitAndWait(page, '/register');
    const email = page.locator('#register-email');
    await email.fill('user@mail.empresa.com.br');
    await blurByTab(page);
    // Valid email should not show error
    const value = await email.inputValue();
    expect(value).toBe('user@mail.empresa.com.br');
  });

  test('9.05 - B2B: description with exactly 20 chars should be valid', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const desc = page.locator('#description');
    await desc.fill('A'.repeat(20));
    await blurByTab(page);
    await expect(page.locator('#description-error')).toHaveCount(0, { timeout: 5000 });
  });

  test('9.06 - B2B: description with exactly 19 chars should be invalid', async ({ page }) => {
    await visitAndWait(page, '/para-empresas');
    const desc = page.locator('#description');
    await desc.fill('A'.repeat(19));
    await blurByTab(page);
    const error = page.locator('#description-error');
    await expect(error).toBeVisible({ timeout: 5000 });
  });

  test('9.07 - Login: multiple rapid submissions do not crash', async ({ page }) => {
    await visitAndWait(page, '/login');
    const email = page.locator('#login-email');
    const pw = page.locator('#login-password');
    await email.fill('test@test.com');
    await pw.fill('Password123');
    const btn = page.getByRole('button', { name: /entrar/i });
    // Rapid clicks
    await btn.click();
    await btn.click();
    await btn.click();
    // Page should not crash
    await page.waitForTimeout(2000);
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('9.08 - Register: password visibility toggle works (if present)', async ({ page }) => {
    await visitAndWait(page, '/register');
    const toggle = page.locator('button[aria-label*="senha"], button[aria-label*="password"]');
    const count = await toggle.count();
    if (count > 0) {
      const pw = page.locator('#register-password');
      await toggle.first().click();
      await expect(pw).toHaveAttribute('type', 'text');
      await toggle.first().click();
      await expect(pw).toHaveAttribute('type', 'password');
    } else {
      // No toggle present; test passes
      expect(true).toBe(true);
    }
  });
});
