# Phase 1.2: Streaming Architecture - Implementation Guide

## 🎯 Overview

Phase 1.2 implements a comprehensive streaming architecture for the TaiVideoNhanh platform, providing secure, scalable, and real-time video streaming capabilities with advanced monitoring and performance optimization.

## 🏗️ Architecture Components

### 1. Stream Token System
- **JWT-based secure tokens** with configurable expiration
- **Rate limiting** to prevent abuse
- **Token refresh mechanism** for extended sessions
- **IP and User-Agent validation** for additional security

### 2. Streaming Proxy Service
- **Real-time video streaming** with chunked transfer encoding
- **Multiple format support** (MP4, WebM, MKV, etc.)
- **Error handling and retry logic** for network issues
- **Memory-efficient streaming** without disk storage

### 3. BullMQ Integration
- **Queue management** for concurrent streaming jobs
- **Job priorities and concurrency limits**
- **Real-time job monitoring** and health checks
- **Automatic cleanup** of old jobs

### 4. Performance Optimization
- **Memory management** for streaming buffers
- **Redis caching** for frequently accessed data
- **Performance metrics collection** and monitoring
- **Resource cleanup** after streaming completion

### 5. Frontend Streaming UI
- **Real-time progress tracking** with WebSocket/SSE
- **Interactive video analysis** and format selection
- **Download management** with pause/resume functionality
- **Error handling** and user feedback

## 📁 File Structure

```
backend/src/
├── config/
│   └── redis.ts                 # Redis configuration
├── middleware/
│   └── streamRateLimit.ts       # Rate limiting middleware
├── models/
│   ├── StreamToken.ts           # Stream token model
│   └── index.ts                 # Updated model exports
├── routes/
│   ├── streaming.ts             # Streaming API routes
│   └── monitoring.ts            # Monitoring endpoints
├── services/
│   ├── streamTokenService.ts    # Token management
│   ├── streamingService.ts      # Video streaming logic
│   ├── queueService.ts          # BullMQ integration
│   └── performanceService.ts    # Performance monitoring
└── server.ts                    # Updated server with streaming

frontend/src/
├── hooks/
│   └── useStreaming.ts          # Streaming hook
├── components/
│   ├── streaming/
│   │   ├── VideoAnalyzer.tsx    # Video analysis component
│   │   └── StreamingProgress.tsx # Progress tracking
│   └── ui/
│       ├── progress.tsx         # Progress bar component
│       └── separator.tsx        # Separator component
└── app/
    └── streaming/
        └── page.tsx             # Main streaming page
```

## 🚀 Getting Started

### Prerequisites

1. **Redis Server** running on localhost:6379
2. **PostgreSQL** database configured
3. **yt-dlp** installed and accessible
4. **Node.js** 18+ and npm

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Environment Configuration**
```bash
# Copy and configure environment variables
cp backend/.env.example backend/.env

# Update Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Configure streaming settings
STREAM_TOKEN_EXPIRES_MINUTES=30
MAX_CONCURRENT_STREAMS=3
MAX_TOKENS_PER_USER=5
```

4. **Database Migration**
```bash
cd backend
npm run dev  # This will sync models including StreamToken
```

### Running the Application

1. **Start Backend**
```bash
cd backend
npm run dev
```

2. **Start Frontend**
```bash
cd frontend
npm run dev
```

3. **Test Streaming**
```bash
# Run the test script
./scripts/test-streaming.sh
```

## 🔧 API Endpoints

### Streaming Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/streaming/analyze` | Start video analysis |
| GET | `/api/streaming/analyze/:requestId` | Get analysis result |
| POST | `/api/streaming/token` | Create stream token |
| GET | `/api/streaming/stream/:token` | Stream video |
| POST | `/api/streaming/token/:token/refresh` | Refresh token |
| DELETE | `/api/streaming/token/:token` | Revoke token |
| GET | `/api/streaming/tokens` | Get user's active tokens |

### Monitoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/monitoring/health` | System health check |
| GET | `/api/monitoring/metrics` | Performance metrics |
| GET | `/api/monitoring/queues` | Queue statistics |
| GET | `/api/monitoring/status` | System status |
| POST | `/api/monitoring/cleanup` | Trigger cleanup |

## 🔒 Security Features

### Stream Token Security
- **SHA-256 hashed tokens** stored in database
- **Configurable expiration** (default: 30 minutes)
- **Rate limiting** per user and per hour
- **IP address validation** (optional)
- **User-Agent tracking** for audit

### Rate Limiting
- **Per-user limits**: 5 concurrent tokens, 20 tokens/hour
- **Subscription-based limits**: Free (10/day), Pro (100/day)
- **Global rate limiting** on streaming endpoints
- **Automatic cleanup** of expired tokens

## 📊 Performance Monitoring

### Metrics Collected
- **Memory usage** and CPU utilization
- **Active streams** and total streams
- **Error rates** and success rates
- **Cache hit rates** and performance
- **Queue statistics** and job status

### Health Checks
- **System health** (memory, Redis, streams)
- **Service availability** checks
- **Performance thresholds** monitoring
- **Automatic alerting** (configurable)

## 🎮 Frontend Features

### Video Analysis
- **URL input** with validation
- **Real-time progress** tracking
- **Format selection** with quality badges
- **Thumbnail preview** and metadata display

### Streaming Interface
- **Token management** with expiration tracking
- **Download progress** with speed and ETA
- **Pause/resume** functionality (where supported)
- **Error handling** with retry options

### User Experience
- **Real-time updates** via polling
- **Responsive design** for all devices
- **Toast notifications** for user feedback
- **Accessibility** features included

## 🧪 Testing

### Automated Testing
```bash
# Run the comprehensive test suite
./scripts/test-streaming.sh
```

### Manual Testing
1. **Video Analysis**: Test with various video URLs
2. **Token Creation**: Verify rate limiting works
3. **Streaming**: Test download with different formats
4. **Monitoring**: Check health and metrics endpoints

### Load Testing
```bash
# Use Artillery for load testing
npm install -g artillery
artillery run tests/load-test-streaming.yml
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STREAM_TOKEN_EXPIRES_MINUTES` | 30 | Token expiration time |
| `MAX_CONCURRENT_STREAMS` | 3 | Max concurrent streams |
| `MAX_TOKENS_PER_USER` | 5 | Max tokens per user |
| `MAX_TOKENS_PER_HOUR` | 20 | Hourly rate limit |
| `STREAM_BUFFER_SIZE` | 65536 | Streaming buffer size |
| `METRICS_RETENTION_HOURS` | 24 | Metrics retention period |

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis server is running
   - Check Redis configuration in .env
   - Verify network connectivity

2. **Streaming Fails**
   - Check yt-dlp installation
   - Verify video URL accessibility
   - Check token expiration

3. **Rate Limiting Issues**
   - Check user subscription tier
   - Verify rate limit configuration
   - Clean up expired tokens

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## 📈 Performance Optimization

### Memory Management
- **Streaming buffers** are automatically cleaned up
- **Token cleanup** runs every hour
- **Metrics cleanup** removes old data
- **Queue cleanup** removes completed jobs

### Caching Strategy
- **Video metadata** cached for 1 hour
- **User tokens** cached for quick validation
- **Performance metrics** cached for monitoring
- **Queue statistics** cached for dashboard

## 🔄 Deployment

### Production Checklist
- [ ] Redis cluster configured
- [ ] Environment variables set
- [ ] SSL certificates installed
- [ ] Monitoring alerts configured
- [ ] Backup strategy implemented
- [ ] Load balancer configured

### Docker Deployment
```bash
# Build and deploy with Docker Compose
docker-compose up -d
```

## 📚 Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/documentation)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [Next.js Documentation](https://nextjs.org/docs)

## 🤝 Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure security best practices
5. Test with the provided test script

---

**Phase 1.2 Status**: ✅ **COMPLETED**

This implementation provides a robust, scalable streaming architecture ready for production use with comprehensive monitoring, security, and performance optimization features.
