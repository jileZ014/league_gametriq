// Mock Stripe implementation for testing
const stripeMock = {
  // Mock Stripe instance
  paymentIntents: {
    create: jest.fn(() => Promise.resolve({
      id: 'pi_test_basketball_league',
      client_secret: 'pi_test_basketball_league_secret',
      amount: 15000, // $150.00 in cents
      currency: 'usd',
      status: 'requires_payment_method',
      metadata: {
        league_id: 'test-phoenix-youth-league',
        team_id: 'team-eagles',
        player_id: 'player-001',
      },
    })),
    retrieve: jest.fn(() => Promise.resolve({
      id: 'pi_test_basketball_league',
      status: 'succeeded',
      amount: 15000,
      currency: 'usd',
    })),
    update: jest.fn(() => Promise.resolve({
      id: 'pi_test_basketball_league',
      status: 'requires_payment_method',
    })),
    confirm: jest.fn(() => Promise.resolve({
      id: 'pi_test_basketball_league',
      status: 'succeeded',
    })),
  },
  customers: {
    create: jest.fn(() => Promise.resolve({
      id: 'cus_test_basketball_customer',
      email: 'parent@example.com',
      name: 'Parent Guardian',
      metadata: {
        player_age: '12',
        league_id: 'test-phoenix-youth-league',
      },
    })),
    retrieve: jest.fn(() => Promise.resolve({
      id: 'cus_test_basketball_customer',
      email: 'parent@example.com',
    })),
    update: jest.fn(() => Promise.resolve({
      id: 'cus_test_basketball_customer',
      email: 'parent@example.com',
    })),
  },
  subscriptions: {
    create: jest.fn(() => Promise.resolve({
      id: 'sub_test_basketball_subscription',
      customer: 'cus_test_basketball_customer',
      status: 'active',
      items: {
        data: [{
          price: {
            id: 'price_test_league_membership',
            unit_amount: 5000, // $50.00 monthly
          },
        }],
      },
    })),
    retrieve: jest.fn(() => Promise.resolve({
      id: 'sub_test_basketball_subscription',
      status: 'active',
    })),
    update: jest.fn(() => Promise.resolve({
      id: 'sub_test_basketball_subscription',
      status: 'active',
    })),
    cancel: jest.fn(() => Promise.resolve({
      id: 'sub_test_basketball_subscription',
      status: 'canceled',
    })),
  },
  refunds: {
    create: jest.fn(() => Promise.resolve({
      id: 're_test_basketball_refund',
      payment_intent: 'pi_test_basketball_league',
      amount: 15000,
      status: 'succeeded',
      reason: 'requested_by_customer',
    })),
    retrieve: jest.fn(() => Promise.resolve({
      id: 're_test_basketball_refund',
      status: 'succeeded',
    })),
  },
  webhooks: {
    constructEvent: jest.fn((payload, signature, secret) => {
      // Mock webhook event for testing
      return {
        id: 'evt_test_basketball_webhook',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_basketball_league',
            status: 'succeeded',
            amount: 15000,
            currency: 'usd',
            metadata: {
              league_id: 'test-phoenix-youth-league',
              team_id: 'team-eagles',
            },
          },
        },
        created: Math.floor(Date.now() / 1000),
      };
    }),
  },
  prices: {
    create: jest.fn(() => Promise.resolve({
      id: 'price_test_basketball_price',
      unit_amount: 15000,
      currency: 'usd',
      recurring: null,
    })),
    list: jest.fn(() => Promise.resolve({
      data: [
        {
          id: 'price_test_registration',
          unit_amount: 15000,
          currency: 'usd',
          metadata: { type: 'registration' },
        },
        {
          id: 'price_test_tournament',
          unit_amount: 7500,
          currency: 'usd',
          metadata: { type: 'tournament' },
        },
      ],
    })),
  },
  products: {
    create: jest.fn(() => Promise.resolve({
      id: 'prod_test_basketball_product',
      name: 'Basketball League Registration',
      description: 'Youth basketball league registration fee',
    })),
  },
};

