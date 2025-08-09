# Integration Testing Strategy and Tools
## Basketball League Management Platform - Phase 2

**Document ID:** TESTING-BLMP-001  
**Version:** 1.0  
**Date:** August 8, 2025  
**Author:** Integration Architect  
**Status:** Phase 2 Integration Design  
**Classification:** Technical Architecture  

---

## Executive Summary

This document defines the comprehensive integration testing strategy for the Basketball League Management Platform, ensuring reliable communication between internal services and external third-party providers. The strategy encompasses automated testing frameworks, continuous integration pipelines, and monitoring tools to guarantee system reliability, data integrity, and performance at scale.

### Key Testing Objectives

- **End-to-End Integration Verification**: Complete workflow testing across all services
- **Third-Party Service Reliability**: Robust testing of external API integrations
- **Performance Under Load**: Scalability testing with realistic basketball league workloads
- **Error Handling Validation**: Comprehensive failure scenario testing
- **Security Integration Testing**: Authentication, authorization, and data protection validation
- **COPPA Compliance Testing**: Youth data protection and parental consent workflows

---

## Table of Contents

1. [Testing Strategy Overview](#1-testing-strategy-overview)
2. [Integration Testing Framework](#2-integration-testing-framework)
3. [Third-Party Service Testing](#3-third-party-service-testing)
4. [End-to-End Test Scenarios](#4-end-to-end-test-scenarios)
5. [Performance and Load Testing](#5-performance-and-load-testing)
6. [Security and Compliance Testing](#6-security-and-compliance-testing)
7. [Automated Testing Pipeline](#7-automated-testing-pipeline)
8. [Monitoring and Observability Testing](#8-monitoring-and-observability-testing)

---

## 1. Testing Strategy Overview

### 1.1 Testing Pyramid Architecture

```mermaid
graph TB
    subgraph "Testing Pyramid"
        subgraph "E2E Tests (5%)"
            E2E_SCENARIOS[End-to-End Scenarios<br/>Complete User Journeys<br/>Cross-Service Workflows]
        end
        
        subgraph "Integration Tests (25%)"
            API_TESTS[API Integration Tests<br/>Service-to-Service<br/>Third-Party APIs]
            CONTRACT_TESTS[Contract Tests<br/>Provider Contracts<br/>Consumer Contracts]
            DATA_TESTS[Data Integration Tests<br/>Database Consistency<br/>Event Sourcing]
        end
        
        subgraph "Unit Tests (70%)"
            SERVICE_TESTS[Service Unit Tests<br/>Business Logic<br/>Validation Rules]
            ADAPTER_TESTS[Adapter Unit Tests<br/>External Integrations<br/>Error Handling]
            UTIL_TESTS[Utility Tests<br/>Helper Functions<br/>Data Transformation]
        end
    end
    
    subgraph "Testing Tools"
        JEST[Jest<br/>Unit Testing]
        PLAYWRIGHT[Playwright<br/>E2E Testing]
        POSTMAN[Newman/Postman<br/>API Testing]
        PACT[Pact<br/>Contract Testing]
        K6[K6<br/>Load Testing]
    end
    
    E2E_SCENARIOS --> PLAYWRIGHT
    API_TESTS --> POSTMAN
    CONTRACT_TESTS --> PACT
    SERVICE_TESTS --> JEST
    DATA_TESTS --> JEST
    
    style E2E_SCENARIOS fill:#ff6b35
    style API_TESTS fill:#4ecdc4
    style SERVICE_TESTS fill:#45b7d1
```

### 1.2 Testing Environment Strategy

```typescript
enum TestEnvironment {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

interface EnvironmentConfig {
  name: TestEnvironment;
  purpose: string;
  dataSet: DataSetType;
  externalServices: ServiceConfigType;
  testExecution: TestExecutionType;
  monitoring: boolean;
}

const testEnvironments: EnvironmentConfig[] = [
  {
    name: TestEnvironment.UNIT,
    purpose: 'Isolated component testing',
    dataSet: DataSetType.MOCKED,
    externalServices: ServiceConfigType.MOCKED,
    testExecution: TestExecutionType.FAST,
    monitoring: false
  },
  {
    name: TestEnvironment.INTEGRATION,
    purpose: 'Service integration testing',
    dataSet: DataSetType.SYNTHETIC,
    externalServices: ServiceConfigType.SANDBOXED,
    testExecution: TestExecutionType.THOROUGH,
    monitoring: true
  },
  {
    name: TestEnvironment.STAGING,
    purpose: 'Pre-production validation',
    dataSet: DataSetType.PRODUCTION_LIKE,
    externalServices: ServiceConfigType.PRODUCTION_LIKE,
    testExecution: TestExecutionType.COMPREHENSIVE,
    monitoring: true
  },
  {
    name: TestEnvironment.PRODUCTION,
    purpose: 'Live system monitoring',
    dataSet: DataSetType.REAL,
    externalServices: ServiceConfigType.PRODUCTION,
    testExecution: TestExecutionType.HEALTH_CHECKS,
    monitoring: true
  }
];
```

### 1.3 Test Data Management Strategy

```typescript
class TestDataManager {
  private readonly environments: Map<TestEnvironment, DataProvider>;
  private readonly generators: Map<string, DataGenerator>;

  constructor() {
    this.environments = new Map();
    this.generators = new Map();
    this.setupDataProviders();
    this.setupDataGenerators();
  }

  private setupDataProviders(): void {
    // Unit test environment - fully mocked data
    this.environments.set(TestEnvironment.UNIT, new MockDataProvider({
      users: this.generateMockUsers(1000),
      leagues: this.generateMockLeagues(50),
      games: this.generateMockGames(500),
      payments: this.generateMockPayments(2000)
    }));

    // Integration test environment - synthetic but realistic data
    this.environments.set(TestEnvironment.INTEGRATION, new SyntheticDataProvider({
      tenants: 5,
      usersPerTenant: 200,
      leaguesPerTenant: 10,
      teamsPerLeague: 8,
      playersPerTeam: 12
    }));

    // Staging environment - production-like anonymized data
    this.environments.set(TestEnvironment.STAGING, new AnonymizedDataProvider({
      source: 'production_backup',
      anonymizationRules: this.getAnonymizationRules(),
      sampleSize: 0.1 // 10% of production data
    }));
  }

  async createTestScenario(scenarioType: BasketballTestScenario): Promise<TestDataSet> {
    switch (scenarioType) {
      case BasketballTestScenario.YOUTH_LEAGUE_REGISTRATION:
        return await this.createYouthRegistrationData();
      
      case BasketballTestScenario.TOURNAMENT_BRACKET_MANAGEMENT:
        return await this.createTournamentData();
      
      case BasketballTestScenario.LIVE_GAME_SCORING:
        return await this.createLiveGameData();
      
      case BasketballTestScenario.PAYMENT_PROCESSING:
        return await this.createPaymentTestData();
      
      case BasketballTestScenario.WEATHER_EMERGENCY:
        return await this.createWeatherEmergencyData();
    }
  }

  private async createYouthRegistrationData(): Promise<TestDataSet> {
    const league = this.generators.get('league')!.generate({
      ageGroup: 'u12',
      registrationOpen: true,
      maxPlayers: 96, // 8 teams × 12 players
      coppaRequired: true
    });

    const parents = this.generators.get('parent')!.generateBatch(80, {
      hasChildren: true,
      consentProvided: 'mixed' // Some with consent, some without
    });

    const players = this.generators.get('player')!.generateBatch(96, {
      age: { min: 10, max: 12 },
      parentIds: parents.map(p => p.id),
      registrationStatus: 'mixed'
    });

    return {
      league,
      parents,
      players,
      registrations: this.generateRegistrations(players, league),
      paymentMethods: this.generatePaymentMethods(parents)
    };
  }
}

enum BasketballTestScenario {
  YOUTH_LEAGUE_REGISTRATION = 'youth_league_registration',
  TOURNAMENT_BRACKET_MANAGEMENT = 'tournament_bracket_management',
  LIVE_GAME_SCORING = 'live_game_scoring',
  PAYMENT_PROCESSING = 'payment_processing',
  WEATHER_EMERGENCY = 'weather_emergency',
  REFEREE_SCHEDULING = 'referee_scheduling',
  CALENDAR_SYNCHRONIZATION = 'calendar_synchronization',
  NOTIFICATION_DELIVERY = 'notification_delivery'
}
```

---

## 2. Integration Testing Framework

### 2.1 Service Integration Test Suite

```typescript
// Integration test base class for all service integrations
abstract class ServiceIntegrationTest {
  protected testClient: TestAPIClient;
  protected mockServer: MockServer;
  protected testData: TestDataManager;
  
  constructor(serviceConfig: ServiceTestConfig) {
    this.testClient = new TestAPIClient(serviceConfig.baseUrl);
    this.mockServer = new MockServer();
    this.testData = new TestDataManager();
  }

  abstract setupTestEnvironment(): Promise<void>;
  abstract teardownTestEnvironment(): Promise<void>;
  abstract runHealthChecks(): Promise<HealthCheckResult>;

  async beforeAll(): Promise<void> {
    await this.setupTestEnvironment();
    await this.mockServer.start();
    await this.runHealthChecks();
  }

  async afterAll(): Promise<void> {
    await this.mockServer.stop();
    await this.teardownTestEnvironment();
  }

  async beforeEach(): Promise<void> {
    await this.mockServer.reset();
    await this.testData.resetToCleanState();
  }

  protected async assertIntegrationHealth(
    serviceName: string,
    expectedStatus: ServiceStatus
  ): Promise<void> {
    const health = await this.testClient.get(`/health/${serviceName}`);
    expect(health.status).toBe(expectedStatus);
    expect(health.responseTime).toBeLessThan(5000); // 5 second max
  }

  protected async assertDataConsistency(
    operation: IntegrationOperation,
    expectedState: any
  ): Promise<void> {
    // Wait for eventual consistency
    await this.waitForConsistency(operation.timeout || 10000);
    
    const actualState = await this.testClient.get(operation.verificationEndpoint);
    expect(actualState).toMatchObject(expectedState);
  }

  private async waitForConsistency(timeout: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.min(timeout, 1000)));
  }
}
```

### 2.2 Payment Service Integration Tests

```typescript
class PaymentServiceIntegrationTest extends ServiceIntegrationTest {
  private stripeTestClient: StripeTestClient;
  private paymentTestData: PaymentTestDataSet;

  async setupTestEnvironment(): Promise<void> {
    this.stripeTestClient = new StripeTestClient({
      apiKey: process.env.STRIPE_TEST_KEY,
      webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET
    });
    
    this.paymentTestData = await this.testData.createTestScenario(
      BasketballTestScenario.PAYMENT_PROCESSING
    );
  }

  @Test('Should process registration payment successfully')
  async testRegistrationPaymentFlow(): Promise<void> {
    // Arrange
    const registration = this.paymentTestData.registrations[0];
    const paymentMethod = this.paymentTestData.paymentMethods[0];

    // Act
    const paymentIntent = await this.testClient.post('/payments/create-intent', {
      registrationId: registration.id,
      amount: registration.fee,
      paymentMethodId: paymentMethod.id
    });

    // Simulate successful Stripe payment
    await this.stripeTestClient.confirmPaymentIntent(paymentIntent.id, {
      payment_method: paymentMethod.stripeId
    });

    // Wait for webhook processing
    await this.waitForWebhookProcessing(paymentIntent.id);

    // Assert
    const updatedRegistration = await this.testClient.get(`/registrations/${registration.id}`);
    expect(updatedRegistration.status).toBe('paid');
    expect(updatedRegistration.paymentIntentId).toBe(paymentIntent.id);

    // Verify payment notification was sent
    await this.assertNotificationSent({
      type: 'payment_confirmation',
      recipientId: registration.parentId,
      registrationId: registration.id
    });
  }

  @Test('Should handle payment failure gracefully')
  async testPaymentFailureHandling(): Promise<void> {
    // Arrange
    const registration = this.paymentTestData.registrations[1];
    const declinedCard = this.paymentTestData.declinedPaymentMethods[0];

    // Act
    const paymentIntent = await this.testClient.post('/payments/create-intent', {
      registrationId: registration.id,
      amount: registration.fee,
      paymentMethodId: declinedCard.id
    });

    // Simulate declined payment
    await this.stripeTestClient.failPaymentIntent(paymentIntent.id, {
      error_code: 'card_declined',
      decline_code: 'insufficient_funds'
    });

    await this.waitForWebhookProcessing(paymentIntent.id);

    // Assert
    const updatedRegistration = await this.testClient.get(`/registrations/${registration.id}`);
    expect(updatedRegistration.status).toBe('payment_failed');

    // Verify retry notification was sent
    await this.assertNotificationSent({
      type: 'payment_failed',
      recipientId: registration.parentId,
      registrationId: registration.id,
      retryOptions: expect.arrayContaining(['update_payment_method', 'contact_support'])
    });

    // Verify payment recovery workflow initiated
    const recoveryWorkflow = await this.testClient.get(`/payments/${paymentIntent.id}/recovery`);
    expect(recoveryWorkflow.status).toBe('initiated');
  }

  @Test('Should process subscription payments correctly')
  async testSubscriptionPaymentFlow(): Promise<void> {
    // Arrange
    const league = this.paymentTestData.subscriptionLeagues[0];
    const customer = this.paymentTestData.customers[0];

    // Act - Create subscription
    const subscription = await this.testClient.post('/payments/subscriptions', {
      customerId: customer.id,
      leagueId: league.id,
      priceId: league.subscriptionPriceId,
      trialPeriodDays: league.trialDays
    });

    // Simulate successful first payment
    await this.stripeTestClient.triggerSubscriptionInvoice(subscription.id);

    // Assert
    const activeSubscription = await this.testClient.get(`/subscriptions/${subscription.id}`);
    expect(activeSubscription.status).toBe('active');
    expect(activeSubscription.currentPeriodEnd).toBeAfter(new Date());

    // Verify subscription confirmation sent
    await this.assertNotificationSent({
      type: 'subscription_confirmed',
      recipientId: customer.id,
      subscriptionId: subscription.id
    });
  }

  @Test('Should handle webhook signature validation')
  async testWebhookSignatureValidation(): Promise<void> {
    // Arrange
    const webhookPayload = this.createTestWebhookPayload('payment_intent.succeeded');
    const validSignature = this.stripeTestClient.generateWebhookSignature(webhookPayload);
    const invalidSignature = 'invalid_signature';

    // Act & Assert - Valid signature should be accepted
    const validResponse = await this.testClient.post('/webhooks/stripe', webhookPayload, {
      headers: { 'stripe-signature': validSignature }
    });
    expect(validResponse.status).toBe(200);

    // Invalid signature should be rejected
    await expect(
      this.testClient.post('/webhooks/stripe', webhookPayload, {
        headers: { 'stripe-signature': invalidSignature }
      })
    ).rejects.toMatchObject({ status: 401, error: 'Invalid signature' });
  }

  private async waitForWebhookProcessing(paymentIntentId: string): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 500; // 500ms
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      const webhookProcessed = await this.testClient.get(
        `/payments/${paymentIntentId}/webhook-status`
      );
      
      if (webhookProcessed.processed) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      elapsed += checkInterval;
    }

    throw new Error(`Webhook processing timeout for payment intent: ${paymentIntentId}`);
  }
}
```

### 2.3 Notification Service Integration Tests

```typescript
class NotificationServiceIntegrationTest extends ServiceIntegrationTest {
  private emailTestClient: EmailTestClient;
  private smsTestClient: SMSTestClient;
  private pushTestClient: PushNotificationTestClient;

  async setupTestEnvironment(): Promise<void> {
    this.emailTestClient = new EmailTestClient({
      provider: 'sendgrid',
      apiKey: process.env.SENDGRID_TEST_KEY
    });
    
    this.smsTestClient = new SMSTestClient({
      provider: 'twilio',
      accountSid: process.env.TWILIO_TEST_SID,
      authToken: process.env.TWILIO_TEST_TOKEN
    });
    
    this.pushTestClient = new PushNotificationTestClient({
      provider: 'firebase',
      serviceAccount: process.env.FIREBASE_TEST_CREDENTIALS
    });
  }

  @Test('Should send game reminder notifications across all channels')
  async testGameReminderNotifications(): Promise<void> {
    // Arrange
    const game = await this.createTestGame();
    const participants = await this.getGameParticipants(game.id);
    
    // Configure notification preferences for multi-channel testing
    await this.setNotificationPreferences(participants[0].id, {
      email: true,
      sms: true,
      push: true
    });

    // Act - Trigger game reminder 2 hours before game
    await this.testClient.post('/notifications/trigger', {
      eventType: 'game_reminder',
      gameId: game.id,
      scheduleFor: new Date(game.startTime.getTime() - 2 * 60 * 60 * 1000)
    });

    // Fast-forward time simulation
    await this.advanceTimeToNotificationTrigger();

    // Assert - Email notification
    await this.emailTestClient.waitForEmail({
      to: participants[0].email,
      subject: expect.stringContaining(game.homeTeam.name),
      timeout: 30000
    });

    // Assert - SMS notification
    await this.smsTestClient.waitForSMS({
      to: participants[0].phoneNumber,
      body: expect.stringContaining('Game reminder'),
      timeout: 30000
    });

    // Assert - Push notification
    await this.pushTestClient.waitForPushNotification({
      userId: participants[0].id,
      title: expect.stringContaining('Game Tomorrow'),
      timeout: 30000
    });
  }

  @Test('Should respect COPPA compliance for youth player notifications')
  async testCOPPACompliantNotifications(): Promise<void> {
    // Arrange
    const youthPlayer = await this.createYouthPlayer({ age: 11 });
    const parent = await this.createParent({ 
      childIds: [youthPlayer.id],
      consentProvided: true 
    });
    const gameWithYouth = await this.createTestGameWithPlayer(youthPlayer.id);

    // Act - Send game notification
    await this.testClient.post('/notifications/send', {
      eventType: 'game_reminder',
      gameId: gameWithYouth.id,
      recipientId: youthPlayer.id
    });

    // Assert - Notification should go to parent, not child
    const parentNotification = await this.waitForNotification({
      recipientId: parent.id,
      eventType: 'game_reminder',
      gameId: gameWithYouth.id
    });

    expect(parentNotification).toBeDefined();
    expect(parentNotification.content).toContain(youthPlayer.name);

    // Assert - No direct notification to youth player
    const directNotification = await this.checkForNotification({
      recipientId: youthPlayer.id,
      eventType: 'game_reminder',
      timeout: 5000
    });

    expect(directNotification).toBeNull();
  }

  @Test('Should handle notification delivery failures with retry logic')
  async testNotificationRetryLogic(): Promise<void> {
    // Arrange
    const user = await this.createTestUser();
    
    // Simulate email service temporary failure
    this.emailTestClient.simulateServiceFailure({
      failureType: 'temporary',
      failureCount: 2, // Fail first 2 attempts
      errorCode: 'SERVICE_UNAVAILABLE'
    });

    // Act
    await this.testClient.post('/notifications/send', {
      type: 'email',
      recipientId: user.id,
      templateId: 'welcome_email',
      priority: 'normal'
    });

    // Assert - Should retry and eventually succeed
    const deliveryAttempts = await this.waitForDeliveryAttempts({
      recipientId: user.id,
      maxAttempts: 3,
      timeout: 30000
    });

    expect(deliveryAttempts.length).toBe(3);
    expect(deliveryAttempts[0].status).toBe('failed');
    expect(deliveryAttempts[1].status).toBe('failed');
    expect(deliveryAttempts[2].status).toBe('delivered');

    // Verify exponential backoff was used
    expect(deliveryAttempts[1].timestamp - deliveryAttempts[0].timestamp).toBeGreaterThan(1000);
    expect(deliveryAttempts[2].timestamp - deliveryAttempts[1].timestamp).toBeGreaterThan(2000);
  }

  @Test('Should handle emergency notifications with priority delivery')
  async testEmergencyNotificationPriority(): Promise<void> {
    // Arrange
    const users = await this.createMultipleTestUsers(100);
    const weatherEmergency = await this.createWeatherEmergency({
      severity: 'critical',
      location: { lat: 33.4484, lng: -112.0740 }, // Phoenix coordinates
      affectedRadius: 10 // miles
    });

    // Act - Send emergency notification
    const emergencyStart = Date.now();
    await this.testClient.post('/notifications/emergency', {
      alertType: 'weather_emergency',
      severity: 'critical',
      message: 'Extreme heat warning - all outdoor activities cancelled',
      affectedUsers: users.map(u => u.id)
    });

    // Assert - All notifications delivered within 30 seconds
    const deliveryResults = await this.waitForBulkDelivery({
      userCount: users.length,
      timeout: 30000
    });

    const deliveryTime = Date.now() - emergencyStart;
    expect(deliveryTime).toBeLessThan(30000); // 30 seconds max
    expect(deliveryResults.successRate).toBeGreaterThan(0.95); // 95% delivery rate
    
    // Emergency notifications should bypass user preferences
    const emergencyDeliveries = deliveryResults.deliveries.filter(
      d => d.emergencyOverride === true
    );
    expect(emergencyDeliveries.length).toBe(users.length);
  }

  private async createTestGame(): Promise<TestGame> {
    return await this.testData.generators.get('game')!.generate({
      homeTeam: 'Phoenix Suns Youth',
      awayTeam: 'Scottsdale Storm',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      venue: 'Phoenix Recreation Center'
    });
  }

  private async advanceTimeToNotificationTrigger(): Promise<void> {
    // In test environment, we simulate time advancement
    // In production, this would be handled by the scheduler
    await this.testClient.post('/test/advance-time', {
      seconds: 2 * 60 * 60 // Advance 2 hours
    });
  }
}
```

---

## 3. Third-Party Service Testing

### 3.1 External API Testing Framework

```typescript
class ExternalAPITestSuite {
  private readonly serviceClients: Map<string, ExternalServiceClient>;
  private readonly mockServers: Map<string, MockServer>;
  private readonly contractTests: Map<string, ContractTestSuite>;

  constructor() {
    this.serviceClients = new Map();
    this.mockServers = new Map();
    this.contractTests = new Map();
    this.setupExternalServices();
  }

  private setupExternalServices(): void {
    // Stripe payment service testing
    this.serviceClients.set('stripe', new StripeTestClient({
      baseUrl: 'https://api.stripe.com',
      apiKey: process.env.STRIPE_TEST_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    }));

    // Google Calendar API testing
    this.serviceClients.set('google_calendar', new GoogleCalendarTestClient({
      baseUrl: 'https://www.googleapis.com/calendar/v3',
      credentials: process.env.GOOGLE_TEST_CREDENTIALS
    }));

    // Weather API testing
    this.serviceClients.set('weather', new WeatherAPITestClient({
      baseUrl: 'https://api.weatherapi.com/v1',
      apiKey: process.env.WEATHER_API_TEST_KEY
    }));

    // Setup mock servers for offline testing
    this.setupMockServers();
  }

  private setupMockServers(): void {
    // Stripe mock server
    const stripeMock = new MockServer({
      port: 3001,
      name: 'stripe-mock'
    });

    stripeMock.setupEndpoint({
      method: 'POST',
      path: '/v1/payment_intents',
      response: (req) => this.generateMockStripePaymentIntent(req.body),
      latency: { min: 100, max: 500 }
    });

    this.mockServers.set('stripe', stripeMock);

    // Google Calendar mock server
    const googleMock = new MockServer({
      port: 3002,
      name: 'google-calendar-mock'
    });

    googleMock.setupEndpoint({
      method: 'POST',
      path: '/calendar/v3/calendars/:calendarId/events',
      response: (req) => this.generateMockCalendarEvent(req.params, req.body)
    });

    this.mockServers.set('google_calendar', googleMock);
  }

  @TestSuite('Stripe API Integration')
  async testStripeIntegration(): Promise<void> {
    const stripeClient = this.serviceClients.get('stripe') as StripeTestClient;

    await this.runTestGroup('Payment Intent Operations', [
      () => this.testCreatePaymentIntent(stripeClient),
      () => this.testConfirmPaymentIntent(stripeClient),
      () => this.testCancelPaymentIntent(stripeClient)
    ]);

    await this.runTestGroup('Customer Operations', [
      () => this.testCreateCustomer(stripeClient),
      () => this.testUpdateCustomer(stripeClient),
      () => this.testDeleteCustomer(stripeClient)
    ]);

    await this.runTestGroup('Webhook Handling', [
      () => this.testWebhookSignatureValidation(stripeClient),
      () => this.testWebhookEventProcessing(stripeClient),
      () => this.testWebhookRetryLogic(stripeClient)
    ]);

    await this.runTestGroup('Error Scenarios', [
      () => this.testInvalidAPIKey(stripeClient),
      () => this.testRateLimitHandling(stripeClient),
      () => this.testNetworkTimeouts(stripeClient)
    ]);
  }

  private async testCreatePaymentIntent(client: StripeTestClient): Promise<void> {
    const paymentData = {
      amount: 5000, // $50.00
      currency: 'usd',
      metadata: {
        registrationId: 'reg_123',
        leagueId: 'league_456'
      }
    };

    const paymentIntent = await client.createPaymentIntent(paymentData);

    expect(paymentIntent.id).toMatch(/^pi_/);
    expect(paymentIntent.amount).toBe(paymentData.amount);
    expect(paymentIntent.currency).toBe(paymentData.currency);
    expect(paymentIntent.status).toBe('requires_payment_method');
    expect(paymentIntent.metadata).toMatchObject(paymentData.metadata);
  }

  private async testWebhookSignatureValidation(client: StripeTestClient): Promise<void> {
    const webhookPayload = JSON.stringify({
      id: 'evt_test_webhook',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_payment_intent',
          status: 'succeeded'
        }
      }
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const validSignature = client.generateWebhookSignature(webhookPayload, timestamp);
    const invalidSignature = 'invalid_signature';

    // Test valid signature
    const validResult = await client.validateWebhookSignature(
      webhookPayload, 
      validSignature, 
      timestamp
    );
    expect(validResult.valid).toBe(true);

    // Test invalid signature
    const invalidResult = await client.validateWebhookSignature(
      webhookPayload, 
      invalidSignature, 
      timestamp
    );
    expect(invalidResult.valid).toBe(false);

    // Test timestamp tolerance
    const oldTimestamp = timestamp - 400; // 400 seconds ago (outside tolerance)
    const oldResult = await client.validateWebhookSignature(
      webhookPayload, 
      client.generateWebhookSignature(webhookPayload, oldTimestamp), 
      oldTimestamp
    );
    expect(oldResult.valid).toBe(false);
    expect(oldResult.reason).toContain('timestamp');
  }

  @TestSuite('Google Calendar API Integration')
  async testGoogleCalendarIntegration(): Promise<void> {
    const calendarClient = this.serviceClients.get('google_calendar') as GoogleCalendarTestClient;

    await this.runTestGroup('Calendar Operations', [
      () => this.testListCalendars(calendarClient),
      () => this.testCreateCalendarEvent(calendarClient),
      () => this.testUpdateCalendarEvent(calendarClient),
      () => this.testDeleteCalendarEvent(calendarClient)
    ]);

    await this.runTestGroup('Event Management', [
      () => this.testRecurringEvents(calendarClient),
      () => this.testEventAttendees(calendarClient),
      () => this.testEventReminders(calendarClient)
    ]);

    await this.runTestGroup('Real-time Sync', [
      () => this.testWebhookSetup(calendarClient),
      () => this.testIncrementalSync(calendarClient),
      () => this.testConflictResolution(calendarClient)
    ]);
  }

  private async testCreateCalendarEvent(client: GoogleCalendarTestClient): Promise<void> {
    const eventData = {
      summary: 'Phoenix Suns Youth vs Scottsdale Storm',
      description: 'U12 Basketball Game',
      start: {
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        timeZone: 'America/Phoenix'
      },
      end: {
        dateTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
        timeZone: 'America/Phoenix'
      },
      location: 'Phoenix Recreation Center, 1234 Main St, Phoenix, AZ',
      attendees: [
        { email: 'coach1@example.com', displayName: 'Coach Smith' },
        { email: 'coach2@example.com', displayName: 'Coach Johnson' }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 60 }       // 1 hour
        ]
      }
    };

    const createdEvent = await client.createEvent('primary', eventData);

    expect(createdEvent.id).toBeDefined();
    expect(createdEvent.summary).toBe(eventData.summary);
    expect(createdEvent.status).toBe('confirmed');
    expect(createdEvent.attendees).toHaveLength(2);
    expect(createdEvent.htmlLink).toMatch(/^https:\/\/www\.google\.com\/calendar/);

    // Verify event can be retrieved
    const retrievedEvent = await client.getEvent('primary', createdEvent.id);
    expect(retrievedEvent.id).toBe(createdEvent.id);
    expect(retrievedEvent.summary).toBe(eventData.summary);
  }

  @TestSuite('Weather API Integration')  
  async testWeatherAPIIntegration(): Promise<void> {
    const weatherClient = this.serviceClients.get('weather') as WeatherAPITestClient;

    await this.runTestGroup('Current Weather', [
      () => this.testCurrentWeatherPhoenix(weatherClient),
      () => this.testWeatherAlerts(weatherClient),
      () => this.testHeatIndexCalculation(weatherClient)
    ]);

    await this.runTestGroup('Forecast Data', [
      () => this.testHourlyForecast(weatherClient),
      () => this.testDailyForecast(weatherClient),
      () => this.testExtendedForecast(weatherClient)
    ]);

    await this.runTestGroup('Safety Thresholds', [
      () => this.testHeatWarningThresholds(weatherClient),
      () => this.testAirQualityAlerts(weatherClient),
      () => this.testSevereWeatherAlerts(weatherClient)
    ]);
  }

  private async testCurrentWeatherPhoenix(client: WeatherAPITestClient): Promise<void> {
    const phoenixCoords = { lat: 33.4484, lng: -112.0740 };
    const currentWeather = await client.getCurrentWeather(phoenixCoords);

    expect(currentWeather.location.name).toContain('Phoenix');
    expect(currentWeather.current.temp_f).toBeGreaterThan(0);
    expect(currentWeather.current.condition).toBeDefined();
    expect(currentWeather.current.humidity).toBeGreaterThanOrEqual(0);
    expect(currentWeather.current.humidity).toBeLessThanOrEqual(100);

    // Phoenix-specific validations
    if (isMonthInRange(new Date().getMonth(), 4, 9)) { // May through October
      expect(currentWeather.current.temp_f).toBeGreaterThan(80); // Likely hot
    }

    // Heat index should be calculated for high temperatures
    if (currentWeather.current.temp_f > 90) {
      expect(currentWeather.current.feelslike_f).toBeDefined();
      expect(currentWeather.current.feelslike_f).toBeGreaterThanOrEqual(currentWeather.current.temp_f);
    }
  }

  private async testHeatWarningThresholds(client: WeatherAPITestClient): Promise<void> {
    const phoenixCoords = { lat: 33.4484, lng: -112.0740 };
    
    // Test various temperature scenarios
    const testScenarios = [
      { temp: 95, expectedLevel: 'caution' },
      { temp: 105, expectedLevel: 'warning' },
      { temp: 115, expectedLevel: 'danger' }
    ];

    for (const scenario of testScenarios) {
      // Mock the temperature for testing
      client.mockTemperature(scenario.temp);
      
      const weather = await client.getCurrentWeather(phoenixCoords);
      const safetyLevel = this.calculateSafetyLevel(weather.current.temp_f, weather.current.feelslike_f);
      
      expect(safetyLevel).toBe(scenario.expectedLevel);
    }
  }

  private calculateSafetyLevel(temperature: number, feelsLike: number): string {
    const effectiveTemp = Math.max(temperature, feelsLike);
    
    if (effectiveTemp >= 115) return 'danger';
    if (effectiveTemp >= 105) return 'warning';
    if (effectiveTemp >= 95) return 'caution';
    return 'safe';
  }

  async runContractTests(): Promise<ContractTestResults> {
    const results: ContractTestResults = {
      stripe: await this.runStripeContractTests(),
      googleCalendar: await this.runGoogleCalendarContractTests(),
      weatherAPI: await this.runWeatherAPIContractTests(),
      sendGrid: await this.runSendGridContractTests(),
      twilio: await this.runTwilioContractTests()
    };

    return results;
  }

  private async runStripeContractTests(): Promise<ContractTestResult> {
    const contractTest = this.contractTests.get('stripe')!;
    
    return await contractTest.verify([
      'payment_intent_creation_contract',
      'webhook_signature_contract', 
      'customer_creation_contract',
      'subscription_management_contract',
      'refund_processing_contract'
    ]);
  }
}
```

---

## 4. End-to-End Test Scenarios

### 4.1 Basketball League Workflow Tests

```typescript
class BasketballLeagueE2ETests {
  private testDriver: PlaywrightTestDriver;
  private apiClient: TestAPIClient;
  private testData: TestDataManager;

  async beforeAll(): Promise<void> {
    this.testDriver = new PlaywrightTestDriver({
      browser: 'chromium',
      headless: process.env.CI === 'true',
      viewport: { width: 1920, height: 1080 }
    });
    
    this.apiClient = new TestAPIClient({
      baseUrl: process.env.TEST_API_URL || 'http://localhost:3000'
    });

    this.testData = new TestDataManager();
    await this.setupTestEnvironment();
  }

  @E2ETest('Complete youth league registration workflow')
  async testCompleteYouthRegistrationWorkflow(): Promise<void> {
    // Test covers: User registration → League creation → Player registration → Payment → Team assignment
    
    const testScenario = await this.testData.createTestScenario(
      BasketballTestScenario.YOUTH_LEAGUE_REGISTRATION
    );

    // Step 1: League administrator creates new league
    await this.testDriver.navigateTo('/admin/leagues/create');
    await this.createLeague({
      name: 'Phoenix Youth Basketball U12',
      ageGroup: 'u12',
      registrationFee: 150,
      maxTeams: 8,
      startDate: '2025-09-01',
      endDate: '2025-12-15',
      registrationDeadline: '2025-08-15'
    });

    const leagueId = await this.testDriver.getDataAttribute('[data-testid="league-id"]');
    expect(leagueId).toBeDefined();

    // Step 2: Parent creates account and registers player
    await this.testDriver.navigateTo('/register');
    await this.registerParentAccount({
      email: 'parent1@example.com',
      firstName: 'John',
      lastName: 'Smith',
      phone: '+1-602-555-0123'
    });

    await this.testDriver.waitForNavigation('/dashboard');
    
    // Step 3: Add youth player (triggers COPPA compliance)
    await this.testDriver.click('[data-testid="add-player-btn"]');
    await this.addYouthPlayer({
      firstName: 'Michael',
      lastName: 'Smith',
      dateOfBirth: '2013-05-15', // 11 years old
      emergencyContact: {
        name: 'Jane Smith',
        phone: '+1-602-555-0124',
        relationship: 'Mother'
      }
    });

    // Step 4: Register player for league
    await this.testDriver.navigateTo(`/leagues/${leagueId}/register`);
    await this.registerPlayerForLeague({
      playerId: await this.testDriver.getDataAttribute('[data-testid="player-id"]'),
      leagueId: leagueId,
      waiverSigned: true,
      medicalFormUploaded: true
    });

    // Step 5: Complete payment process
    await this.testDriver.click('[data-testid="proceed-to-payment"]');
    await this.processPayment({
      cardNumber: '4242424242424242', // Stripe test card
      expiryDate: '12/28',
      cvc: '123',
      zipCode: '85001'
    });

    // Step 6: Verify successful registration
    await this.testDriver.waitForSelector('[data-testid="registration-success"]');
    const confirmationNumber = await this.testDriver.getText('[data-testid="confirmation-number"]');
    expect(confirmationNumber).toMatch(/^CONF-\d{8}$/);

    // Step 7: Verify email confirmation was sent
    await this.verifyEmailSent({
      to: 'parent1@example.com',
      subject: 'Registration Confirmed - Phoenix Youth Basketball U12',
      body: expect.stringContaining(confirmationNumber)
    });

    // Step 8: Verify calendar event was created (if calendar sync enabled)
    if (await this.isCalendarSyncEnabled('parent1@example.com')) {
      await this.verifyCalendarEventCreated({
        email: 'parent1@example.com',
        eventTitle: expect.stringContaining('Phoenix Youth Basketball'),
        eventDate: '2025-09-01'
      });
    }

    // Step 9: Verify team assignment workflow
    await this.testDriver.navigateTo('/admin/teams/assignments');
    await this.assignPlayerToTeam({
      playerId: await this.getPlayerIdByName('Michael Smith'),
      teamId: await this.getAvailableTeamId(leagueId)
    });

    // Step 10: Verify final registration status
    const registrationStatus = await this.apiClient.get(`/registrations/${confirmationNumber}`);
    expect(registrationStatus.status).toBe('confirmed');
    expect(registrationStatus.teamAssignment).toBeDefined();
    expect(registrationStatus.paymentStatus).toBe('paid');
  }

  @E2ETest('Live game scoring and real-time updates')
  async testLiveGameScoringWorkflow(): Promise<void> {
    // Setup game data
    const gameData = await this.testData.createTestScenario(
      BasketballTestScenario.LIVE_GAME_SCORING
    );

    // Step 1: Start game as scorekeeper
    await this.testDriver.loginAs('scorekeeper', {
      email: 'scorekeeper@example.com',
      password: 'testpass123'
    });

    await this.testDriver.navigateTo(`/games/${gameData.game.id}/scoring`);
    await this.testDriver.click('[data-testid="start-game-btn"]');

    // Step 2: Score points and verify real-time updates
    await this.scorePoints({
      team: 'home',
      points: 2,
      playerId: gameData.players.home[0].id,
      quarter: 1
    });

    // Verify score update in real-time
    await this.testDriver.waitForSelector('[data-testid="score-home"]', { timeout: 5000 });
    const homeScore = await this.testDriver.getText('[data-testid="score-home"]');
    expect(homeScore).toBe('2');

    // Step 3: Verify live notifications are sent to parents
    const parentNotifications = await this.waitForLiveNotifications({
      gameId: gameData.game.id,
      eventType: 'score_update',
      timeout: 10000
    });

    expect(parentNotifications.length).toBeGreaterThan(0);
    expect(parentNotifications[0]).toMatchObject({
      type: 'push',
      message: expect.stringContaining('2 - 0')
    });

    // Step 4: Test quarter transition
    await this.advanceToNextQuarter();
    await this.scorePoints({
      team: 'away',
      points: 3,
      playerId: gameData.players.away[0].id,
      quarter: 2
    });

    // Step 5: Complete game and verify final notifications
    await this.completeGame({
      finalScore: { home: 52, away: 48 },
      gameLength: 32 * 60 * 1000 // 32 minutes
    });

    // Verify game completion notifications
    const completionNotifications = await this.waitForGameCompletionNotifications({
      gameId: gameData.game.id,
      timeout: 15000
    });

    expect(completionNotifications).toContain(
      expect.objectContaining({
        type: 'game_complete',
        finalScore: { home: 52, away: 48 },
        winner: gameData.game.homeTeam.name
      })
    );
  }

  @E2ETest('Weather emergency response workflow')
  async testWeatherEmergencyWorkflow(): Promise<void> {
    // Setup games scheduled for today in Phoenix
    const weatherEmergencyData = await this.testData.createTestScenario(
      BasketballTestScenario.WEATHER_EMERGENCY
    );

    // Step 1: Simulate extreme heat weather alert
    await this.simulateWeatherAlert({
      location: { lat: 33.4484, lng: -112.0740 }, // Phoenix
      temperature: 118, // Extreme heat
      heatIndex: 125,
      alertType: 'excessive_heat_warning',
      severity: 'critical'
    });

    // Step 2: Verify automatic game cancellations
    const affectedGames = weatherEmergencyData.games.filter(
      g => g.location.includes('Phoenix') && g.startTime < new Date(Date.now() + 6 * 60 * 60 * 1000)
    );

    for (const game of affectedGames) {
      await this.waitForGameCancellation({
        gameId: game.id,
        reason: 'weather_emergency',
        timeout: 30000
      });
    }

    // Step 3: Verify emergency notifications sent to all participants
    const emergencyNotifications = await this.waitForEmergencyNotifications({
      alertType: 'weather_emergency',
      affectedGames: affectedGames.map(g => g.id),
      timeout: 60000
    });

    expect(emergencyNotifications.length).toBeGreaterThan(0);
    
    // Emergency notifications should use multiple channels
    const channelsUsed = new Set(emergencyNotifications.map(n => n.channel));
    expect(channelsUsed).toContain('sms');
    expect(channelsUsed).toContain('push');
    expect(channelsUsed).toContain('email');

    // Step 4: Verify safety instructions included
    emergencyNotifications.forEach(notification => {
      expect(notification.content).toContain('extreme heat warning');
      expect(notification.content).toContain('cancelled');
      expect(notification.content).toContain('safety');
    });

    // Step 5: Verify rescheduling workflow initiated
    await this.testDriver.loginAs('league_admin', {
      email: 'admin@phoenixleague.com',
      password: 'adminpass123'
    });

    await this.testDriver.navigateTo('/admin/games/reschedule');
    
    const cancelledGames = await this.testDriver.findAll('[data-testid="cancelled-game"]');
    expect(cancelledGames.length).toBe(affectedGames.length);

    // Step 6: Reschedule a game and verify notifications
    await this.rescheduleGame({
      gameId: affectedGames[0].id,
      newDate: '2025-08-10',
      newTime: '08:00', // Early morning to avoid heat
      venue: 'Indoor Facility A'
    });

    const rescheduleNotifications = await this.waitForRescheduleNotifications({
      gameId: affectedGames[0].id,
      timeout: 30000
    });

    expect(rescheduleNotifications[0].content).toContain('rescheduled');
    expect(rescheduleNotifications[0].content).toContain('Indoor Facility A');
  }

  private async createLeague(leagueData: LeagueCreationData): Promise<void> {
    await this.testDriver.fill('[data-testid="league-name"]', leagueData.name);
    await this.testDriver.select('[data-testid="age-group"]', leagueData.ageGroup);
    await this.testDriver.fill('[data-testid="registration-fee"]', leagueData.registrationFee.toString());
    await this.testDriver.fill('[data-testid="max-teams"]', leagueData.maxTeams.toString());
    await this.testDriver.fill('[data-testid="start-date"]', leagueData.startDate);
    await this.testDriver.fill('[data-testid="end-date"]', leagueData.endDate);
    await this.testDriver.fill('[data-testid="registration-deadline"]', leagueData.registrationDeadline);
    
    await this.testDriver.click('[data-testid="create-league-btn"]');
    await this.testDriver.waitForSelector('[data-testid="league-created-success"]');
  }

  private async processPayment(paymentData: PaymentData): Promise<void> {
    // Wait for Stripe Elements to load
    await this.testDriver.waitForSelector('iframe[src*="stripe"]');
    
    // Switch to Stripe Elements iframe
    const stripeFrame = await this.testDriver.frame('iframe[src*="stripe"]');
    
    await stripeFrame.fill('[data-testid="card-number"]', paymentData.cardNumber);
    await stripeFrame.fill('[data-testid="expiry-date"]', paymentData.expiryDate);
    await stripeFrame.fill('[data-testid="cvc"]', paymentData.cvc);
    await stripeFrame.fill('[data-testid="zip-code"]', paymentData.zipCode);
    
    // Return to main frame and submit payment
    await this.testDriver.mainFrame();
    await this.testDriver.click('[data-testid="submit-payment-btn"]');
    
    // Wait for payment processing
    await this.testDriver.waitForSelector('[data-testid="payment-processing"]');
    await this.testDriver.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
  }
}
```

---

## 5. Performance and Load Testing

### 5.1 Basketball-Specific Load Test Scenarios

```typescript
class BasketballLeagueLoadTests {
  private loadTestClient: K6TestClient;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.loadTestClient = new K6TestClient({
      apiBaseUrl: process.env.LOAD_TEST_API_URL,
      webBaseUrl: process.env.LOAD_TEST_WEB_URL
    });
    
    this.performanceMonitor = new PerformanceMonitor({
      datadogApiKey: process.env.DATADOG_API_KEY,
      grafanaUrl: process.env.GRAFANA_URL
    });
  }

  @LoadTest('Registration rush scenario - 1000 concurrent registrations')
  async testRegistrationRushLoad(): Promise<LoadTestResult> {
    // Simulate registration deadline rush
    const testConfig: LoadTestConfig = {
      scenario: 'registration_rush',
      duration: '5m',
      users: 1000,
      rampUpTime: '30s',
      thresholds: {
        httpReqDuration: ['p(95)<5000'], // 95% of requests under 5 seconds
        httpReqFailed: ['rate<0.05'],    // Less than 5% failures
        checkFailures: ['rate<0.01']     // Less than 1% check failures
      }
    };

    const testScript = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Rate, Trend } from 'k6/metrics';

      export let options = ${JSON.stringify({
        stages: [
          { duration: testConfig.rampUpTime, target: testConfig.users },
          { duration: testConfig.duration, target: testConfig.users },
          { duration: '1m', target: 0 }
        ],
        thresholds: testConfig.thresholds
      })};

      const registrationRate = new Rate('registration_success_rate');
      const paymentTime = new Trend('payment_processing_time');

      export default function() {
        // Step 1: Create parent account
        let parentData = {
          email: \`parent_\${__VU}_\${__ITER}@loadtest.com\`,
          firstName: 'LoadTest',
          lastName: \`Parent\${__VU}\`,
          password: 'LoadTest123!',
          phone: '+1-602-555-' + String(__VU).padStart(4, '0')
        };

        let parentResponse = http.post('${testConfig.apiBaseUrl}/auth/register', JSON.stringify(parentData), {
          headers: { 'Content-Type': 'application/json' }
        });

        check(parentResponse, {
          'parent registration successful': (r) => r.status === 201
        });

        if (parentResponse.status !== 201) return;

        let authToken = parentResponse.json('accessToken');

        // Step 2: Add youth player
        let playerData = {
          firstName: 'LoadTest',
          lastName: \`Player\${__VU}\`,
          dateOfBirth: '2013-01-01',
          parentId: parentResponse.json('user.id')
        };

        let playerResponse = http.post('${testConfig.apiBaseUrl}/players', JSON.stringify(playerData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`
          }
        });

        check(playerResponse, {
          'player creation successful': (r) => r.status === 201
        });

        // Step 3: Register for league
        let registrationData = {
          leagueId: '${this.getTestLeagueId()}',
          playerId: playerResponse.json('id'),
          waiverSigned: true,
          medicalFormSubmitted: true
        };

        let registrationResponse = http.post('${testConfig.apiBaseUrl}/registrations', JSON.stringify(registrationData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`
          }
        });

        check(registrationResponse, {
          'registration successful': (r) => r.status === 201
        });

        // Step 4: Process payment
        let paymentStart = Date.now();
        let paymentData = {
          registrationId: registrationResponse.json('id'),
          amount: 15000, // $150.00
          paymentMethodId: 'pm_card_visa' // Test payment method
        };

        let paymentResponse = http.post('${testConfig.apiBaseUrl}/payments/process', JSON.stringify(paymentData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${authToken}\`
          }
        });

        let paymentDuration = Date.now() - paymentStart;
        paymentTime.add(paymentDuration);

        let paymentSuccessful = check(paymentResponse, {
          'payment processing successful': (r) => r.status === 200,
          'payment completed': (r) => r.json('status') === 'succeeded'
        });

        registrationRate.add(paymentSuccessful);

        sleep(1);
      }
    `;

    const result = await this.loadTestClient.runTest(testScript, testConfig);
    
    // Analyze results
    return {
      scenario: testConfig.scenario,
      duration: testConfig.duration,
      users: testConfig.users,
      totalRequests: result.metrics.http_reqs.count,
      averageResponseTime: result.metrics.http_req_duration.avg,
      p95ResponseTime: result.metrics.http_req_duration['p(95)'],
      errorRate: result.metrics.http_req_failed.rate,
      registrationSuccessRate: result.metrics.registration_success_rate.rate,
      averagePaymentTime: result.metrics.payment_processing_time.avg
    };
  }

  @LoadTest('Live game scoring - real-time updates')
  async testLiveGameScoringLoad(): Promise<LoadTestResult> {
    const testConfig: LoadTestConfig = {
      scenario: 'live_game_scoring',
      duration: '10m', // Simulate 10-minute game quarter
      users: 500, // 500 concurrent viewers
      rampUpTime: '1m',
      thresholds: {
        httpReqDuration: ['p(95)<1000'],  // Real-time updates under 1 second
        wsConnectionDuration: ['p(95)<500'], // WebSocket connections under 500ms
        wsMessageDelay: ['p(95)<100']     // Message delivery under 100ms
      }
    };

    const testScript = `
      import ws from 'k6/ws';
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Counter, Gauge } from 'k6/metrics';

      export let options = ${JSON.stringify({
        stages: [
          { duration: testConfig.rampUpTime, target: testConfig.users },
          { duration: testConfig.duration, target: testConfig.users }
        ],
        thresholds: testConfig.thresholds
      })};

      const scoreUpdatesReceived = new Counter('score_updates_received');
      const connectionTime = new Gauge('websocket_connection_time');

      export default function() {
        // Connect to live game WebSocket
        let gameId = '${this.getTestGameId()}';
        let wsUrl = \`\${__ENV.WS_URL}/games/\${gameId}/live\`;
        
        let connectionStart = Date.now();
        
        let response = ws.connect(wsUrl, {}, function(socket) {
          connectionTime.add(Date.now() - connectionStart);
          
          socket.on('open', function() {
            // Subscribe to game updates
            socket.send(JSON.stringify({
              type: 'subscribe',
              gameId: gameId,
              events: ['score_update', 'game_event', 'quarter_change']
            }));
          });

          socket.on('message', function(data) {
            let message = JSON.parse(data);
            
            check(message, {
              'valid message format': (msg) => msg.type !== undefined,
              'contains game data': (msg) => msg.gameId === gameId,
              'timely delivery': (msg) => {
                let messageTime = new Date(msg.timestamp);
                let delay = Date.now() - messageTime.getTime();
                return delay < 1000; // Under 1 second delay
              }
            });

            if (message.type === 'score_update') {
              scoreUpdatesReceived.add(1);
            }
          });

          socket.on('error', function(e) {
            console.error('WebSocket error:', e);
          });

          // Keep connection alive for test duration
          setTimeout(function() {
            socket.close();
          }, 60000); // 1 minute connection per user
        });

        sleep(1);
      }
    `;

    return await this.loadTestClient.runTest(testScript, testConfig);
  }

  @LoadTest('Emergency notification blast - 5000 recipients')
  async testEmergencyNotificationLoad(): Promise<LoadTestResult> {
    const testConfig: LoadTestConfig = {
      scenario: 'emergency_notification',
      duration: '2m',
      users: 1, // Single user triggering emergency
      thresholds: {
        httpReqDuration: ['p(95)<30000'], // Emergency notification within 30 seconds
        notificationDeliveryRate: ['rate>0.95'] // 95% delivery rate
      }
    };

    // First, create 5000 test users for the emergency blast
    await this.setupEmergencyTestUsers(5000);

    const testScript = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Rate, Trend } from 'k6/metrics';

      const deliveryRate = new Rate('notification_delivery_rate');
      const deliveryTime = new Trend('notification_delivery_time');

      export default function() {
        // Trigger emergency notification
        let emergencyData = {
          type: 'weather_emergency',
          severity: 'critical',
          message: 'Extreme heat warning - all outdoor activities cancelled immediately',
          affectedLocation: {
            lat: 33.4484,
            lng: -112.0740,
            radius: 25 // 25 mile radius
          },
          channels: ['sms', 'email', 'push']
        };

        let emergencyStart = Date.now();
        
        let response = http.post('${testConfig.apiBaseUrl}/notifications/emergency', 
          JSON.stringify(emergencyData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${__ENV.ADMIN_TOKEN}\`
          }
        });

        check(response, {
          'emergency notification accepted': (r) => r.status === 202,
          'notification ID returned': (r) => r.json('notificationId') !== undefined
        });

        let notificationId = response.json('notificationId');

        // Poll for delivery status
        let deliveryComplete = false;
        let pollAttempts = 0;
        let maxPolls = 60; // 2 minutes max

        while (!deliveryComplete && pollAttempts < maxPolls) {
          sleep(2); // Poll every 2 seconds
          
          let statusResponse = http.get(\`${testConfig.apiBaseUrl}/notifications/\${notificationId}/status\`, {
            headers: { 'Authorization': \`Bearer \${__ENV.ADMIN_TOKEN}\` }
          });

          if (statusResponse.status === 200) {
            let status = statusResponse.json();
            
            if (status.completed) {
              deliveryComplete = true;
              let totalTime = Date.now() - emergencyStart;
              deliveryTime.add(totalTime);
              
              let successfulDeliveries = status.delivered;
              let totalRecipients = status.totalRecipients;
              let rate = successfulDeliveries / totalRecipients;
              
              deliveryRate.add(rate);
              
              check(status, {
                'emergency delivered within time limit': () => totalTime < 30000,
                'high delivery success rate': () => rate > 0.95,
                'all channels attempted': () => status.channelsUsed.includes('sms') && 
                                              status.channelsUsed.includes('email') && 
                                              status.channelsUsed.includes('push')
              });
            }
          }
          
          pollAttempts++;
        }

        if (!deliveryComplete) {
          console.error('Emergency notification delivery timeout');
        }
      }
    `;

    return await this.loadTestClient.runTest(testScript, testConfig);
  }

  @LoadTest('Calendar sync load - 1000 concurrent calendar operations')
  async testCalendarSyncLoad(): Promise<LoadTestResult> {
    const testConfig: LoadTestConfig = {
      scenario: 'calendar_sync',
      duration: '5m',
      users: 1000,
      rampUpTime: '2m',
      thresholds: {
        httpReqDuration: ['p(95)<5000'],
        calendarSyncSuccess: ['rate>0.98']
      }
    };

    const testScript = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      import { Rate } from 'k6/metrics';

      const syncSuccessRate = new Rate('calendar_sync_success');

      export default function() {
        let userId = \`loadtest_user_\${__VU}\`;
        
        // Step 1: Connect Google Calendar
        let calendarConnectionData = {
          provider: 'google',
          accessToken: \`mock_token_\${__VU}\`,
          refreshToken: \`mock_refresh_\${__VU}\`,
          calendarId: 'primary'
        };

        let connectionResponse = http.post('${testConfig.apiBaseUrl}/integrations/calendar/connect',
          JSON.stringify(calendarConnectionData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer mock_token_\${userId}\`
          }
        });

        check(connectionResponse, {
          'calendar connection successful': (r) => r.status === 200
        });

        // Step 2: Sync upcoming games to calendar
        let syncData = {
          leagueId: '${this.getTestLeagueId()}',
          syncType: 'upcoming_games',
          includeTeamGames: true,
          includePractices: false
        };

        let syncResponse = http.post('${testConfig.apiBaseUrl}/integrations/calendar/sync',
          JSON.stringify(syncData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer mock_token_\${userId}\`
          }
        });

        let syncSuccessful = check(syncResponse, {
          'calendar sync initiated': (r) => r.status === 202,
          'sync job ID returned': (r) => r.json('syncJobId') !== undefined
        });

        syncSuccessRate.add(syncSuccessful);

        // Step 3: Create individual game event
        let gameEventData = {
          gameId: \`game_\${Math.floor(Math.random() * 100)}\`,
          homeTeam: 'Phoenix Suns Youth',
          awayTeam: 'Scottsdale Storm',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          venue: 'Phoenix Recreation Center'
        };

        let eventResponse = http.post('${testConfig.apiBaseUrl}/integrations/calendar/events',
          JSON.stringify(gameEventData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': \`Bearer mock_token_\${userId}\`
          }
        });

        check(eventResponse, {
          'calendar event created': (r) => r.status === 201,
          'event ID returned': (r) => r.json('eventId') !== undefined
        });

        sleep(Math.random() * 2); // Random sleep 0-2 seconds
      }
    `;

    return await this.loadTestClient.runTest(testScript, testConfig);
  }

  private async setupEmergencyTestUsers(count: number): Promise<void> {
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batch = Array(Math.min(batchSize, count - i * batchSize)).fill(0).map((_, idx) => ({
        email: `emergency_test_${i * batchSize + idx}@loadtest.com`,
        firstName: 'Emergency',
        lastName: `Test${i * batchSize + idx}`,
        phone: `+1-602-555-${String(i * batchSize + idx).padStart(4, '0')}`,
        location: {
          lat: 33.4484 + (Math.random() - 0.5) * 0.5, // Random location within Phoenix area
          lng: -112.0740 + (Math.random() - 0.5) * 0.5
        }
      }));

      await this.loadTestClient.setupBatchUsers(batch);
    }
  }

  async generateLoadTestReport(results: LoadTestResult[]): Promise<LoadTestReport> {
    const report: LoadTestReport = {
      testSuite: 'Basketball League Load Tests',
      executedAt: new Date(),
      environment: process.env.NODE_ENV || 'test',
      summary: {
        totalScenarios: results.length,
        passedScenarios: results.filter(r => r.passed).length,
        failedScenarios: results.filter(r => !r.passed).length,
        averageResponseTime: this.calculateAverageResponseTime(results),
        overallSuccessRate: this.calculateOverallSuccessRate(results)
      },
      scenarios: results,
      recommendations: this.generatePerformanceRecommendations(results)
    };

    return report;
  }

  private generatePerformanceRecommendations(results: LoadTestResult[]): string[] {
    const recommendations: string[] = [];

    // Check registration rush performance
    const registrationRushResult = results.find(r => r.scenario === 'registration_rush');
    if (registrationRushResult && registrationRushResult.p95ResponseTime > 5000) {
      recommendations.push('Consider implementing registration queue system for high-traffic periods');
      recommendations.push('Optimize database queries for registration workflow');
      recommendations.push('Add Redis caching for league and team data');
    }

    // Check real-time scoring performance  
    const liveScoringResult = results.find(r => r.scenario === 'live_game_scoring');
    if (liveScoringResult && liveScoringResult.averageResponseTime > 1000) {
      recommendations.push('Optimize WebSocket connection handling for live updates');
      recommendations.push('Consider implementing event streaming with Apache Kafka');
      recommendations.push('Add CDN for real-time score distribution');
    }

    // Check emergency notification performance
    const emergencyResult = results.find(r => r.scenario === 'emergency_notification');
    if (emergencyResult && emergencyResult.averageResponseTime > 30000) {
      recommendations.push('Implement dedicated emergency notification infrastructure');
      recommendations.push('Add message queue prioritization for emergency alerts');
      recommendations.push('Consider SMS service redundancy for critical notifications');
    }

    return recommendations;
  }
}
```

---

## 6. Security and Compliance Testing

### 6.1 Security Integration Tests

```typescript
class SecurityIntegrationTests {
  private securityTestSuite: SecurityTestSuite;
  private penetrationTestTools: PenetrationTestTools;
  private complianceValidator: ComplianceValidator;

  constructor() {
    this.securityTestSuite = new SecurityTestSuite({
      owasp: true,
      pciDss: true,
      coppa: true
    });
    
    this.penetrationTestTools = new PenetrationTestTools({
      zapProxy: process.env.ZAP_PROXY_URL,
      burpSuite: process.env.BURP_SUITE_API
    });

    this.complianceValidator = new ComplianceValidator();
  }

  @SecurityTest('Authentication and authorization flow testing')
  async testAuthenticationSecurity(): Promise<SecurityTestResult> {
    const testResults: SecurityCheck[] = [];

    // Test 1: JWT token security
    testResults.push(await this.testJWTSecurity());
    
    // Test 2: OAuth 2.0 implementation
    testResults.push(await this.testOAuth2Security());
    
    // Test 3: Session management
    testResults.push(await this.testSessionSecurity());
    
    // Test 4: Multi-factor authentication
    testResults.push(await this.testMFASecurity());
    
    // Test 5: Password policy enforcement
    testResults.push(await this.testPasswordPolicySecurity());

    return this.generateSecurityTestResult('authentication', testResults);
  }

  private async testJWTSecurity(): Promise<SecurityCheck> {
    const testCases: SecurityTestCase[] = [];

    // Test Case 1: Token signature validation
    testCases.push(await this.runSecurityTestCase({
      name: 'JWT signature validation',
      category: 'authentication',
      test: async () => {
        // Create valid token
        const validToken = await this.createValidJWTToken();
        
        // Test with valid token
        const validResponse = await this.testClient.get('/protected-endpoint', {
          headers: { 'Authorization': `Bearer ${validToken}` }
        });
        expect(validResponse.status).toBe(200);

        // Test with tampered token
        const tamperedToken = this.tamperJWTToken(validToken);
        const tamperedResponse = await this.testClient.get('/protected-endpoint', {
          headers: { 'Authorization': `Bearer ${tamperedToken}` }
        });
        expect(tamperedResponse.status).toBe(401);

        // Test with expired token
        const expiredToken = await this.createExpiredJWTToken();
        const expiredResponse = await this.testClient.get('/protected-endpoint', {
          headers: { 'Authorization': `Bearer ${expiredToken}` }
        });
        expect(expiredResponse.status).toBe(401);
        
        return { passed: true, vulnerabilities: [] };
      }
    }));

    // Test Case 2: Token storage security
    testCases.push(await this.runSecurityTestCase({
      name: 'JWT storage security',
      category: 'authentication',
      test: async () => {
        // Check that tokens are not stored in localStorage
        const jsCode = `
          if (localStorage.getItem('access_token') || localStorage.getItem('jwt')) {
            return 'VULNERABLE: JWT stored in localStorage';
          }
          if (sessionStorage.getItem('access_token') || sessionStorage.getItem('jwt')) {
            return 'VULNERABLE: JWT stored in sessionStorage';
          }
          return 'SECURE: No JWT in web storage';
        `;
        
        const storageCheck = await this.testDriver.evaluate(jsCode);
        expect(storageCheck).toContain('SECURE');
        
        return { passed: !storageCheck.includes('VULNERABLE'), vulnerabilities: [] };
      }
    }));

    return {
      testName: 'JWT Security',
      category: 'authentication',
      passed: testCases.every(tc => tc.passed),
      testCases,
      vulnerabilities: testCases.flatMap(tc => tc.vulnerabilities),
      riskLevel: this.calculateRiskLevel(testCases)
    };
  }

  @SecurityTest('Payment processing security validation')
  async testPaymentSecurity(): Promise<SecurityTestResult> {
    const testResults: SecurityCheck[] = [];

    // Test PCI DSS compliance
    testResults.push(await this.testPCIDSSCompliance());
    
    // Test payment data encryption
    testResults.push(await this.testPaymentDataEncryption());
    
    // Test webhook signature validation
    testResults.push(await this.testWebhookSecurity());
    
    // Test refund authorization
    testResults.push(await this.testRefundSecurity());

    return this.generateSecurityTestResult('payment', testResults);
  }

  private async testPCIDSSCompliance(): Promise<SecurityCheck> {
    const pciTestCases: SecurityTestCase[] = [];

    // Test 1: No card data storage
    pciTestCases.push(await this.runSecurityTestCase({
      name: 'PCI DSS - No card data storage',
      category: 'pci_compliance',
      test: async () => {
        // Attempt to submit card data
        const cardData = {
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2028',
          cvc: '123'
        };

        const response = await this.testClient.post('/payments/process', cardData);
        
        // Response should reject direct card data
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Direct card data not accepted');
        
        // Check database for any stored card data
        const cardDataInDb = await this.searchDatabaseForCardData();
        expect(cardDataInDb).toHaveLength(0);
        
        return { 
          passed: response.status === 400 && cardDataInDb.length === 0,
          vulnerabilities: cardDataInDb.length > 0 ? ['Card data found in database'] : []
        };
      }
    }));

    // Test 2: Stripe Elements integration
    pciTestCases.push(await this.runSecurityTestCase({
      name: 'PCI DSS - Stripe Elements usage',
      category: 'pci_compliance',
      test: async () => {
        await this.testDriver.navigateTo('/register');
        
        // Check for Stripe Elements iframe
        const stripeElements = await this.testDriver.findAll('iframe[src*="js.stripe.com"]');
        expect(stripeElements.length).toBeGreaterThan(0);
        
        // Ensure no card input fields in our domain
        const cardFields = await this.testDriver.findAll('input[name*="card"], input[placeholder*="card"]');
        expect(cardFields.length).toBe(0);
        
        return { 
          passed: stripeElements.length > 0 && cardFields.length === 0,
          vulnerabilities: cardFields.length > 0 ? ['Direct card input fields found'] : []
        };
      }
    }));

    return {
      testName: 'PCI DSS Compliance',
      category: 'payment_security',
      passed: pciTestCases.every(tc => tc.passed),
      testCases: pciTestCases,
      vulnerabilities: pciTestCases.flatMap(tc => tc.vulnerabilities),
      riskLevel: this.calculateRiskLevel(pciTestCases)
    };
  }

  @SecurityTest('COPPA compliance validation')
  async testCOPPACompliance(): Promise<SecurityTestResult> {
    const coppaTestCases: SecurityTestCase[] = [];

    // Test 1: Parental consent requirement
    coppaTestCases.push(await this.runSecurityTestCase({
      name: 'COPPA - Parental consent required for youth',
      category: 'coppa_compliance',
      test: async () => {
        // Attempt to register player under 13 without parental consent
        const youthPlayerData = {
          firstName: 'Johnny',
          lastName: 'TestPlayer',
          dateOfBirth: '2015-01-01', // 9 years old
          parentEmail: 'parent@test.com'
        };

        const response = await this.testClient.post('/players', youthPlayerData);
        
        // Should require parental consent
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('parental consent');
        
        return { 
          passed: response.status === 400,
          vulnerabilities: response.status !== 400 ? ['Youth registration without consent allowed'] : []
        };
      }
    }));

    // Test 2: Data collection limitation
    coppaTestCases.push(await this.runSecurityTestCase({
      name: 'COPPA - Limited data collection for minors',
      category: 'coppa_compliance',
      test: async () => {
        // Create youth player profile with parent
        const parentData = await this.createParentWithConsent();
        const youthPlayerData = {
          firstName: 'Johnny',
          lastName: 'TestPlayer',
          dateOfBirth: '2015-01-01',
          parentId: parentData.id,
          parentalConsentId: parentData.consentId
        };

        const playerResponse = await this.testClient.post('/players', youthPlayerData, {
          headers: { 'Authorization': `Bearer ${parentData.token}` }
        });

        expect(playerResponse.status).toBe(201);
        
        // Verify limited data collection
        const createdPlayer = playerResponse.body;
        expect(createdPlayer.email).toBeUndefined();
        expect(createdPlayer.phone).toBeUndefined();
        expect(createdPlayer.socialMedia).toBeUndefined();
        
        return { 
          passed: !createdPlayer.email && !createdPlayer.phone,
          vulnerabilities: createdPlayer.email || createdPlayer.phone ? 
            ['Excessive data collection for minor'] : []
        };
      }
    }));

    // Test 3: Data retention policies
    coppaTestCases.push(await this.runSecurityTestCase({
      name: 'COPPA - Data retention compliance',
      category: 'coppa_compliance',
      test: async () => {
        // Check data retention policy implementation
        const retentionPolicy = await this.testClient.get('/compliance/data-retention');
        expect(retentionPolicy.status).toBe(200);
        
        const policy = retentionPolicy.body;
        expect(policy.minorDataRetention).toBeDefined();
        expect(policy.automaticDeletion).toBe(true);
        expect(policy.parentRequestDeletion).toBe(true);
        
        return { 
          passed: policy.minorDataRetention && policy.automaticDeletion,
          vulnerabilities: []
        };
      }
    }));

    return {
      testName: 'COPPA Compliance',
      category: 'privacy_compliance',
      passed: coppaTestCases.every(tc => tc.passed),
      testCases: coppaTestCases,
      vulnerabilities: coppaTestCases.flatMap(tc => tc.vulnerabilities),
      riskLevel: this.calculateRiskLevel(coppaTestCases)
    };
  }

  @SecurityTest('API security testing')
  async testAPISecurity(): Promise<SecurityTestResult> {
    const apiSecurityTests: SecurityCheck[] = [];

    // Test rate limiting
    apiSecurityTests.push(await this.testRateLimiting());
    
    // Test input validation
    apiSecurityTests.push(await this.testInputValidation());
    
    // Test SQL injection protection
    apiSecurityTests.push(await this.testSQLInjectionProtection());
    
    // Test XSS protection
    apiSecurityTests.push(await this.testXSSProtection());
    
    // Test CSRF protection
    apiSecurityTests.push(await this.testCSRFProtection());

    return this.generateSecurityTestResult('api_security', apiSecurityTests);
  }

  private async testRateLimiting(): Promise<SecurityCheck> {
    const rateLimitTests: SecurityTestCase[] = [];

    rateLimitTests.push(await this.runSecurityTestCase({
      name: 'Rate limiting - API endpoints',
      category: 'api_security',
      test: async () => {
        const endpoint = '/auth/login';
        const requests = [];
        
        // Send 100 requests rapidly
        for (let i = 0; i < 100; i++) {
          requests.push(this.testClient.post(endpoint, {
            email: `test${i}@example.com`,
            password: 'wrongpassword'
          }));
        }

        const responses = await Promise.all(requests);
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        
        // Should have rate limiting after reasonable number of attempts
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        return { 
          passed: rateLimitedResponses.length > 0,
          vulnerabilities: rateLimitedResponses.length === 0 ? 
            ['No rate limiting detected'] : []
        };
      }
    }));

    return {
      testName: 'Rate Limiting',
      category: 'api_security',
      passed: rateLimitTests.every(tc => tc.passed),
      testCases: rateLimitTests,
      vulnerabilities: rateLimitTests.flatMap(tc => tc.vulnerabilities),
      riskLevel: this.calculateRiskLevel(rateLimitTests)
    };
  }

  async runPenetrationTests(): Promise<PenetrationTestResult> {
    // Use OWASP ZAP for automated security scanning
    const zapResults = await this.penetrationTestTools.runZAPScan({
      targetUrl: process.env.TEST_API_URL,
      scanType: 'full',
      alertThreshold: 'medium'
    });

    // Run custom basketball-specific security tests
    const customTests = await this.runCustomPenetrationTests();

    return {
      zapScanResults: zapResults,
      customTestResults: customTests,
      overallRiskLevel: this.calculateOverallRisk([zapResults, customTests]),
      recommendations: this.generateSecurityRecommendations([zapResults, customTests])
    };
  }

  private async runCustomPenetrationTests(): Promise<CustomPenetrationTestResult> {
    const tests = [
      this.testYouthDataExposure(),
      this.testPaymentDataLeakage(),
      this.testPrivilegeEscalation(),
      this.testDataInjection(),
      this.testSessionFixation()
    ];

    const results = await Promise.all(tests);
    
    return {
      testName: 'Custom Basketball League Security Tests',
      tests: results,
      passed: results.every(r => r.passed),
      criticalVulnerabilities: results.flatMap(r => r.vulnerabilities.filter(v => v.severity === 'critical')),
      highVulnerabilities: results.flatMap(r => r.vulnerabilities.filter(v => v.severity === 'high'))
    };
  }
}
```

---

## 7. Automated Testing Pipeline

### 7.1 CI/CD Integration Testing Pipeline

```typescript
// GitHub Actions workflow for integration testing
const cicdPipeline = `
name: Integration Testing Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          NODE_ENV: test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: basketball_league_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: npm run db:test:setup
        env:
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/basketball_league_test
      
      - name: Start mock services
        run: |
          npm run mock:stripe &
          npm run mock:sendgrid &
          npm run mock:twilio &
          sleep 5
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          NODE_ENV: integration
          DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/basketball_league_test
          REDIS_URL: redis://localhost:6379
          STRIPE_TEST_KEY: \${{ secrets.STRIPE_TEST_KEY }}
          SENDGRID_API_KEY: \${{ secrets.SENDGRID_TEST_KEY }}
          TWILIO_ACCOUNT_SID: \${{ secrets.TWILIO_TEST_SID }}
          TWILIO_AUTH_TOKEN: \${{ secrets.TWILIO_TEST_TOKEN }}

  e2e-tests:
    name: End-to-End Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Start application
        run: |
          npm run build:test
          npm run start:test &
          sleep 30
        env:
          NODE_ENV: test
          DATABASE_URL: \${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: \${{ secrets.TEST_REDIS_URL }}
      
      - name: Run E2E tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
          STRIPE_PUBLISHABLE_KEY: \${{ secrets.STRIPE_TEST_PUBLISHABLE_KEY }}
      
      - name: Upload E2E test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  security-tests:
    name: Security Tests
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run security tests
        run: npm run test:security
        env:
          NODE_ENV: test
          SECURITY_TEST_TARGET: http://localhost:3000
      
      - name: Run OWASP ZAP scan
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

  load-tests:
    name: Load Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [integration-tests, e2e-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run load tests
        run: npm run test:load
        env:
          LOAD_TEST_TARGET: \${{ secrets.STAGING_URL }}
          LOAD_TEST_DURATION: 5m
          LOAD_TEST_USERS: 100

  deployment-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [e2e-tests, security-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to staging
        run: |
          # Deploy to staging environment
          echo "Deploying to staging..."
          # Add deployment commands here
      
      - name: Run staging validation tests
        run: |
          sleep 60  # Wait for deployment
          npm run test:staging-validation
        env:
          STAGING_URL: \${{ secrets.STAGING_URL }}
          STAGING_API_KEY: \${{ secrets.STAGING_API_KEY }}
`;
```

### 7.2 Test Automation Framework

```typescript
class TestAutomationFramework {
  private testOrchestrator: TestOrchestrator;
  private reportGenerator: TestReportGenerator;
  private notificationService: TestNotificationService;

  constructor() {
    this.testOrchestrator = new TestOrchestrator();
    this.reportGenerator = new TestReportGenerator();
    this.notificationService = new TestNotificationService();
  }

  async runFullTestSuite(config: TestSuiteConfig): Promise<TestSuiteResult> {
    const testSuiteStart = Date.now();
    
    try {
      // Phase 1: Unit Tests
      console.log('Starting unit tests...');
      const unitTestResults = await this.testOrchestrator.runUnitTests(config.unitTests);
      
      if (!unitTestResults.passed && config.stopOnFailure) {
        throw new TestFailureError('Unit tests failed', unitTestResults);
      }

      // Phase 2: Integration Tests
      console.log('Starting integration tests...');
      const integrationTestResults = await this.testOrchestrator.runIntegrationTests(config.integrationTests);
      
      if (!integrationTestResults.passed && config.stopOnFailure) {
        throw new TestFailureError('Integration tests failed', integrationTestResults);
      }

      // Phase 3: End-to-End Tests
      console.log('Starting E2E tests...');
      const e2eTestResults = await this.testOrchestrator.runE2ETests(config.e2eTests);

      // Phase 4: Security Tests (if enabled)
      let securityTestResults: SecurityTestResult | undefined;
      if (config.runSecurityTests) {
        console.log('Starting security tests...');
        securityTestResults = await this.testOrchestrator.runSecurityTests(config.securityTests);
      }

      // Phase 5: Performance Tests (if enabled)
      let performanceTestResults: PerformanceTestResult | undefined;
      if (config.runPerformanceTests) {
        console.log('Starting performance tests...');
        performanceTestResults = await this.testOrchestrator.runPerformanceTests(config.performanceTests);
      }

      const testSuiteDuration = Date.now() - testSuiteStart;

      const overallResult: TestSuiteResult = {
        passed: this.calculateOverallSuccess([
          unitTestResults,
          integrationTestResults,
          e2eTestResults,
          securityTestResults,
          performanceTestResults
        ].filter(Boolean)),
        duration: testSuiteDuration,
        results: {
          unit: unitTestResults,
          integration: integrationTestResults,
          e2e: e2eTestResults,
          security: securityTestResults,
          performance: performanceTestResults
        },
        summary: this.generateTestSummary({
          unit: unitTestResults,
          integration: integrationTestResults,
          e2e: e2eTestResults,
          security: securityTestResults,
          performance: performanceTestResults
        })
      };

      // Generate comprehensive report
      await this.generateTestReport(overallResult);

      // Send notifications
      await this.notifyTestResults(overallResult);

      return overallResult;

    } catch (error) {
      console.error('Test suite execution failed:', error);
      
      const failureResult: TestSuiteResult = {
        passed: false,
        duration: Date.now() - testSuiteStart,
        error: error.message,
        results: {},
        summary: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          coverage: 0
        }
      };

      await this.notifyTestFailure(failureResult, error);
      throw error;
    }
  }

  private async generateTestReport(results: TestSuiteResult): Promise<void> {
    // Generate HTML report
    const htmlReport = await this.reportGenerator.generateHTMLReport(results);
    await this.saveReportToFile(htmlReport, 'test-report.html');

    // Generate JUnit XML for CI/CD integration
    const junitReport = await this.reportGenerator.generateJUnitXML(results);
    await this.saveReportToFile(junitReport, 'test-results.xml');

    // Generate coverage report
    const coverageReport = await this.reportGenerator.generateCoverageReport(results);
    await this.saveReportToFile(coverageReport, 'coverage-report.html');

    // Upload to test reporting service (e.g., Allure, TestRail)
    if (process.env.TEST_REPORTING_SERVICE) {
      await this.uploadToTestReportingService(results);
    }
  }

  async runBasketballSpecificTests(scenario: BasketballTestScenario): Promise<TestResult> {
    switch (scenario) {
      case BasketballTestScenario.YOUTH_LEAGUE_REGISTRATION:
        return await this.runYouthRegistrationTests();
      
      case BasketballTestScenario.LIVE_GAME_SCORING:
        return await this.runLiveGameTests();
      
      case BasketballTestScenario.WEATHER_EMERGENCY:
        return await this.runWeatherEmergencyTests();
      
      case BasketballTestScenario.PAYMENT_PROCESSING:
        return await this.runPaymentProcessingTests();
      
      default:
        throw new Error(`Unsupported test scenario: ${scenario}`);
    }
  }

  private async runYouthRegistrationTests(): Promise<TestResult> {
    const testSuite = new YouthRegistrationTestSuite();
    
    const tests = [
      () => testSuite.testCOPPAComplianceFlow(),
      () => testSuite.testParentalConsentWorkflow(),
      () => testSuite.testYouthDataProtection(),
      () => testSuite.testRegistrationPaymentFlow(),
      () => testSuite.testTeamAssignmentWorkflow(),
      () => testSuite.testNotificationToParents(),
      () => testSuite.testWaiverManagement(),
      () => testSuite.testMedicalFormHandling()
    ];

    return await this.executeTestGroup('Youth Registration Tests', tests);
  }

  private async runLiveGameTests(): Promise<TestResult> {
    const testSuite = new LiveGameTestSuite();
    
    const tests = [
      () => testSuite.testRealTimeScoring(),
      () => testSuite.testWebSocketConnections(),
      () => testSuite.testScoreValidation(),
      () => testSuite.testGameStatistics(),
      () => testSuite.testLiveNotifications(),
      () => testSuite.testQuarterTransitions(),
      () => testSuite.testGameCompletion(),
      () => testSuite.testConcurrentGames()
    ];

    return await this.executeTestGroup('Live Game Tests', tests);
  }

  async scheduleRegularTestRuns(): Promise<void> {
    // Schedule daily integration tests
    cron.schedule('0 2 * * *', async () => {
      console.log('Running scheduled daily integration tests...');
      await this.runFullTestSuite({
        unitTests: { enabled: true },
        integrationTests: { enabled: true },
        e2eTests: { enabled: false },
        runSecurityTests: false,
        runPerformanceTests: false,
        stopOnFailure: false
      });
    });

    // Schedule weekly comprehensive tests
    cron.schedule('0 3 * * 0', async () => {
      console.log('Running scheduled weekly comprehensive tests...');
      await this.runFullTestSuite({
        unitTests: { enabled: true },
        integrationTests: { enabled: true },
        e2eTests: { enabled: true },
        runSecurityTests: true,
        runPerformanceTests: true,
        stopOnFailure: false
      });
    });

    // Schedule performance tests before peak usage times
    cron.schedule('0 18 * * 5', async () => {
      console.log('Running pre-weekend performance tests...');
      await this.runPerformanceTests({
        scenarios: ['registration_rush', 'live_game_scoring'],
        duration: '10m',
        users: 500
      });
    });
  }
}

interface TestSuiteConfig {
  unitTests: { enabled: boolean };
  integrationTests: { enabled: boolean };
  e2eTests: { enabled: boolean };
  runSecurityTests: boolean;
  runPerformanceTests: boolean;
  stopOnFailure: boolean;
}

interface TestSuiteResult {
  passed: boolean;
  duration: number;
  error?: string;
  results: {
    unit?: TestResult;
    integration?: TestResult;
    e2e?: TestResult;
    security?: SecurityTestResult;
    performance?: PerformanceTestResult;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    coverage: number;
  };
}
```

---

## 8. Monitoring and Observability Testing

### 8.1 Observability Integration Tests

```typescript
class ObservabilityIntegrationTests {
  private metricsCollector: MetricsCollector;
  private tracingService: TracingService;
  private logAnalyzer: LogAnalyzer;
  private alertingSystem: AlertingSystem;

  constructor() {
    this.metricsCollector = new MetricsCollector({
      prometheus: process.env.PROMETHEUS_URL,
      datadog: process.env.DATADOG_API_KEY
    });
    
    this.tracingService = new TracingService({
      jaeger: process.env.JAEGER_URL,
      datadog: process.env.DATADOG_APM_URL
    });

    this.logAnalyzer = new LogAnalyzer({
      elasticsearch: process.env.ELASTICSEARCH_URL,
      datadog: process.env.DATADOG_LOGS_URL
    });

    this.alertingSystem = new AlertingSystem({
      pagerduty: process.env.PAGERDUTY_API_KEY,
      slack: process.env.SLACK_WEBHOOK_URL
    });
  }

  @ObservabilityTest('Metrics collection and alerting')
  async testMetricsAndAlerting(): Promise<ObservabilityTestResult> {
    const testResults: ObservabilityCheck[] = [];

    // Test metrics collection
    testResults.push(await this.testMetricsCollection());
    
    // Test alerting thresholds
    testResults.push(await this.testAlertingThresholds());
    
    // Test dashboard accuracy
    testResults.push(await this.testDashboardAccuracy());

    return this.generateObservabilityTestResult('metrics_alerting', testResults);
  }

  private async testMetricsCollection(): Promise<ObservabilityCheck> {
    const testCases: ObservabilityTestCase[] = [];

    // Test API response time metrics
    testCases.push({
      name: 'API response time metrics',
      test: async () => {
        // Make API request
        const startTime = Date.now();
        await this.testClient.get('/health');
        const requestDuration = Date.now() - startTime;

        // Wait for metric collection
        await this.sleep(5000);

        // Check if metric was recorded
        const metrics = await this.metricsCollector.getMetric('http_request_duration_seconds', {
          method: 'GET',
          endpoint: '/health'
        });

        expect(metrics.length).toBeGreaterThan(0);
        expect(metrics[0].value).toBeCloseTo(requestDuration / 1000, 1);
        
        return { passed: true, details: `Metric recorded: ${metrics[0].value}s` };
      }
    });

    // Test business metrics (basketball-specific)
    testCases.push({
      name: 'Basketball business metrics',
      test: async () => {
        // Trigger registration event
        await this.createTestRegistration();
        
        // Wait for metric collection
        await this.sleep(5000);

        // Check business metrics
        const registrationMetrics = await this.metricsCollector.getMetric('registrations_total', {
          league_type: 'youth',
          age_group: 'u12'
        });

        const paymentMetrics = await this.metricsCollector.getMetric('payments_processed_total', {
          status: 'succeeded'
        });

        expect(registrationMetrics.length).toBeGreaterThan(0);
        expect(paymentMetrics.length).toBeGreaterThan(0);
        
        return { 
          passed: true, 
          details: `Registrations: ${registrationMetrics[0].value}, Payments: ${paymentMetrics[0].value}` 
        };
      }
    });

    return {
      testName: 'Metrics Collection',
      category: 'observability',
      passed: testCases.every(tc => tc.passed),
      testCases,
      issues: testCases.filter(tc => !tc.passed).map(tc => tc.error || 'Unknown error')
    };
  }

  private async testAlertingThresholds(): Promise<ObservabilityCheck> {
    const alertTests: ObservabilityTestCase[] = [];

    // Test high error rate alerting
    alertTests.push({
      name: 'High error rate alerting',
      test: async () => {
        // Generate high error rate
        const errorRequests = Array(50).fill(0).map(() => 
          this.testClient.get('/non-existent-endpoint')
        );
        
        await Promise.all(errorRequests);
        
        // Wait for alert processing
        await this.sleep(30000); // 30 seconds
        
        // Check if alert was triggered
        const alerts = await this.alertingSystem.getActiveAlerts({
          service: 'basketball-league-api',
          alertType: 'high_error_rate'
        });

        expect(alerts.length).toBeGreaterThan(0);
        
        return { 
          passed: alerts.length > 0,
          details: `${alerts.length} alerts triggered` 
        };
      }
    });

    // Test payment processing alerting
    alertTests.push({
      name: 'Payment failure rate alerting',
      test: async () => {
        // Simulate payment failures
        const failedPayments = Array(20).fill(0).map(() =>
          this.simulateFailedPayment()
        );
        
        await Promise.all(failedPayments);
        
        // Wait for alert processing
        await this.sleep(60000); // 1 minute
        
        const paymentAlerts = await this.alertingSystem.getActiveAlerts({
          service: 'payment-service',
          alertType: 'high_payment_failure_rate'
        });

        return { 
          passed: paymentAlerts.length > 0,
          details: `Payment failure alerts: ${paymentAlerts.length}` 
        };
      }
    });

    return {
      testName: 'Alerting Thresholds',
      category: 'observability',
      passed: alertTests.every(tc => tc.passed),
      testCases: alertTests,
      issues: alertTests.filter(tc => !tc.passed).map(tc => tc.error || 'Alert not triggered')
    };
  }

  @ObservabilityTest('Distributed tracing validation')
  async testDistributedTracing(): Promise<ObservabilityTestResult> {
    const tracingTests: ObservabilityCheck[] = [];

    // Test end-to-end trace collection
    tracingTests.push(await this.testEndToEndTracing());
    
    // Test trace correlation
    tracingTests.push(await this.testTraceCorrelation());
    
    // Test performance insights
    tracingTests.push(await this.testPerformanceTracing());

    return this.generateObservabilityTestResult('distributed_tracing', tracingTests);
  }

  private async testEndToEndTracing(): Promise<ObservabilityCheck> {
    const traceTests: ObservabilityTestCase[] = [];

    traceTests.push({
      name: 'Registration workflow tracing',
      test: async () => {
        // Start traced registration workflow
        const traceId = this.generateTraceId();
        
        const registrationResult = await this.testClient.post('/registrations', {
          playerId: 'test-player-123',
          leagueId: 'test-league-456',
          paymentMethodId: 'pm_test_card'
        }, {
          headers: { 'X-Trace-ID': traceId }
        });

        expect(registrationResult.status).toBe(201);
        
        // Wait for trace collection
        await this.sleep(10000);
        
        // Retrieve distributed trace
        const trace = await this.tracingService.getTrace(traceId);
        
        expect(trace).toBeDefined();
        expect(trace.spans.length).toBeGreaterThan(5); // Should have multiple service spans
        
        // Verify trace contains expected services
        const serviceNames = trace.spans.map(span => span.serviceName);
        expect(serviceNames).toContain('api-gateway');
        expect(serviceNames).toContain('user-service');
        expect(serviceNames).toContain('payment-service');
        expect(serviceNames).toContain('notification-service');
        
        return { 
          passed: trace.spans.length > 5,
          details: `Trace contains ${trace.spans.length} spans across services: ${[...new Set(serviceNames)].join(', ')}` 
        };
      }
    });

    return {
      testName: 'End-to-End Tracing',
      category: 'observability',
      passed: traceTests.every(tc => tc.passed),
      testCases: traceTests,
      issues: []
    };
  }

  @ObservabilityTest('Log aggregation and analysis')
  async testLogAggregation(): Promise<ObservabilityTestResult> {
    const logTests: ObservabilityCheck[] = [];

    // Test structured logging
    logTests.push(await this.testStructuredLogging());
    
    // Test log correlation
    logTests.push(await this.testLogCorrelation());
    
    // Test security event logging
    logTests.push(await this.testSecurityEventLogging());

    return this.generateObservabilityTestResult('log_aggregation', logTests);
  }

  private async testStructuredLogging(): Promise<ObservabilityCheck> {
    const logTests: ObservabilityTestCase[] = [];

    logTests.push({
      name: 'Structured log format validation',
      test: async () => {
        const correlationId = this.generateCorrelationId();
        
        // Trigger logged operation
        await this.testClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'wrongpassword'
        }, {
          headers: { 'X-Correlation-ID': correlationId }
        });

        // Wait for log ingestion
        await this.sleep(5000);
        
        // Query logs
        const logs = await this.logAnalyzer.searchLogs({
          correlationId,
          timeRange: { start: Date.now() - 60000, end: Date.now() },
          logLevel: 'warn'
        });

        expect(logs.length).toBeGreaterThan(0);
        
        // Validate log structure
        const logEntry = logs[0];
        expect(logEntry.timestamp).toBeDefined();
        expect(logEntry.level).toBe('warn');
        expect(logEntry.message).toContain('login failed');
        expect(logEntry.correlationId).toBe(correlationId);
        expect(logEntry.service).toBe('auth-service');
        
        return { 
          passed: true,
          details: `Found ${logs.length} structured log entries` 
        };
      }
    });

    // Test basketball-specific event logging
    logTests.push({
      name: 'Basketball event logging',
      test: async () => {
        const gameId = 'test-game-789';
        
        // Trigger game scoring event
        await this.testClient.post(`/games/${gameId}/score`, {
          team: 'home',
          points: 2,
          playerId: 'player-123',
          quarter: 1
        });

        await this.sleep(3000);
        
        // Check for basketball-specific logs
        const gameLogs = await this.logAnalyzer.searchLogs({
          gameId,
          eventType: 'score_update',
          timeRange: { start: Date.now() - 30000, end: Date.now() }
        });

        expect(gameLogs.length).toBeGreaterThan(0);
        
        const scoreLog = gameLogs[0];
        expect(scoreLog.gameId).toBe(gameId);
        expect(scoreLog.eventType).toBe('score_update');
        expect(scoreLog.metadata.points).toBe(2);
        expect(scoreLog.metadata.quarter).toBe(1);
        
        return { 
          passed: true,
          details: `Basketball event logged with metadata` 
        };
      }
    });

    return {
      testName: 'Structured Logging',
      category: 'observability',
      passed: logTests.every(tc => tc.passed),
      testCases: logTests,
      issues: []
    };
  }

  async runObservabilityHealthCheck(): Promise<ObservabilityHealthResult> {
    const healthChecks = [
      this.checkMetricsIngestion(),
      this.checkTracingIngestion(),
      this.checkLogIngestion(),
      this.checkAlertingSystem(),
      this.checkDashboardAvailability()
    ];

    const results = await Promise.allSettled(healthChecks);
    
    const healthyServices = results.filter(r => r.status === 'fulfilled').length;
    const totalServices = results.length;
    
    return {
      overall: healthyServices === totalServices ? 'healthy' : 'degraded',
      services: {
        metrics: results[0].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        tracing: results[1].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        logging: results[2].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        alerting: results[3].status === 'fulfilled' ? 'healthy' : 'unhealthy',
        dashboards: results[4].status === 'fulfilled' ? 'healthy' : 'unhealthy'
      },
      healthyServices,
      totalServices,
      issues: results
        .filter(r => r.status === 'rejected')
        .map((r, i) => ({ service: ['metrics', 'tracing', 'logging', 'alerting', 'dashboards'][i], error: r.reason }))
    };
  }

  private async checkMetricsIngestion(): Promise<void> {
    // Test metric ingestion by checking recent data
    const recentMetrics = await this.metricsCollector.getMetrics({
      timeRange: { start: Date.now() - 300000, end: Date.now() }, // Last 5 minutes
      metrics: ['http_requests_total', 'registrations_total']
    });

    if (recentMetrics.length === 0) {
      throw new Error('No recent metrics found - ingestion may be down');
    }
  }

  private async checkTracingIngestion(): Promise<void> {
    // Generate test trace
    const traceId = this.generateTraceId();
    await this.testClient.get('/health', {
      headers: { 'X-Trace-ID': traceId }
    });

    // Wait and check if trace was ingested
    await this.sleep(5000);
    const trace = await this.tracingService.getTrace(traceId);
    
    if (!trace || trace.spans.length === 0) {
      throw new Error('Test trace not found - tracing ingestion may be down');
    }
  }

  private generateObservabilityTestResult(category: string, checks: ObservabilityCheck[]): ObservabilityTestResult {
    return {
      category,
      passed: checks.every(check => check.passed),
      checks,
      totalChecks: checks.length,
      passedChecks: checks.filter(c => c.passed).length,
      failedChecks: checks.filter(c => !c.passed).length,
      issues: checks.flatMap(c => c.issues || [])
    };
  }
}

interface ObservabilityTestResult {
  category: string;
  passed: boolean;
  checks: ObservabilityCheck[];
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  issues: string[];
}

interface ObservabilityCheck {
  testName: string;
  category: string;
  passed: boolean;
  testCases: ObservabilityTestCase[];
  issues?: string[];
}

interface ObservabilityTestCase {
  name: string;
  test: () => Promise<{ passed: boolean; details?: string; error?: string }>;
  passed?: boolean;
  details?: string;
  error?: string;
}

interface ObservabilityHealthResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    metrics: 'healthy' | 'unhealthy';
    tracing: 'healthy' | 'unhealthy';  
    logging: 'healthy' | 'unhealthy';
    alerting: 'healthy' | 'unhealthy';
    dashboards: 'healthy' | 'unhealthy';
  };
  healthyServices: number;
  totalServices: number;
  issues: Array<{ service: string; error: any }>;
}
```

---

## Implementation Checklist

### Core Testing Infrastructure
- [ ] Unit testing framework setup (Jest)
- [ ] Integration testing framework implementation
- [ ] End-to-end testing setup (Playwright)
- [ ] Test data management system
- [ ] Mock service implementations

### Third-Party Service Testing
- [ ] Stripe API integration tests
- [ ] SendGrid email service tests
- [ ] Twilio SMS service tests
- [ ] Google Calendar API tests
- [ ] Weather API integration tests

### Basketball-Specific Testing
- [ ] Youth registration workflow tests
- [ ] Live game scoring tests
- [ ] Tournament management tests
- [ ] Payment processing tests
- [ ] Weather emergency tests

### Security and Compliance Testing
- [ ] COPPA compliance validation
- [ ] PCI DSS compliance tests
- [ ] Authentication security tests
- [ ] API security validation
- [ ] Penetration testing integration

### Performance Testing
- [ ] Load testing scenarios (K6)
- [ ] Registration rush simulation
- [ ] Live game scoring load tests
- [ ] Emergency notification load tests
- [ ] Calendar sync performance tests

### Automation and CI/CD
- [ ] GitHub Actions pipeline setup
- [ ] Automated test scheduling
- [ ] Test result reporting
- [ ] Failure notification system
- [ ] Performance monitoring integration

---

## Testing Metrics and KPIs

| Category | Metric | Target | Monitoring |
|----------|--------|--------|------------|
| **Test Coverage** | Unit test coverage | >85% | SonarQube/CodeCov |
| **Integration Coverage** | API endpoint coverage | >95% | Custom test reports |
| **E2E Coverage** | User journey coverage | >90% | Playwright reports |
| **Test Execution Speed** | Unit test execution | <2 minutes | CI/CD pipelines |
| **Integration Test Speed** | Integration test suite | <10 minutes | CI/CD pipelines |
| **Test Reliability** | Flaky test rate | <2% | Test result analysis |

---

**Document Status**: ✅ Complete - Ready for Implementation  
**Next Review**: Development Team Review and Tool Selection  
**Dependencies**: CI/CD Pipeline, Testing Infrastructure, Mock Services  
**Success Criteria**: 95% automated test coverage, sub-10-minute test execution