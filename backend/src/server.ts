import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import sequelize from './config/database';
import cors from 'cors';
import { exec, spawn } from 'child_process';
import contentDisposition from 'content-disposition';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import services
import { QueueService } from './services/queueService';
import { PerformanceService } from './services/performanceService';
import { closeRedisConnections } from './config/redis';
import SubscriptionService from './services/subscriptionService';
import AdminService from './services/adminService';
import LegalService from './services/legalService';
import CookieService from './services/cookieService';

// Import models to ensure they are registered
import './models';

// Import routes
import authRoutes from './routes/auth';
import streamingRoutes from './routes/streaming';
import monitoringRoutes from './routes/monitoring';
import subscriptionRoutes from './routes/subscription';
import webhookRoutes from './routes/webhook';
import adminRoutes from './routes/admin';
import legalRoutes from './routes/legal';
import analyticsRoutes from './routes/analytics';
import healthRoutes from './routes/health';
import infoRoutes from './routes/info';
import downloadRoutes from './routes/download';

const tempDir = '/tmp';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Webhook routes (before JSON parsing for Stripe)
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streaming', streamingRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/download', downloadRoutes);

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/auth',
      '/api/streaming',
      '/api/info',
      '/api/download',
      '/api/health'
    ]
  });
});

// Debug endpoint to check download route
app.get('/api/download/test', (req: Request, res: Response) => {
  res.json({
    message: 'Download endpoint is accessible',
    method: 'GET',
    timestamp: new Date().toISOString()
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Starting taivideonhanh backend server...');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Port: ${port}`);

    // Initialize database
    console.log('🗄️  Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    await sequelize.sync(); // Sync all models

    // Initialize queue workers
    console.log('📦 Initializing queue workers...');
    await QueueService.initializeWorkers();
    console.log('✅ Queue workers initialized successfully.');

    // Initialize default subscription plans
    console.log('💳 Initializing subscription plans...');
    await SubscriptionService.initializeDefaultPlans();
    console.log('✅ Default subscription plans initialized.');

    // Initialize default admin user
    console.log('👤 Initializing admin user...');
    await AdminService.initializeDefaultAdmin();
    console.log('✅ Default admin user initialized.');

    // Initialize default legal documents
    console.log('📄 Initializing legal documents...');
    await LegalService.initializeDefaultLegalDocuments();
    console.log('✅ Default legal documents initialized.');

    // Initialize cookie directories
    console.log('🍪 Initializing cookie directories...');
    await CookieService.initializeDirectories();
    console.log('✅ Cookie directories initialized.');

    // Start performance monitoring
    setInterval(async () => {
      await PerformanceService.storeMetrics();
    }, 60000); // Store metrics every minute

    // Cleanup old data periodically
    setInterval(async () => {
      await PerformanceService.cleanupOldMetrics();
      await QueueService.cleanupJobs();
    }, 60 * 60 * 1000); // Cleanup every hour

    app.listen(port, () => {
      console.log('🎉 Server startup completed successfully!');
      console.log(`🌐 Server is running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/api/health`);
      console.log(`🔐 Admin login: http://localhost:${port}/api/admin/login`);
      console.log(`💰 Subscription plans: http://localhost:${port}/api/subscription/plans`);

      // Log configuration status
      console.log('\n📋 Configuration Status:');
      console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Missing'}`);
      console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅ Configured' : '⚠️  Not configured'}`);
      console.log(`   Cookie Auth: ${process.env.ENABLE_COOKIE_AUTH === 'true' ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Admin Email: ${process.env.DEFAULT_ADMIN_EMAIL || '❌ Not set'}`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`🔄 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Set a timeout for graceful shutdown
    const shutdownTimeout = setTimeout(() => {
      console.error('⚠️  Graceful shutdown timeout. Forcing exit...');
      process.exit(1);
    }, 30000); // 30 seconds timeout

    // Close queue workers and connections
    console.log('📦 Shutting down queue workers...');
    await QueueService.shutdown();

    // Close Redis connections
    console.log('🔴 Closing Redis connections...');
    await closeRedisConnections();

    // Close database connection
    console.log('🗄️  Closing database connection...');
    await sequelize.close();

    clearTimeout(shutdownTimeout);
    console.log('✅ Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();