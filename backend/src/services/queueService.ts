import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';
import { StreamingService } from './streamingService';
import { StreamTokenService } from './streamTokenService';

// Job data interfaces
interface VideoAnalysisJobData {
  videoUrl: string;
  userId: string;
  requestId: string;
}

interface StreamingJobData {
  streamToken: string;
  videoUrl: string;
  formatId: string;
  userId: string;
  title?: string;
  userAgent?: string;
  referer?: string;
}

interface StreamingJobResult {
  success: boolean;
  bytesStreamed?: number;
  duration?: number;
  error?: string;
}

// Queue configuration
const queueConfig = {
  connection: redis,
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
  // Queue instances
  public static videoAnalysisQueue = new Queue('video-analysis', queueConfig);
  public static streamingQueue = new Queue('video-streaming', {
    ...queueConfig,
    defaultJobOptions: {
      ...queueConfig.defaultJobOptions,
      attempts: 1, // Streaming jobs should not retry
      removeOnComplete: 5,
    },
  });

  // Queue events
  public static videoAnalysisEvents = new QueueEvents('video-analysis', { connection: redis });
  public static streamingEvents = new QueueEvents('video-streaming', { connection: redis });

  // Workers
  private static videoAnalysisWorker: Worker | null = null;
  private static streamingWorker: Worker | null = null;

  /**
   * Initialize all workers
   */
  public static async initializeWorkers(): Promise<void> {
    // Video analysis worker
    this.videoAnalysisWorker = new Worker(
      'video-analysis',
      async (job: Job<VideoAnalysisJobData>) => {
        return this.processVideoAnalysis(job);
      },
      {
        connection: redis,
        concurrency: 5, // Process up to 5 analysis jobs concurrently
        limiter: {
          max: 10,
          duration: 60000, // 10 jobs per minute
        },
      }
    );

    // Streaming worker
    this.streamingWorker = new Worker(
      'video-streaming',
      async (job: Job<StreamingJobData>) => {
        return this.processStreaming(job);
      },
      {
        connection: redis,
        concurrency: 3, // Process up to 3 streaming jobs concurrently
        limiter: {
          max: 5,
          duration: 60000, // 5 streaming jobs per minute
        },
      }
    );

    // Set up event listeners
    this.setupEventListeners();

    console.log('Queue workers initialized successfully');
  }

  /**
   * Process video analysis job
   */
  private static async processVideoAnalysis(job: Job<VideoAnalysisJobData>): Promise<any> {
    const { videoUrl, userId, requestId } = job.data;

    try {
      job.updateProgress(10);

      // Get video information
      const videoInfo = await StreamingService.getVideoInfo(videoUrl);
      job.updateProgress(50);

      // Filter supported formats
      const supportedFormats = videoInfo.formats.filter(format => 
        format.ext && StreamingService.isSupportedFormat(format.ext)
      );

      job.updateProgress(80);

      // Prepare result
      const result = {
        requestId,
        videoInfo: {
          ...videoInfo,
          formats: supportedFormats,
        },
        supportedFormatsCount: supportedFormats.length,
        analysisCompletedAt: new Date().toISOString(),
      };

      job.updateProgress(100);
      return result;

    } catch (error) {
      console.error(`Video analysis failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Process streaming job (placeholder - actual streaming happens in real-time)
   */
  private static async processStreaming(job: Job<StreamingJobData>): Promise<StreamingJobResult> {
    const { streamToken, videoUrl, formatId, userId } = job.data;

    try {
      job.updateProgress(10);

      // Validate stream token
      const validation = await StreamTokenService.validateStreamToken({ token: streamToken });
      if (!validation.isValid) {
        throw new Error(`Invalid stream token: ${validation.error}`);
      }

      job.updateProgress(30);

      // Get video info to validate format
      const videoInfo = await StreamingService.getVideoInfo(videoUrl);
      const selectedFormat = videoInfo.formats.find(f => f.format_id === formatId);
      
      if (!selectedFormat) {
        throw new Error(`Format ${formatId} not found`);
      }

      job.updateProgress(50);

      // Mark token as used (streaming will happen in real-time via API)
      await validation.streamToken!.markAsUsed();

      job.updateProgress(100);

      return {
        success: true,
        duration: 0, // Will be updated by actual streaming
      };

    } catch (error) {
      console.error(`Streaming job failed for job ${job.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add video analysis job
   */
  public static async addVideoAnalysisJob(data: VideoAnalysisJobData): Promise<Job<VideoAnalysisJobData>> {
    return this.videoAnalysisQueue.add('analyze-video', data, {
      priority: 1,
      delay: 0,
      jobId: `analysis-${data.requestId}`,
    });
  }

  /**
   * Add streaming job
   */
  public static async addStreamingJob(data: StreamingJobData): Promise<Job<StreamingJobData>> {
    return this.streamingQueue.add('stream-video', data, {
      priority: 2, // Higher priority than analysis
      delay: 0,
      jobId: `stream-${data.streamToken}`,
    });
  }

  /**
   * Get job status
   */
  public static async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = queueName === 'video-analysis' ? this.videoAnalysisQueue : this.streamingQueue;
    const job = await queue.getJob(jobId);
    
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
  }

  /**
   * Get queue statistics
   */
  public static async getQueueStats(): Promise<{
    videoAnalysis: any;
    streaming: any;
  }> {
    const [videoAnalysisStats, streamingStats] = await Promise.all([
      this.videoAnalysisQueue.getJobCounts(),
      this.streamingQueue.getJobCounts(),
    ]);

    return {
      videoAnalysis: videoAnalysisStats,
      streaming: streamingStats,
    };
  }

  /**
   * Setup event listeners for monitoring
   */
  private static setupEventListeners(): void {
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
  public static async cleanupJobs(): Promise<void> {
    try {
      await Promise.all([
        this.videoAnalysisQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'), // Clean completed jobs older than 24h
        this.videoAnalysisQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed'), // Clean failed jobs older than 7 days
        this.streamingQueue.clean(1 * 60 * 60 * 1000, 50, 'completed'), // Clean completed streaming jobs older than 1h
        this.streamingQueue.clean(24 * 60 * 60 * 1000, 100, 'failed'), // Clean failed streaming jobs older than 24h
      ]);
      console.log('Queue cleanup completed');
    } catch (error) {
      console.error('Queue cleanup failed:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  public static async shutdown(): Promise<void> {
    try {
      await Promise.all([
        this.videoAnalysisWorker?.close(),
        this.streamingWorker?.close(),
        this.videoAnalysisQueue.close(),
        this.streamingQueue.close(),
        this.videoAnalysisEvents.close(),
        this.streamingEvents.close(),
      ]);
      console.log('Queue service shutdown completed');
    } catch (error) {
      console.error('Queue service shutdown error:', error);
    }
  }
}

export default QueueService;
export { QueueService, VideoAnalysisJobData, StreamingJobData, StreamingJobResult };
