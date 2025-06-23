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

// Import models to ensure they are registered
import './models';

// Import routes
import authRoutes from './routes/auth';
import streamingRoutes from './routes/streaming';
import monitoringRoutes from './routes/monitoring';

const tempDir = '/tmp';

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/streaming', streamingRoutes);
app.use('/api/monitoring', monitoringRoutes);

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



app.post('/api/info', (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).send({ error: 'URL is required' });
  }

  const ytdlp = spawn('yt-dlp', ['--dump-json', url]);

  let jsonData = '';
  let errorData = '';

  ytdlp.stdout.on('data', (data) => {
    jsonData += data.toString();
  });

  ytdlp.stderr.on('data', (data) => {
    errorData += data.toString();
  });

  ytdlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      console.error(`stderr: ${errorData}`);
      return res.status(500).send({ error: 'Failed to fetch video info', details: errorData });
    }

    try {
      const info = JSON.parse(jsonData);
      res.send({
        title: info.title,
        thumbnail: info.thumbnail,
        formats: info.formats.map((f: any) => ({
          format_id: f.format_id,
          resolution: f.resolution || null,
          ext: f.ext,
          fps: f.fps,
          acodec: f.acodec,
          vcodec: f.vcodec,
          filesize: f.filesize,
          format_note: f.format_note
        })),
      });
    } catch (parseError) {
      console.error('Error parsing yt-dlp output:', parseError);
      res.status(500).send({ error: 'Failed to parse video info' });
    }
  });
});

app.post('/api/download', (req: Request, res: Response) => {
  const { url, format_id, title, ext } = req.body;

  if (!url || !format_id) {
    return res.status(400).send({ error: 'URL and format_id are required' });
  }

  const fileName = title ? `${title}.${ext || 'mp4'}` : 'video.mp4';
  const tempFileName = `${uuidv4()}.mp4`;
  const tempFilePath = path.join(tempDir, tempFileName);

  const formatSelection = `${format_id}+bestaudio/best`;
  const args = ['-f', formatSelection, '--merge-output-format', 'mp4', '-o', tempFilePath, url, '--verbose'];
  console.log(`Running yt-dlp with args: ${args.join(' ')}`);

  const ytdlp = spawn('yt-dlp', args);

  let errorData = '';
  ytdlp.stderr.on('data', (data) => {
    errorData += data.toString();
    console.error(`yt-dlp stderr: ${data}`);
  });

  ytdlp.on('close', (code) => {
    console.log(`yt-dlp process exited with code ${code}.`);
    if (code !== 0) {
      console.error(`yt-dlp failed. Stderr: ${errorData}`);
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Download process failed', details: errorData });
      }
      return;
    }

    if (fs.existsSync(tempFilePath)) {
      fs.readFile(tempFilePath, (err, data) => {
        if (err) {
          console.error('Error reading temp file:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to read downloaded file' });
          }
          fs.unlinkSync(tempFilePath); // Clean up
          return;
        }

        res.setHeader('Content-Disposition', contentDisposition(fileName));
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', data.length);
        res.send(data);

        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
          else console.log('Temp file deleted successfully.');
        });
      });
    } else {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Downloaded file not found' });
      }
    }
  });

  ytdlp.on('error', (err) => {
    console.error('Failed to start yt-dlp process:', err);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to start download process', details: err.message });
    }
  });


});