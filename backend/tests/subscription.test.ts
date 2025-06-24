import request from 'supertest';
import express from 'express';
import subscriptionRoutes from '../src/routes/subscription';
import authRoutes from '../src/routes/auth';
import { User, SubscriptionPlan } from '../src/models';
import SubscriptionService from '../src/services/subscriptionService';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);

describe('Subscription System', () => {
  let userToken: string;
  let userId: string;
  let planId: string;

  beforeEach(async () => {
    // Initialize default plans
    await SubscriptionService.initializeDefaultPlans();
    
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    userToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;

    // Get a plan ID
    const plans = await SubscriptionService.getAvailablePlans();
    planId = plans.find(p => p.name === 'Pro')?.id || plans[0]?.id;
  });

  describe('GET /api/subscription/plans', () => {
    it('should get all subscription plans', async () => {
      const response = await request(app)
        .get('/api/subscription/plans')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Subscription plans retrieved successfully');
      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBe(true);
      expect(response.body.plans.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/subscription/current', () => {
    it('should get current subscription for authenticated user', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('subscription');
      expect(response.body).toHaveProperty('limits');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('POST /api/subscription/test-payment', () => {
    it('should create test payment in development', async () => {
      // Skip if not in development
      if (process.env.NODE_ENV === 'production') {
        return;
      }

      const response = await request(app)
        .post('/api/subscription/test-payment')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          planId,
          paymentMethod: 'test',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Test payment created successfully');
      expect(response.body).toHaveProperty('payment');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscription/test-payment')
        .send({
          planId,
          paymentMethod: 'test',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('GET /api/subscription/limits', () => {
    it('should get subscription limits for authenticated user', async () => {
      const response = await request(app)
        .get('/api/subscription/limits')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Subscription limits retrieved successfully');
      expect(response.body).toHaveProperty('limits');
      expect(response.body.limits).toHaveProperty('maxDownloadsPerDay');
      expect(response.body.limits).toHaveProperty('maxConcurrentStreams');
      expect(response.body.limits).toHaveProperty('maxQuality');
      expect(response.body.limits).toHaveProperty('features');
    });
  });

  describe('GET /api/subscription/payments', () => {
    it('should get payment history for authenticated user', async () => {
      const response = await request(app)
        .get('/api/subscription/payments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Payment history retrieved successfully');
      expect(response.body).toHaveProperty('payments');
      expect(Array.isArray(response.body.payments)).toBe(true);
    });
  });

  describe('Subscription Service', () => {
    it('should get available plans', async () => {
      const plans = await SubscriptionService.getAvailablePlans();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });

    it('should get user subscription limits', async () => {
      const limits = await SubscriptionService.getUserSubscriptionLimits(userId);
      expect(limits).toHaveProperty('maxDownloadsPerDay');
      expect(limits).toHaveProperty('maxConcurrentStreams');
      expect(limits).toHaveProperty('maxQuality');
      expect(limits).toHaveProperty('features');
    });

    it('should check user action permissions', async () => {
      const canDownloadHD = await SubscriptionService.canUserPerformAction(userId, 'download_hd');
      expect(typeof canDownloadHD).toBe('boolean');
    });
  });
});
