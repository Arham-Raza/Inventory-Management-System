import { test, expect } from '@playwright/test';

test.describe('Authentication Flow & Rate Limiting', () => {
  test('Successful login redirects to dashboard', async ({ page }) => {
    // Assuming a seeded admin user exists
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@ecs.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard for SUPER_ADMIN
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('Invalid login shows error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@ecs.com');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    // Should display the invalid credentials error
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('Rate limiting blocks after 5 attempts', async ({ page }) => {
    await page.goto('/login');
    const email = 'ratelimit-test@ecs.com';
    
    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', 'wrongpass');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    }

    // 6th attempt should trigger rate limit
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Too many login attempts')).toBeVisible();
  });
});
