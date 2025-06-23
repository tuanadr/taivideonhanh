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
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../config/redis");
const streamingService_1 = require("./streamingService");
const streamTokenService_1 = require("./streamTokenService");
// Queue configuration
const queueConfig = {
    connection: redis_1.redis,
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
};
class QueueService {
    /**
     * Initialize all workers
     */
    static initializeWorkers() {
        return __awaiter(this, void 0, void 0, function* () {
            // Video analysis worker
            this.videoAnalysisWorker = new bullmq_1.Worker('video-analysis', (job) => __awaiter(this, void 0, void 0, function* () {
                return this.processVideoAnalysis(job);
            }), {
                connection: redis_1.redis,
                concurrency: 5, // Process up to 5 analysis jobs concurrently
                limiter: {
                    max: 10,
                    duration: 60000, // 10 jobs per minute
                },
            });
            // Streaming worker
            this.streamingWorker = new bullmq_1.Worker('video-streaming', (job) => __awaiter(this, void 0, void 0, function* () {
                return this.processStreaming(job);
            }), {
                connection: redis_1.redis,
                concurrency: 3, // Process up to 3 streaming jobs concurrently
                limiter: {
                    max: 5,
                    duration: 60000, // 5 streaming jobs per minute
                },
            });
            // Set up event listeners
            this.setupEventListeners();
            console.log('Queue workers initialized successfully');
        });
    }
    /**
     * Process video analysis job
     */
    static processVideoAnalysis(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { videoUrl, userId, requestId } = job.data;
            try {
                job.updateProgress(10);
                // Get video information
                const videoInfo = yield streamingService_1.StreamingService.getVideoInfo(videoUrl);
                job.updateProgress(50);
                // Filter supported formats
                const supportedFormats = videoInfo.formats.filter(format => format.ext && streamingService_1.StreamingService.isSupportedFormat(format.ext));
                job.updateProgress(80);
                // Prepare result
                const result = {
                    requestId,
                    videoInfo: Object.assign(Object.assign({}, videoInfo), { formats: supportedFormats }),
                    supportedFormatsCount: supportedFormats.length,
                    analysisCompletedAt: new Date().toISOString(),
                };
                job.updateProgress(100);
                return result;
            }
            catch (error) {
                console.error(`Video analysis failed for job ${job.id}:`, error);
                throw error;
            }
        });
    }
    /**
     * Process streaming job (placeholder - actual streaming happens in real-time)
     */
    static processStreaming(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { streamToken, videoUrl, formatId, userId } = job.data;
            try {
                job.updateProgress(10);
                // Validate stream token
                const validation = yield streamTokenService_1.StreamTokenService.validateStreamToken({ token: streamToken });
                if (!validation.isValid) {
                    throw new Error(`Invalid stream token: ${validation.error}`);
                }
                job.updateProgress(30);
                // Get video info to validate format
                const videoInfo = yield streamingService_1.StreamingService.getVideoInfo(videoUrl);
                const selectedFormat = videoInfo.formats.find(f => f.format_id === formatId);
                if (!selectedFormat) {
                    throw new Error(`Format ${formatId} not found`);
                }
                job.updateProgress(50);
                // Mark token as used (streaming will happen in real-time via API)
                yield validation.streamToken.markAsUsed();
                job.updateProgress(100);
                return {
                    success: true,
                    duration: 0, // Will be updated by actual streaming
                };
            }
            catch (error) {
                console.error(`Streaming job failed for job ${job.id}:`, error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    /**
     * Add video analysis job
     */
    static addVideoAnalysisJob(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.videoAnalysisQueue.add('analyze-video', data, {
                priority: 1,
                delay: 0,
                jobId: `analysis-${data.requestId}`,
            });
        });
    }
    /**
     * Add streaming job
     */
    static addStreamingJob(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.streamingQueue.add('stream-video', data, {
                priority: 2, // Higher priority than analysis
                delay: 0,
                jobId: `stream-${data.streamToken}`,
            });
        });
    }
    /**
     * Get job status
     */
    static getJobStatus(queueName, jobId) {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = queueName === 'video-analysis' ? this.videoAnalysisQueue : this.streamingQueue;
            const job = yield queue.getJob(jobId);
            if (!job) {
                return null;
            }
            return {
                id: job.id,
                name: job.name,
                data: job.data,
                progress: job.progress,
                returnvalue: job.returnvalue,
                failedReason: job.failedReason,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
                opts: job.opts,
            };
        });
    }
    /**
     * Get queue statistics
     */
    static getQueueStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const [videoAnalysisStats, streamingStats] = yield Promise.all([
                this.videoAnalysisQueue.getJobCounts(),
                this.streamingQueue.getJobCounts(),
            ]);
            return {
                videoAnalysis: videoAnalysisStats,
                streaming: streamingStats,
            };
        });
    }
    /**
     * Setup event listeners for monitoring
     */
    static setupEventListeners() {
        // Video analysis events
        this.videoAnalysisEvents.on('completed', (jobId, result) => {
            console.log(`Video analysis job ${jobId} completed:`, result);
        });
        this.videoAnalysisEvents.on('failed', (jobId, error) => {
            console.error(`Video analysis job ${jobId} failed:`, error);
        });
        this.videoAnalysisEvents.on('progress', (jobId, progress) => {
            console.log(`Video analysis job ${jobId} progress: ${progress}%`);
        });
        // Streaming events
        this.streamingEvents.on('completed', (jobId, result) => {
            console.log(`Streaming job ${jobId} completed:`, result);
        });
        this.streamingEvents.on('failed', (jobId, error) => {
            console.error(`Streaming job ${jobId} failed:`, error);
        });
        this.streamingEvents.on('progress', (jobId, progress) => {
            console.log(`Streaming job ${jobId} progress: ${progress}%`);
        });
    }
    /**
     * Clean up old jobs
     */
    static cleanupJobs() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield Promise.all([
                    this.videoAnalysisQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'), // Clean completed jobs older than 24h
                    this.videoAnalysisQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed'), // Clean failed jobs older than 7 days
                    this.streamingQueue.clean(1 * 60 * 60 * 1000, 50, 'completed'), // Clean completed streaming jobs older than 1h
                    this.streamingQueue.clean(24 * 60 * 60 * 1000, 100, 'failed'), // Clean failed streaming jobs older than 24h
                ]);
                console.log('Queue cleanup completed');
            }
            catch (error) {
                console.error('Queue cleanup failed:', error);
            }
        });
    }
    /**
     * Graceful shutdown
     */
    static shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield Promise.all([
                    (_a = this.videoAnalysisWorker) === null || _a === void 0 ? void 0 : _a.close(),
                    (_b = this.streamingWorker) === null || _b === void 0 ? void 0 : _b.close(),
                    this.videoAnalysisQueue.close(),
                    this.streamingQueue.close(),
                    this.videoAnalysisEvents.close(),
                    this.streamingEvents.close(),
                ]);
                console.log('Queue service shutdown completed');
            }
            catch (error) {
                console.error('Queue service shutdown error:', error);
            }
        });
    }
}
exports.QueueService = QueueService;
// Queue instances
QueueService.videoAnalysisQueue = new bullmq_1.Queue('video-analysis', queueConfig);
QueueService.streamingQueue = new bullmq_1.Queue('video-streaming', Object.assign(Object.assign({}, queueConfig), { defaultJobOptions: Object.assign(Object.assign({}, queueConfig.defaultJobOptions), { attempts: 1, removeOnComplete: 5 }) }));
// Queue events
QueueService.videoAnalysisEvents = new bullmq_1.QueueEvents('video-analysis', { connection: redis_1.redis });
QueueService.streamingEvents = new bullmq_1.QueueEvents('video-streaming', { connection: redis_1.redis });
// Workers
QueueService.videoAnalysisWorker = null;
QueueService.streamingWorker = null;
exports.default = QueueService;
