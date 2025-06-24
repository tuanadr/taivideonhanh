"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("./config/database"));
const cors_1 = __importDefault(require("cors"));
// Import services
const queueService_1 = require("./services/queueService");
const performanceService_1 = require("./services/performanceService");
const redis_1 = require("./config/redis");
const subscriptionService_1 = __importDefault(require("./services/subscriptionService"));
const adminService_1 = __importDefault(require("./services/adminService"));
const legalService_1 = __importDefault(require("./services/legalService"));
// Import models to ensure they are registered
require("./models");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const streaming_1 = __importDefault(require("./routes/streaming"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const admin_1 = __importDefault(require("./routes/admin"));
const legal_1 = __importDefault(require("./routes/legal"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const health_1 = __importDefault(require("./routes/health"));
const info_1 = __importDefault(require("./routes/info"));
const download_1 = __importDefault(require("./routes/download"));
const tempDir = '/tmp';
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Webhook routes (before JSON parsing for Stripe)
app.use('/api/webhook', express_1.default.raw({ type: 'application/json' }), webhook_1.default);
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/streaming', streaming_1.default);
app.use('/api/monitoring', monitoring_1.default);
app.use('/api/subscription', subscription_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/legal', legal_1.default);
app.use('/api/analytics', analytics_1.default);
app.use('/api/health', health_1.default);
app.use('/api/info', info_1.default);
app.use('/api/download', download_1.default);
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Initialize database
        yield database_1.default.authenticate();
        console.log('Database connection has been established successfully.');
        yield database_1.default.sync(); // Sync all models
        // Initialize queue workers
        yield queueService_1.QueueService.initializeWorkers();
        console.log('Queue workers initialized successfully.');
        // Initialize default subscription plans
        yield subscriptionService_1.default.initializeDefaultPlans();
        console.log('Default subscription plans initialized.');
        // Initialize default admin user
        yield adminService_1.default.initializeDefaultAdmin();
        console.log('Default admin user initialized.');
        // Initialize default legal documents
        yield legalService_1.default.initializeDefaultLegalDocuments();
        console.log('Default legal documents initialized.');
        // Start performance monitoring
        setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            yield performanceService_1.PerformanceService.storeMetrics();
        }), 60000); // Store metrics every minute
        // Cleanup old data periodically
        setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            yield performanceService_1.PerformanceService.cleanupOldMetrics();
            yield queueService_1.QueueService.cleanupJobs();
        }), 60 * 60 * 1000); // Cleanup every hour
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    }
    catch (error) {
        console.error('Unable to start server:', error);
        process.exit(1);
    }
});
// Graceful shutdown handling
const gracefulShutdown = (signal) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Received ${signal}. Starting graceful shutdown...`);
    try {
        // Close queue workers and connections
        yield queueService_1.QueueService.shutdown();
        // Close Redis connections
        yield (0, redis_1.closeRedisConnections)();
        // Close database connection
        yield database_1.default.close();
        console.log('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        console.error('Error during graceful shutdown:', error);
        process.exit(1);
    }
});
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
