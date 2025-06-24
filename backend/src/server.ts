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

app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});

const startServer = async () => {
  try {
    // Initialize database
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    await sequelize.sync(); // Sync all models

    // Initialize queue workers
    await QueueService.initializeWorkers();
    console.log('Queue workers initialized successfully.');

    // Initialize default subscription plans
    await SubscriptionService.initializeDefaultPlans();
    console.log('Default subscription plans initialized.');

    // Initialize default admin user
    await AdminService.initializeDefaultAdmin();
    console.log('Default admin user initialized.');

    // Initialize default legal documents
    await LegalService.initializeDefaultLegalDocuments();
    console.log('Default legal documents initialized.');

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
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close queue workers and connections
    await QueueService.shutdown();

    // Close Redis connections
    await closeRedisConnections();

    // Close database connection
    await sequelize.close();

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
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