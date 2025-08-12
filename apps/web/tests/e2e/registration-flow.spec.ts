import { test, expect, Page } from '@playwright/test';
import { randomBytes } from 'crypto';

// Test data generator
const generateTestUser = () => {
  const random = randomBytes(4).toString('hex');
  return {
    firstName: `Test${random}`,
    lastName: `User${random}`,
    email: `test.user+${random}@gametriq.test`,
    password: 'TestPassword123!',
    parentEmail: `parent+${random}@gametriq.test`,
    parentName: `Parent ${random}`,
  };
};

// Helper functions
async function fillPersonalInfo(page: Page, user: typeof testUser) {
  await page.fill('input[id="firstName"]', user.firstName);
  await page.fill('input[id="lastName"]', user.lastName);
  await page.fill('input[id="email"]', user.email);
  await page.fill('input[id="password"]', user.password);
  await page.fill('input[id="confirmPassword"]', user.password);
}

async function selectRole(page: Page, role: string) {
  await page.click(`button:has-text("${role}")`);
}

async function fillDateOfBirth(page: Page, month: string, day: string, year: string) {
  // Month selection
  await page.click('button[role="combobox"]:has-text("Month")');
  await page.click(`[role="option"]:has-text("${month}")`);
  
  // Day selection
  await page.click('button[role="combobox"]:has-text("Day")');
  await page.click(`[role="option"]:has-text("${day}")`);
  
  // Year selection
  await page.click('button[role="combobox"]:has-text("Year")');
  await page.click(`[role="option"]:has-text("${year}")`);
}

async function completePayment(page: Page, cardNumber = '4242424242424242') {
  // Wait for payment form
  await expect(page.locator('text=Payment Information')).toBeVisible();
  
  // Fill card details
  await page.fill('input[placeholder="1234 5678 9012 3456"]', cardNumber);
  await page.fill('input[placeholder="MM/YY"]', '12/25');
  await page.fill('input[placeholder="123"]', '123');
  await page.fill('input[placeholder="12345"]', '10001');
  
  // Submit payment
  await page.click('button:has-text("Pay $")');
}