// Mock loadStripe function
const loadStripeMock = jest.fn(() => Promise.resolve({
  elements: jest.fn(() => ({
    create: jest.fn(() => ({
      mount: jest.fn(),
      unmount: jest.fn(),
      destroy: jest.fn(),
      on: jest.fn((event, callback) => {
        // Simulate successful payment element events
        if (event === 'ready') {
          setTimeout(() => callback(), 0);
        }
      }),
      off: jest.fn(),
      update: jest.fn(),
      blur: jest.fn(),
      clear: jest.fn(),
      focus: jest.fn(),
    })),
    getElement: jest.fn(),
    update: jest.fn(),
  })),
  confirmPayment: jest.fn(() => Promise.resolve({
    paymentIntent: {
      id: 'pi_test_basketball_league',
      status: 'succeeded',
    },
    error: null,
  })),
  confirmCardPayment: jest.fn(() => Promise.resolve({
    paymentIntent: {
      id: 'pi_test_basketball_league',
      status: 'succeeded',
    },
    error: null,
  })),
  createPaymentMethod: jest.fn(() => Promise.resolve({
    paymentMethod: {
      id: 'pm_test_basketball_payment_method',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025,
      },
    },
    error: null,
  })),
  retrievePaymentIntent: jest.fn(() => Promise.resolve({
    paymentIntent: {
      id: 'pi_test_basketball_league',
      status: 'succeeded',
    },
    error: null,
  })),
}));

// Mock React Stripe.js components
const mockElements = jest.fn(({ children }) => children);
const mockCardElement = jest.fn(() => null);
const mockPaymentElement = jest.fn(() => null);
const mockUseStripe = jest.fn(() => ({
  confirmPayment: jest.fn(() => Promise.resolve({
    paymentIntent: { status: 'succeeded' },
    error: null,
  })),
}));
const mockUseElements = jest.fn(() => ({
  getElement: jest.fn(() => ({})),
}));

module.exports = {
  // Core Stripe mock
  default: stripeMock,
  Stripe: stripeMock,
  
  // Stripe.js mocks
  loadStripe: loadStripeMock,
  
  // React Stripe.js mocks
  Elements: mockElements,
  CardElement: mockCardElement,
  PaymentElement: mockPaymentElement,
  useStripe: mockUseStripe,
  useElements: mockUseElements,
  
  // Basketball-specific test utilities
  createMockPaymentIntent: (overrides = {}) => ({
    id: 'pi_test_basketball_league',
    client_secret: 'pi_test_basketball_league_secret',
    amount: 15000,
    currency: 'usd',
    status: 'requires_payment_method',
    metadata: {
      league_id: 'test-phoenix-youth-league',
      type: 'registration',
    },
    ...overrides,
  }),
  
  createMockCustomer: (overrides = {}) => ({
    id: 'cus_test_basketball_customer',
    email: 'parent@example.com',
    name: 'Parent Guardian',
    metadata: {
      player_age: '12',
      league_id: 'test-phoenix-youth-league',
    },
    ...overrides,
  }),
  
  createMockWebhookEvent: (type = 'payment_intent.succeeded', overrides = {}) => ({
    id: 'evt_test_basketball_webhook',
    type,
    data: {
      object: {
        id: 'pi_test_basketball_league',
        status: 'succeeded',
        amount: 15000,
        currency: 'usd',
        metadata: {
          league_id: 'test-phoenix-youth-league',
        },
      },
    },
    created: Math.floor(Date.now() / 1000),
    ...overrides,
  }),
  
  // Test card numbers
  TEST_CARDS: {
    VISA_SUCCESS: '4242424242424242',
    VISA_DECLINED: '4000000000000002',
    VISA_INSUFFICIENT_FUNDS: '4000000000009995',
    MASTERCARD_SUCCESS: '5555555555554444',
  },
  
  // Mock error responses
  createMockError: (type = 'card_error', code = 'card_declined') => ({
    type,
    code,
    message: 'Your card was declined.',
    decline_code: 'generic_decline',
  }),
};