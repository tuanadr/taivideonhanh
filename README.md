# 🎬 TaiVideoNhanh - Advanced Video Streaming SaaS Platform

A comprehensive video downloading and streaming service built with modern technologies, featuring subscription management, admin panel, and advanced analytics.

## ✨ Features

### 🎯 Core Features
- **Video Streaming & Download**: Support for multiple video platforms with high-quality streaming
- **Subscription Management**: Freemium model with Pro subscriptions via Stripe
- **User Authentication**: Secure JWT-based authentication with refresh tokens
- **Admin Panel**: Comprehensive admin dashboard with analytics and user management
- **Legal Compliance**: DMCA reporting system and legal document management
- **Advanced Analytics**: Real-time usage analytics and user behavior tracking

### 🔧 Technical Features
- **Streaming Architecture**: Optimized video streaming with yt-dlp integration
- **Queue System**: Redis-based job queue for background processing
- **Performance Monitoring**: Real-time performance metrics and monitoring
- **Rate Limiting**: Advanced rate limiting and abuse prevention
- **Security**: Comprehensive security headers and CORS protection
- **Scalability**: Docker-based deployment with load balancing support

## 🏗️ Architecture

### Backend (Node.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis for caching and job queues
- **Authentication**: JWT with refresh token rotation
- **Payment**: Stripe integration for subscriptions
- **Queue**: BullMQ for background job processing
- **Monitoring**: Custom performance monitoring system

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **UI**: shadcn/ui components with Tailwind CSS
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Sonner for toast notifications

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Reverse Proxy**: Traefik with automatic SSL
- **Monitoring**: Prometheus + Grafana
- **Deployment**: Docker Compose for production

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/tuanadr/taivideonhanh.git
cd taivideonhanh
```

2. **Install dependencies**
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

3. **Setup environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.local.example frontend/.env.local
# Edit frontend/.env.local with your configuration
```

4. **Start development services**
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- API Health: http://localhost:5000/api/health