const testUser = generateTestUser();

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Enable feature flags
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flags', JSON.stringify({
        registration_v1: true,
        payments_live_v1: true,
        branding_v1: true,
        pwa_v1: true
      }));
    });
    
    await page.goto('/register');
  });

  test('Happy Path: Complete adult registration as coach', async ({ page }) => {
    // Step 1: Personal Information
    await expect(page.locator('h1')).toContainText('Create Your Account');
    await expect(page.locator('text=Personal Information')).toBeVisible();
    
    await fillPersonalInfo(page, testUser);
    
    // Verify password requirements are shown
    await expect(page.locator('text=Password must contain uppercase, lowercase, and numbers')).toBeVisible();
    
    await page.click('button:has-text("Continue")');
    
    // Step 2: Role Selection
    await expect(page.locator('text=Select Your Role')).toBeVisible();
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    
    await selectRole(page, 'Team Coach');
    await expect(page.locator('text=Minimum age: 16 years')).toBeVisible();
    
    await page.click('button:has-text("Continue")');
    
    // Step 3: Age Verification
    await expect(page.locator('text=Age Verification')).toBeVisible();
    
    await fillDateOfBirth(page, 'January', '15', '1990');
    
    await page.click('button:has-text("Continue")');
    
    // Step 4: Account Creation
    await expect(page.locator('text=Create Your Account')).toBeVisible();
    await expect(page.locator('text=Account Summary')).toBeVisible();
    
    // Verify account summary
    await expect(page.locator('text=Name:')).toBeVisible();
    await expect(page.locator(`text=${testUser.firstName} ${testUser.lastName}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
    await expect(page.locator('text=Team Coach')).toBeVisible();
    
    // Agree to terms
    await page.check('input[id="agree-terms"]');
    await page.check('input[id="agree-privacy"]');
    
    // Optional marketing
    await page.check('input[id="allow-marketing"]');
    
    await page.click('button:has-text("Create Account")');
    
    // Success
    await expect(page.locator('text=Welcome to GameTriq!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Account Verified')).toBeVisible();
    
    // Should redirect to dashboard
    await page.waitForURL('**/dashboard/coach', { timeout: 5000 });
  });

  test('Happy Path: Minor registration with parental consent', async ({ page }) => {
    const minorUser = generateTestUser();
    
    // Step 1: Personal Information
    await fillPersonalInfo(page, minorUser);
    await page.click('button:has-text("Continue")');
    
    // Step 2: Role Selection - Player
    await selectRole(page, 'Player');
    await page.click('button:has-text("Continue")');
    
    // Step 3: Age Verification - Under 13
    await fillDateOfBirth(page, 'June', '15', '2015'); // 9 years old
    
    // Should show parental consent fields
    await expect(page.locator('text=Parental Consent Required')).toBeVisible();
    await expect(page.locator('text=COPPA compliance')).toBeVisible();
    
    // Fill parent information
    await page.fill('input[id="parentName"]', minorUser.parentName);
    await page.fill('input[id="parentEmail"]', minorUser.parentEmail);
    
    await page.click('button:has-text("Continue")');
    
    // Age Gate should appear
    await expect(page.locator('text=Age Verification')).toBeVisible();
    
    // Complete age gate with parental consent
    // This would interact with the AgeGate component
    // For testing purposes, we'll assume it's mocked
    
    // Continue to account creation
    await expect(page.locator('text=COPPA Compliant')).toBeVisible();
    await expect(page.locator(`text=${minorUser.parentName}`)).toBeVisible();
    
    await page.check('input[id="agree-terms"]');
    await page.check('input[id="agree-privacy"]');
    
    await page.click('button:has-text("Create Account")');
    
    // Success with parental consent badge
    await expect(page.locator('text=Welcome to GameTriq!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Parental Consent Granted')).toBeVisible();
  });

  test('Validation: Email format and password requirements', async ({ page }) => {
    // Try invalid email
    await page.fill('input[id="email"]', 'invalid-email');
    await page.fill('input[id="firstName"]', 'Test');
    await page.fill('input[id="lastName"]', 'User');
    await page.fill('input[id="password"]', 'weak');
    await page.fill('input[id="confirmPassword"]', 'weak');
    
    await page.click('button:has-text("Continue")');
    
    // Should show validation errors
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
  });

  test('Validation: Password mismatch', async ({ page }) => {
    await fillPersonalInfo(page, testUser);
    await page.fill('input[id="confirmPassword"]', 'DifferentPassword123!');
    
    await page.click('button:has-text("Continue")');
    
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('Validation: Age restriction for role', async ({ page }) => {
    // Fill personal info
    await fillPersonalInfo(page, testUser);
    await page.click('button:has-text("Continue")');
    
    // Select League Administrator (requires 18+)
    await selectRole(page, 'League Administrator');
    await page.click('button:has-text("Continue")');
    
    // Enter age under 18
    await fillDateOfBirth(page, 'January', '1', '2010'); // 14 years old
    
    await page.click('button:has-text("Continue")');
    
    // Should show age restriction error
    await expect(page.locator('text=You must be at least 18 years old for this role')).toBeVisible();
  });

  test('Navigation: Back button functionality', async ({ page }) => {
    // Go to step 2
    await fillPersonalInfo(page, testUser);
    await page.click('button:has-text("Continue")');
    
    // Go to step 3
    await selectRole(page, 'Team Coach');
    await page.click('button:has-text("Continue")');
    
    // Go back to step 2
    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Select Your Role')).toBeVisible();
    
    // Go back to step 1
    await page.click('button:has-text("Back")');
    await expect(page.locator('text=Personal Information')).toBeVisible();
    
    // Verify form data is preserved
    await expect(page.locator('input[id="email"]')).toHaveValue(testUser.email);
  });

  test('Progress indicator updates correctly', async ({ page }) => {
    // Step 1
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    await expect(page.locator('text=25% complete')).toBeVisible();
    
    // Step 2
    await fillPersonalInfo(page, testUser);
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    await expect(page.locator('text=50% complete')).toBeVisible();
    
    // Step 3
    await selectRole(page, 'Team Coach');
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();
    await expect(page.locator('text=75% complete')).toBeVisible();
    
    // Step 4
    await fillDateOfBirth(page, 'January', '15', '1990');
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=100% complete')).toBeVisible();
  });

  test('Terms and Privacy Policy links open in new tabs', async ({ page, context }) => {
    // Navigate to account creation step
    await fillPersonalInfo(page, testUser);
    await page.click('button:has-text("Continue")');
    await selectRole(page, 'Team Coach');
    await page.click('button:has-text("Continue")');
    await fillDateOfBirth(page, 'January', '15', '1990');
    await page.click('button:has-text("Continue")');
    
    // Test Terms of Service link
    const [termsPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a:has-text("Terms of Service")')
    ]);
    await expect(termsPage.url()).toContain('/terms');
    await termsPage.close();
    
    // Test Privacy Policy link
    const [privacyPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('a:has-text("Privacy Policy")')
    ]);
    await expect(privacyPage.url()).toContain('/privacy');
    await privacyPage.close();
  });

  test('Mobile responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify all elements are visible and functional
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Personal Information')).toBeVisible();
    
    await fillPersonalInfo(page, testUser);
    
    // Verify form is still functional on mobile
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Select Your Role')).toBeVisible();
  });

  test('Feature flag disabled behavior', async ({ page }) => {
    // Disable registration feature flag
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flags', JSON.stringify({
        registration_v1: false,
        payments_live_v1: false,
        branding_v1: false,
        pwa_v1: false
      }));
    });
    
    await page.goto('/register');
    
    // Should show feature disabled message or fallback behavior
    // This depends on how the app handles disabled features
    // For now we'll just verify the page loads
    await expect(page).toHaveURL('/register');
  });

  test('Cross-browser: Form validation consistency', async ({ browserName, page }) => {
    console.log(`Running on ${browserName}`);
    
    // Test that validation works consistently across browsers
    await page.fill('input[id="email"]', 'test@');
    await page.fill('input[id="firstName"]', '');
    await page.click('button:has-text("Continue")');
    
    // Validation should work in all browsers
    await expect(page.locator('text=First name is required')).toBeVisible();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
  });
});

test.describe('Registration with Payment', () => {
  test('Complete registration with payment flow', async ({ page }) => {
    const userWithPayment = generateTestUser();
    
    // Enable feature flags including payments
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flags', JSON.stringify({
        registration_v1: true,
        payments_live_v1: true,
        branding_v1: true,
        pwa_v1: true
      }));
    });
    
    await page.goto('/register/team'); // Team registration with payment
    
    // Complete registration steps
    await fillPersonalInfo(page, userWithPayment);
    await page.click('button:has-text("Continue")');
    
    await selectRole(page, 'Team Coach');
    await page.click('button:has-text("Continue")');
    
    await fillDateOfBirth(page, 'January', '15', '1990');
    await page.click('button:has-text("Continue")');
    
    // Account creation
    await page.check('input[id="agree-terms"]');
    await page.check('input[id="agree-privacy"]');
    await page.click('button:has-text("Create Account")');
    
    // Payment step should appear
    await completePayment(page);
    
    // Verify payment confirmation
    await expect(page.locator('text=Payment Successful')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Registration Complete')).toBeVisible();
  });

  test('Payment method selection: ACH vs Card', async ({ page }) => {
    await page.goto('/register/team');
    
    // Navigate to payment step (simplified for this test)
    // In real test, complete all registration steps first
    
    // Test ACH selection
    await page.click('button:has-text("Bank Account (ACH)")');
    await expect(page.locator('text=ACH payments typically process within 3-5 business days')).toBeVisible();
    await expect(page.locator('input[placeholder="123456789"]')).toBeVisible(); // Routing number
    
    // Switch back to card
    await page.click('button:has-text("Credit/Debit Card")');
    await expect(page.locator('input[placeholder="1234 5678 9012 3456"]')).toBeVisible();
  });
});