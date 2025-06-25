import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';
import { StreamingService } from './streamingService';
import { StreamTokenService } from './streamTokenService';
import { Op } from 'sequelize';

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

      console.log(`Starting video analysis for: ${videoUrl}`);

      // Get video information using fallback method (same as /api/info)
      const videoInfo = await StreamingService.getVideoInfoWithFallback(videoUrl);
      job.updateProgress(40);

      // Enhanced format filtering and processing (same logic as /api/info)
      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
      const isTikTok = videoUrl.includes('tiktok.com');

      console.log(`Processing ${isYouTube ? 'YouTube' : isTikTok ? 'TikTok' : 'other'} video with ${videoInfo.formats?.length || 0} total formats`);

      let filteredFormats = videoInfo.formats?.filter(format => {
        // Basic validation
        if (!format.ext || !format.format_id) return false;
        if (!StreamingService.isSupportedFormat(format.ext)) return false;
        return true;
      }) || [];

      job.updateProgress(60);

      // Apply platform-specific filtering
      if (isYouTube) {
        // YouTube: Enhanced filtering for better quality options
        filteredFormats = filteredFormats.filter(format => {
          // Allow video-only formats for YouTube (they can be merged with audio)
          if (format.vcodec === 'none') return false; // Skip audio-only
          if (!format.resolution) return false;

          const resolutionParts = format.resolution.split('x');
          if (resolutionParts.length < 2) return false;
          const height = parseInt(resolutionParts[1]);
          return !isNaN(height) && height >= 360; // Minimum 360p
        });
      } else {
        // TikTok and other platforms: original logic (works fine)
        filteredFormats = filteredFormats.filter(format => {
          if (format.vcodec === 'none' || format.ext !== 'mp4') return false;
          if (!format.resolution) return false;

          const resolutionParts = format.resolution.split('x');
          if (resolutionParts.length < 2) return false;
          const height = parseInt(resolutionParts[1]);
          return !isNaN(height) && height >= 360; // Minimum 360p
        });
      }

      console.log(`After filtering: ${filteredFormats.length} formats available`);

      job.updateProgress(80);

      // Sort formats intelligently (same as /api/info)
      const sortedFormats = filteredFormats.sort((a, b) => {
        // First priority: combined formats (video + audio) over video-only
        const aHasAudio = a.acodec && a.acodec !== 'none';
        const bHasAudio = b.acodec && b.acodec !== 'none';

        if (aHasAudio && !bHasAudio) return -1;
        if (!aHasAudio && bHasAudio) return 1;

        // Second priority: resolution (higher first)
        const aResolutionParts = a.resolution?.split('x') || ['0', '0'];
        const bResolutionParts = b.resolution?.split('x') || ['0', '0'];
        const aHeight = parseInt(aResolutionParts[1] || '0');
        const bHeight = parseInt(bResolutionParts[1] || '0');
        return bHeight - aHeight;
      });

      // Prepare result with enhanced format information
      const result = {
        requestId,
        videoInfo: {
          ...videoInfo,
          formats: sortedFormats.map(format => {
            const hasAudio = !!(format.acodec && format.acodec !== 'none');
            return {
              format_id: format.format_id,
              format_note: format.format_note || this.getQualityLabel(format.resolution || 'unknown', hasAudio),
              ext: format.ext,
              resolution: format.resolution,
              vcodec: format.vcodec,
              acodec: format.acodec,
              filesize: format.filesize,
              fps: format.fps,
              has_audio: hasAudio,
              quality_label: this.getQualityLabel(format.resolution || 'unknown', hasAudio)
            };
          }),
        },
        supportedFormatsCount: sortedFormats.length,
        platform: isYouTube ? 'youtube' : isTikTok ? 'tiktok' : 'other',
        total_formats: videoInfo.formats?.length || 0,
        available_formats: sortedFormats.length,
        analysisCompletedAt: new Date().toISOString(),
      };

      job.updateProgress(100);
      console.log(`Video analysis completed. Found ${result.supportedFormatsCount} supported formats.`);
      return result;

    } catch (error) {
      console.error(`Video analysis failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Helper function to generate quality labels (same as /api/info)
   */
  private static getQualityLabel(resolution: string, hasAudio: boolean): string {
    if (!resolution || resolution === 'unknown') return 'Unknown quality';

    // Handle resolution format like "1280x720" or just "720p"
    const heightMatch = resolution.match(/(\d+)(?:x(\d+))?/);
    if (!heightMatch) return 'Unknown quality';

    // If format is "1280x720", take the second number (720)
    // If format is "720p", take the first number (720)
    const height = heightMatch[2] ? parseInt(heightMatch[2]) : parseInt(heightMatch[1]);

    if (isNaN(height)) return 'Unknown quality';

    let qualityName = '';

    if (height >= 2160) qualityName = '4K';
    else if (height >= 1440) qualityName = '1440p';
    else if (height >= 1080) qualityName = '1080p';
    else if (height >= 720) qualityName = '720p';
    else if (height >= 480) qualityName = '480p';
    else if (height >= 360) qualityName = '360p';
    else if (height >= 240) qualityName = '240p';
    else qualityName = `${height}p`;

    const audioStatus = hasAudio ? 'có âm thanh' : 'không có âm thanh';
    return `${qualityName} (${audioStatus})`;
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
