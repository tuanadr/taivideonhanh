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
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const streamingService_1 = require("../services/streamingService");
const router = (0, express_1.Router)();
/**
 * Helper function to generate quality labels
 */
function getQualityLabel(resolution, hasAudio) {
    if (!resolution || resolution === 'unknown')
        return 'Unknown quality';
    // Handle resolution format like "1280x720" or just "720p"
    const heightMatch = resolution.match(/(\d+)(?:x(\d+))?/);
    if (!heightMatch)
        return 'Unknown quality';
    // If format is "1280x720", take the second number (720)
    // If format is "720p", take the first number (720)
    const height = heightMatch[2] ? parseInt(heightMatch[2]) : parseInt(heightMatch[1]);
    if (isNaN(height))
        return 'Unknown quality';
    let qualityName = '';
    if (height >= 2160)
        qualityName = '4K';
    else if (height >= 1440)
        qualityName = '1440p';
    else if (height >= 1080)
        qualityName = '1080p';
    else if (height >= 720)
        qualityName = '720p';
    else if (height >= 480)
        qualityName = '480p';
    else if (height >= 360)
        qualityName = '360p';
    else if (height >= 240)
        qualityName = '240p';
    else
        qualityName = `${height}p`;
    const audioStatus = hasAudio ? 'có âm thanh' : 'không có âm thanh';
    return `${qualityName} (${audioStatus})`;
}
/**
 * Validation middleware
 */
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};
/**
 * Validation for video info request
 */
const videoInfoValidation = [
    (0, express_validator_1.body)('url')
        .isURL()
        .withMessage('Valid URL is required')
        .custom((value) => {
        // Basic validation for supported platforms
        const supportedDomains = [
            'youtube.com',
            'youtu.be',
            'vimeo.com',
            'dailymotion.com',
            'twitch.tv',
            'facebook.com',
            'instagram.com',
            'tiktok.com'
        ];
        const url = new URL(value);
        const isSupported = supportedDomains.some(domain => url.hostname.includes(domain));
        if (!isSupported) {
            throw new Error('URL from unsupported platform');
        }
        return true;
    }),
];
/**
 * POST /api/info
 * Get video information and available formats
 */
