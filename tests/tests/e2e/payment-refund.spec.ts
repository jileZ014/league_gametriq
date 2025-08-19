import { test, expect, Page } from '@playwright/test';

// Mock Stripe webhook events
const mockStripeWebhookEvent = (type: string, data: any) => {
  return {
    id: `evt_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null
    },
    type: type
  };
};

// Helper to generate test payment data
const generatePaymentData = () => {
  const timestamp = Date.now();
  return {
    paymentIntentId: `pi_test_${timestamp}`,
    chargeId: `ch_test_${timestamp}`,
    customerId: `cus_test_${timestamp}`,
    amount: 12500, // $125.00
    teamName: `Test Team ${timestamp}`,
    playerName: `Test Player ${timestamp}`,
    email: `test+${timestamp}@gametriq.test`
  };
};

test.describe('Payment and Refund Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Enable payment feature flags
    await page.addInitScript(() => {
      window.localStorage.setItem('feature_flags', JSON.stringify({
        registration_v1: true,
        payments_live_v1: true,
        branding_v1: true,
        pwa_v1: true
      }));
      
      // Mock authenticated state for admin access
      window.localStorage.setItem('auth_token', 'mock_admin_token');
      window.localStorage.setItem('user_role', 'league-admin');
    });
  });

  test('Happy Path: Process payment and confirmation', async ({ page }) => {
    const paymentData = generatePaymentData();
    
    // Start team registration with payment
    await page.goto('/register/team');
    
    // Fill team information
    await page.fill('input[name="teamName"]', paymentData.teamName);
    await page.fill('input[name="contactEmail"]', paymentData.email);
    
    // Select tournament/league
    await page.click('button:has-text("Select Tournament")');
    await page.click('[role="option"]:has-text("Spring League 2025")');
    
    // Should show registration fee
    await expect(page.locator(`text=$${paymentData.amount / 100}`)).toBeVisible();
    
    // Continue to payment
    await page.click('button:has-text("Continue to Payment")');
    
    // Payment step
    await expect(page.locator('text=Payment Information')).toBeVisible();
    await expect(page.locator('text=Secure payment powered by Stripe')).toBeVisible();
    
    // Fill payment details
    await page.fill('input[placeholder="1234 5678 9012 3456"]', '4242424242424242');
    await page.fill('input[placeholder="MM/YY"]', '12/25');
    await page.fill('input[placeholder="123"]', '123');
    await page.fill('input[placeholder="12345"]', '10001');
    
    // Submit payment
    await page.click(`button:has-text("Pay $${paymentData.amount / 100}")`);
    
    // Wait for processing
    await expect(page.locator('text=Processing Payment')).toBeVisible();
    
    // Payment success
    await expect(page.locator('text=Payment Successful')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Registration Complete')).toBeVisible();
    
    // Verify confirmation details
    await expect(page.locator(`text=${paymentData.teamName}`)).toBeVisible();
    await expect(page.locator('text=Confirmation email sent')).toBeVisible();
    
    // Should receive payment intent ID
    const paymentIntentElement = page.locator('[data-testid="payment-intent-id"]');
    await expect(paymentIntentElement).toBeVisible();
    const paymentIntentId = await paymentIntentElement.textContent();
    expect(paymentIntentId).toMatch(/^pi_/);
  });

  test('Refund Path: Process full refund and verify ledger', async ({ page }) => {
    const paymentData = generatePaymentData();
    
    // Navigate to admin dashboard
    await page.goto('/admin/payments');
    
    // Search for payment
    await page.fill('input[placeholder="Search by email, team, or payment ID"]', paymentData.email);
    await page.click('button:has-text("Search")');
    
    // Click on payment to view details
    await page.click(`tr:has-text("${paymentData.email}")`);
    
    // Payment details page
    await expect(page.locator('text=Payment Details')).toBeVisible();
    await expect(page.locator(`text=$${paymentData.amount / 100}`)).toBeVisible();
    await expect(page.locator('text=Status: Succeeded')).toBeVisible();
    
    // Initiate refund
    await page.click('button:has-text("Issue Refund")');
    
    // Refund modal
    await expect(page.locator('text=Issue Refund')).toBeVisible();
    
    // Select full refund
    await page.click('input[value="full"]');
    await expect(page.locator(`text=Refund Amount: $${paymentData.amount / 100}`)).toBeVisible();
    
    // Add refund reason
    await page.fill('textarea[name="refundReason"]', 'Tournament cancelled due to weather');
    
    // Confirm refund
    await page.click('button:has-text("Process Refund")');
    
    // Confirmation dialog
    await expect(page.locator('text=Are you sure you want to process this refund?')).toBeVisible();
    await page.click('button:has-text("Yes, Process Refund")');
    
    // Processing
    await expect(page.locator('text=Processing refund')).toBeVisible();
    
    // Refund success
    await expect(page.locator('text=Refund processed successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify ledger entry
    await page.click('a:has-text("View Ledger")');
    
    // Ledger should show both payment and refund
    await expect(page.locator('text=Payment Ledger')).toBeVisible();
    
    // Original payment entry
    const paymentEntry = page.locator(`tr:has-text("Payment"):has-text("$${paymentData.amount / 100}")`);
    await expect(paymentEntry).toBeVisible();
    await expect(paymentEntry.locator('text=Credit')).toBeVisible();
    
    // Refund entry
    const refundEntry = page.locator(`tr:has-text("Refund"):has-text("$${paymentData.amount / 100}")`);
    await expect(refundEntry).toBeVisible();
    await expect(refundEntry.locator('text=Debit')).toBeVisible();
    
    // Balance should be zero
    await expect(page.locator('text=Current Balance: $0.00')).toBeVisible();
  });

  test('Partial refund with ledger verification', async ({ page }) => {
    const paymentData = generatePaymentData();
    const partialAmount = 5000; // $50.00 partial refund
    
    await page.goto('/admin/payments');
    
    // Find and click payment
    await page.fill('input[placeholder="Search by email, team, or payment ID"]', paymentData.paymentIntentId);
    await page.click('button:has-text("Search")');
    await page.click(`tr:has-text("${paymentData.paymentIntentId}")`);
    
    // Issue partial refund
    await page.click('button:has-text("Issue Refund")');
    await page.click('input[value="partial"]');
    
    // Enter partial amount
    await page.fill('input[name="refundAmount"]', (partialAmount / 100).toString());
    await page.fill('textarea[name="refundReason"]', 'Player withdrew from tournament');
    
    await page.click('button:has-text("Process Refund")');
    await page.click('button:has-text("Yes, Process Refund")');
    
    // Verify success
    await expect(page.locator('text=Refund processed successfully')).toBeVisible({ timeout: 10000 });
    
    // Check ledger
    await page.click('a:has-text("View Ledger")');
    
    // Should show partial refund
    const partialRefundEntry = page.locator(`tr:has-text("Partial Refund"):has-text("$${partialAmount / 100}")`);
    await expect(partialRefundEntry).toBeVisible();
    
    // Balance should reflect remaining amount
    const remainingBalance = (paymentData.amount - partialAmount) / 100;
    await expect(page.locator(`text=Current Balance: $${remainingBalance.toFixed(2)}`)).toBeVisible();
  });

  test('Webhook handling: Payment succeeded', async ({ page, request }) => {
    const paymentData = generatePaymentData();
    
    // Simulate Stripe webhook for payment succeeded
    const webhookPayload = mockStripeWebhookEvent('payment_intent.succeeded', {
      id: paymentData.paymentIntentId,
      object: 'payment_intent',
      amount: paymentData.amount,
      currency: 'usd',
      status: 'succeeded',
      charges: {
        data: [{
          id: paymentData.chargeId,
          amount: paymentData.amount,
          status: 'succeeded'
        }]
      },
      metadata: {
        teamName: paymentData.teamName,
        email: paymentData.email,
        registrationType: 'team'
      }
    });
    
    // Send webhook to endpoint
    const response = await request.post('/api/webhooks/stripe', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'mock_signature'
      }
    });
    
    expect(response.status()).toBe(200);
    
    // Verify payment appears in admin dashboard
    await page.goto('/admin/payments');
    await page.fill('input[placeholder="Search by email, team, or payment ID"]', paymentData.paymentIntentId);
    await page.click('button:has-text("Search")');
    
    // Payment should be listed
    await expect(page.locator(`tr:has-text("${paymentData.paymentIntentId}")`)).toBeVisible();
    await expect(page.locator(`tr:has-text("${paymentData.email}")`)).toBeVisible();
    await expect(page.locator('text=Succeeded')).toBeVisible();
  });

  test('Webhook handling: Refund processed', async ({ page, request }) => {
    const paymentData = generatePaymentData();
    const refundId = `re_test_${Date.now()}`;
    
    // Simulate refund webhook
    const webhookPayload = mockStripeWebhookEvent('charge.refunded', {
      id: paymentData.chargeId,
      object: 'charge',
      amount: paymentData.amount,
      amount_refunded: paymentData.amount,
      currency: 'usd',
      refunded: true,
      refunds: {
        data: [{
          id: refundId,
          amount: paymentData.amount,
          currency: 'usd',
          reason: 'requested_by_customer',
          status: 'succeeded'
        }]
      },
      payment_intent: paymentData.paymentIntentId
    });
    
    const response = await request.post('/api/webhooks/stripe', {
      data: webhookPayload,
      headers: {
        'stripe-signature': 'mock_signature'
      }
    });
    
    expect(response.status()).toBe(200);
    
    // Verify refund in ledger
    await page.goto(`/admin/payments/${paymentData.paymentIntentId}/ledger`);
    
    await expect(page.locator(`text=Refund ID: ${refundId}`)).toBeVisible();
    await expect(page.locator('text=Status: Refunded')).toBeVisible();
  });

  test('Failed payment handling', async ({ page }) => {
    await page.goto('/register/team');
    
    // Fill team info and continue to payment
    await page.fill('input[name="teamName"]', 'Test Team');
    await page.fill('input[name="contactEmail"]', 'test@example.com');
    await page.click('button:has-text("Continue to Payment")');
    
    // Use card that will be declined
    await page.fill('input[placeholder="1234 5678 9012 3456"]', '4000000000000002'); // Stripe test card for decline
    await page.fill('input[placeholder="MM/YY"]', '12/25');
    await page.fill('input[placeholder="123"]', '123');
    await page.fill('input[placeholder="12345"]', '10001');
    
    await page.click('button:has-text("Pay $")');
    
    // Should show error
    await expect(page.locator('text=Payment failed')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Your card was declined')).toBeVisible();
    
    // User should be able to retry
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('Discount code application', async ({ page }) => {
    await page.goto('/register/team');
    
    // Fill team info
    await page.fill('input[name="teamName"]', 'Test Team');
    await page.fill('input[name="contactEmail"]', 'test@example.com');
    
    // Apply discount code
    await page.click('button:has-text("Have a discount code?")');
    await page.fill('input[placeholder="Enter discount code"]', 'EARLYBIRD25');
    await page.click('button:has-text("Apply")');
    
    // Verify discount applied
    await expect(page.locator('text=Discount applied: 25% off')).toBeVisible();
    await expect(page.locator('text=Original: $125.00')).toBeVisible();
    await expect(page.locator('text=Discount: -$31.25')).toBeVisible();
    await expect(page.locator('text=Total: $93.75')).toBeVisible();
    
    // Continue to payment with discounted amount
    await page.click('button:has-text("Continue to Payment")');
    await expect(page.locator('text=Pay $93.75')).toBeVisible();
  });

  test('Payment receipt generation', async ({ page }) => {
    const paymentData = generatePaymentData();
    
    // Complete a payment (simplified)
    await page.goto(`/payments/${paymentData.paymentIntentId}/receipt`);
    
    // Verify receipt contents
    await expect(page.locator('text=Payment Receipt')).toBeVisible();
    await expect(page.locator(`text=Receipt #: ${paymentData.paymentIntentId}`)).toBeVisible();
    await expect(page.locator(`text=Amount Paid: $${paymentData.amount / 100}`)).toBeVisible();
    await expect(page.locator('text=Payment Method: •••• 4242')).toBeVisible();
    
    // Download receipt
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Download Receipt")')
    ]);
    
    expect(download.suggestedFilename()).toContain('receipt');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('Batch refund processing', async ({ page }) => {
    await page.goto('/admin/payments');
    
    // Select multiple payments
    await page.check('input[data-testid="payment-select-all"]');
    await expect(page.locator('text=5 payments selected')).toBeVisible();
    
    // Batch actions
    await page.click('button:has-text("Batch Actions")');
    await page.click('[role="menuitem"]:has-text("Issue Refunds")');
    
    // Batch refund modal
    await expect(page.locator('text=Batch Refund - 5 Payments')).toBeVisible();
    await expect(page.locator('text=Total Refund Amount: $625.00')).toBeVisible();
    
    await page.fill('textarea[name="batchRefundReason"]', 'Tournament cancelled - COVID-19');
    await page.click('button:has-text("Process All Refunds")');
    
    // Confirmation
    await expect(page.locator('text=This will process 5 refunds')).toBeVisible();
    await page.click('button:has-text("Confirm Batch Refund")');
    
    // Progress indicator
    await expect(page.locator('text=Processing refunds... 0/5')).toBeVisible();
    await expect(page.locator('text=Processing refunds... 5/5')).toBeVisible({ timeout: 15000 });
    
    // Success
    await expect(page.locator('text=All refunds processed successfully')).toBeVisible();
  });

  test('Payment analytics dashboard', async ({ page }) => {
    await page.goto('/admin/analytics/payments');
    
    // Verify dashboard elements
    await expect(page.locator('text=Payment Analytics')).toBeVisible();
    
    // Key metrics
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-refunds"]')).toBeVisible();
    await expect(page.locator('[data-testid="net-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-transaction"]')).toBeVisible();
    
    // Time period selector
    await page.click('button:has-text("Last 30 days")');
    await page.click('[role="option"]:has-text("Last 90 days")');
    
    // Charts should update
    await expect(page.locator('text=Revenue Trend - Last 90 days')).toBeVisible();
    
    // Export data
    await page.click('button:has-text("Export Data")');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[role="menuitem"]:has-text("Export as CSV")')
    ]);
    
    expect(download.suggestedFilename()).toContain('payment-analytics');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});