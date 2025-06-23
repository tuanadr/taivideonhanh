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
const child_process_1 = require("child_process");
const content_disposition_1 = __importDefault(require("content-disposition"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
// Import services
const queueService_1 = require("./services/queueService");
const performanceService_1 = require("./services/performanceService");
const redis_1 = require("./config/redis");
// Import models to ensure they are registered
require("./models");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const streaming_1 = __importDefault(require("./routes/streaming"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const tempDir = '/tmp';
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/streaming', streaming_1.default);
app.use('/api/monitoring', monitoring_1.default);
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
app.post('/api/info', (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).send({ error: 'URL is required' });
    }
    const ytdlp = (0, child_process_1.spawn)('yt-dlp', ['--dump-json', url]);
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
                formats: info.formats.map((f) => ({
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
        }
        catch (parseError) {
            console.error('Error parsing yt-dlp output:', parseError);
            res.status(500).send({ error: 'Failed to parse video info' });
        }
    });
});
app.post('/api/download', (req, res) => {
    const { url, format_id, title, ext } = req.body;
    if (!url || !format_id) {
        return res.status(400).send({ error: 'URL and format_id are required' });
    }
    const fileName = title ? `${title}.${ext || 'mp4'}` : 'video.mp4';
    const tempFileName = `${(0, uuid_1.v4)()}.mp4`;
    const tempFilePath = path_1.default.join(tempDir, tempFileName);
    const formatSelection = `${format_id}+bestaudio/best`;
    const args = ['-f', formatSelection, '--merge-output-format', 'mp4', '-o', tempFilePath, url, '--verbose'];
    console.log(`Running yt-dlp with args: ${args.join(' ')}`);
    const ytdlp = (0, child_process_1.spawn)('yt-dlp', args);
    let errorData = '';
    ytdlp.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`yt-dlp stderr: ${data}`);
    });
    ytdlp.on('close', (code) => {
        console.log(`yt-dlp process exited with code ${code}.`);
        if (code !== 0) {
            console.error(`yt-dlp failed. Stderr: ${errorData}`);
            if (fs_1.default.existsSync(tempFilePath)) {
                fs_1.default.unlinkSync(tempFilePath);
            }
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download process failed', details: errorData });
            }
            return;
        }
        if (fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.readFile(tempFilePath, (err, data) => {
                if (err) {
                    console.error('Error reading temp file:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to read downloaded file' });
                    }
                    fs_1.default.unlinkSync(tempFilePath); // Clean up
                    return;
                }
                res.setHeader('Content-Disposition', (0, content_disposition_1.default)(fileName));
                res.setHeader('Content-Type', 'application/octet-stream');
                res.setHeader('Content-Length', data.length);
                res.send(data);
                fs_1.default.unlink(tempFilePath, (unlinkErr) => {
                    if (unlinkErr)
                        console.error('Error deleting temp file:', unlinkErr);
                    else
                        console.log('Temp file deleted successfully.');
                });
            });
        }
        else {
            if (!res.headersSent) {
                res.status(500).json({ error: 'Downloaded file not found' });
            }
        }
    });
    ytdlp.on('error', (err) => {
        console.error('Failed to start yt-dlp process:', err);
        if (fs_1.default.existsSync(tempFilePath)) {
            fs_1.default.unlinkSync(tempFilePath);
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start download process', details: err.message });
        }
    });
});