router.post('/', auth_1.authenticate, videoInfoValidation, validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { url } = req.body;
        console.log('Getting video info for URL:', url);
        // Get video information using StreamingService with fallback
        const videoInfo = yield streamingService_1.StreamingService.getVideoInfoWithFallback(url);
        // Enhanced format filtering and processing
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isTikTok = url.includes('tiktok.com');
        console.log(`Processing ${isYouTube ? 'YouTube' : isTikTok ? 'TikTok' : 'other'} video with ${((_a = videoInfo.formats) === null || _a === void 0 ? void 0 : _a.length) || 0} total formats`);
        // Filter and process formats based on platform
        let filteredFormats = videoInfo.formats || [];
        if (isYouTube) {
            // YouTube-specific filtering: more permissive to handle DASH streams
            filteredFormats = filteredFormats.filter(format => {
                // Must have video codec (not audio-only)
                if (!format.vcodec || format.vcodec === 'none')
                    return false;
                // Accept multiple extensions for YouTube
                const supportedExts = ['mp4', 'webm', 'mkv'];
                if (!supportedExts.includes(format.ext))
                    return false;
                // Must have resolution info
                if (!format.resolution)
                    return false;
                // Lower minimum resolution for more options
                const resolutionParts = format.resolution.split('x');
                if (resolutionParts.length < 2)
                    return false;
                const height = parseInt(resolutionParts[1]);
                return !isNaN(height) && height >= 240; // Minimum 240p
            });
        }
        else {
            // TikTok and other platforms: original logic (works fine)
            filteredFormats = filteredFormats.filter(format => {
                if (format.vcodec === 'none' || format.ext !== 'mp4')
                    return false;
                if (!format.resolution)
                    return false;
                const resolutionParts = format.resolution.split('x');
                if (resolutionParts.length < 2)
                    return false;
                const height = parseInt(resolutionParts[1]);
                return !isNaN(height) && height >= 360; // Minimum 360p
            });
        }
        console.log(`After filtering: ${filteredFormats.length} formats available`);
        // Sort formats intelligently
        const sortedFormats = filteredFormats.sort((a, b) => {
            var _a, _b;
            // First priority: combined formats (video + audio) over video-only
            const aHasAudio = a.acodec && a.acodec !== 'none';
            const bHasAudio = b.acodec && b.acodec !== 'none';
            if (aHasAudio && !bHasAudio)
                return -1;
            if (!aHasAudio && bHasAudio)
                return 1;
            // Second priority: resolution (higher first)
            const aResolutionParts = ((_a = a.resolution) === null || _a === void 0 ? void 0 : _a.split('x')) || ['0', '0'];
            const bResolutionParts = ((_b = b.resolution) === null || _b === void 0 ? void 0 : _b.split('x')) || ['0', '0'];
            const aHeight = parseInt(aResolutionParts[1] || '0');
            const bHeight = parseInt(bResolutionParts[1] || '0');
            return bHeight - aHeight;
        });
        // Format response with enhanced information
        const response = {
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            uploader: videoInfo.uploader,
            upload_date: videoInfo.upload_date,
            platform: isYouTube ? 'youtube' : isTikTok ? 'tiktok' : 'other',
            total_formats: ((_b = videoInfo.formats) === null || _b === void 0 ? void 0 : _b.length) || 0,
            available_formats: sortedFormats.length,
            formats: sortedFormats.map(format => {
                const hasAudio = !!(format.acodec && format.acodec !== 'none');
                const quality = getQualityLabel(format.resolution || 'unknown', hasAudio);
                return {
                    format_id: format.format_id,
                    format_note: format.format_note || quality,
                    ext: format.ext,
                    resolution: format.resolution,
                    vcodec: format.vcodec,
                    acodec: format.acodec,
                    filesize: format.filesize,
                    fps: format.fps,
                    has_audio: hasAudio,
                    quality_label: quality
                };
            })
        };
        res.json(response);
    }
    catch (error) {
        console.error('Video info error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to get video information';
        // Handle specific error types
        let statusCode = 500;
        let errorCode = 'VIDEO_INFO_FAILED';
        if (errorMessage.includes('Unsupported URL') || errorMessage.includes('unsupported platform')) {
            statusCode = 400;
            errorCode = 'UNSUPPORTED_URL';
        }
        else if (errorMessage.includes('Video unavailable') || errorMessage.includes('not found')) {
            statusCode = 404;
            errorCode = 'VIDEO_NOT_FOUND';
        }
        else if (errorMessage.includes('timeout')) {
            statusCode = 408;
            errorCode = 'REQUEST_TIMEOUT';
        }
        res.status(statusCode).json({
            error: errorMessage,
            code: errorCode
        });
    }
}));
/**
 * POST /api/info/download
 * Download video with selected format
 */
router.post('/download', auth_1.authenticate, [
    (0, express_validator_1.body)('url').isURL().withMessage('Valid URL is required'),
    (0, express_validator_1.body)('format_id').notEmpty().withMessage('Format ID is required'),
    (0, express_validator_1.body)('title').optional().isString().withMessage('Title must be a string')
], validateRequest, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, format_id, title } = req.body;
        // Stream the video directly to the client
        yield streamingService_1.StreamingService.streamVideo(req, res, {
            videoUrl: url,
            formatId: format_id,
            title: title
        });
    }
    catch (error) {
        console.error('Video download error:', error);
        if (!res.headersSent) {
            const errorMessage = error instanceof Error ? error.message : 'Download failed';
            res.status(500).json({
                error: errorMessage,
                code: 'DOWNLOAD_FAILED'
            });
        }
    }
}));
exports.default = router;
