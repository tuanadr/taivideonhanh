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
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRedisConnections = exports.checkRedisHealth = exports.redisPublisher = exports.redisSubscriber = exports.redis = void 0;
const ioredis_1 = require("ioredis");
// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true,
};
// Create Redis instances
exports.redis = new ioredis_1.Redis(redisConfig);
exports.redisSubscriber = new ioredis_1.Redis(redisConfig);
exports.redisPublisher = new ioredis_1.Redis(redisConfig);
// Connection event handlers
exports.redis.on('connect', () => {
    console.log('Redis connected successfully');
});
exports.redis.on('error', (error) => {
    console.error('Redis connection error:', error);
});
exports.redis.on('ready', () => {
    console.log('Redis is ready');
});
exports.redis.on('close', () => {
    console.log('Redis connection closed');
});
// Health check function
const checkRedisHealth = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.redis.ping();
        return true;
    }
    catch (error) {
        console.error('Redis health check failed:', error);
        return false;
    }
});
exports.checkRedisHealth = checkRedisHealth;
// Graceful shutdown
const closeRedisConnections = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Promise.all([
            exports.redis.disconnect(),
            exports.redisSubscriber.disconnect(),
            exports.redisPublisher.disconnect(),
        ]);
        console.log('All Redis connections closed');
    }
    catch (error) {
        console.error('Error closing Redis connections:', error);
    }
});
exports.closeRedisConnections = closeRedisConnections;
exports.default = exports.redis;
