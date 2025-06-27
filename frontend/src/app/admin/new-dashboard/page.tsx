'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Import custom components
import StatCard from '@/components/admin/dashboard/StatCard';
import SystemHealth from '@/components/admin/dashboard/SystemHealth';
import ActivityFeed from '@/components/admin/dashboard/ActivityFeed';
import QuickActions from '@/components/admin/dashboard/QuickActions';

// Icons
import {
  Users,
  DollarSign,
  Download,
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi
} from 'lucide-react';

// Types
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalDownloads: number;
  revenueToday: number;
  newUsersToday: number;
  downloadsToday: number;
  systemStatus: 'healthy' | 'warning' | 'error';
  serverUptime: string;
  userGrowth: number;
  revenueGrowth: number;
  downloadGrowth: number;
}

interface SystemService {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime?: number;
  uptime?: number;
  lastCheck?: string;
}

interface SystemResource {
  name: string;
  used: number;
  total: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActivityItem {
  id: string;
  type: 'user_register' | 'download' | 'payment' | 'system' | 'error' | 'success';
  title: string;
  description?: string;
  timestamp: string;
  user?: {
    name?: string;
    email: string;
    avatar?: string;
  };
}

export default function NewDashboardPage() {
  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [services, setServices] = useState<SystemService[]>([]);
  const [resources, setResources] = useState<SystemResource[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Mock data generators
  const generateMockStats = useCallback((): DashboardStats => ({
    totalUsers: 1247 + Math.floor(Math.random() * 100),
    activeUsers: 892 + Math.floor(Math.random() * 50),
    totalDownloads: 15420 + Math.floor(Math.random() * 1000),
    revenueToday: 2450000 + Math.floor(Math.random() * 500000),
    newUsersToday: 23 + Math.floor(Math.random() * 10),
    downloadsToday: 156 + Math.floor(Math.random() * 50),
    systemStatus: Math.random() > 0.1 ? 'healthy' : 'warning',
    serverUptime: '15 ngày 4 giờ',
    userGrowth: 12.5 + (Math.random() - 0.5) * 5,
    revenueGrowth: 8.3 + (Math.random() - 0.5) * 3,
    downloadGrowth: 15.2 + (Math.random() - 0.5) * 8
  }), []);

  const generateMockServices = useCallback((): SystemService[] => [
    {
      name: 'API Server',
      status: Math.random() > 0.05 ? 'online' : 'degraded',
      responseTime: 45 + Math.floor(Math.random() * 50),
      uptime: 99.9,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Database',
      status: Math.random() > 0.02 ? 'online' : 'degraded',
      responseTime: 12 + Math.floor(Math.random() * 20),
      uptime: 99.95,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'Storage',
      status: 'online',
      responseTime: 8 + Math.floor(Math.random() * 15),
      uptime: 100,
      lastCheck: new Date().toISOString()
    },
    {
      name: 'YouTube API',
      status: Math.random() > 0.1 ? 'online' : 'degraded',
      responseTime: 120 + Math.floor(Math.random() * 100),
      uptime: 98.5,
      lastCheck: new Date().toISOString()
    }
  ], []);

  const generateMockResources = useCallback((): SystemResource[] => [
    {
      name: 'CPU Usage',
      used: 35 + Math.random() * 30,
      total: 100,
      unit: '%',
      icon: Cpu
    },
    {
      name: 'Memory',
      used: 6.2 + Math.random() * 2,
      total: 16,
      unit: 'GB',
      icon: MemoryStick
    },
    {
      name: 'Storage',
      used: 245 + Math.random() * 50,
      total: 500,
      unit: 'GB',
      icon: HardDrive
    },
    {
      name: 'Network',
      used: 12 + Math.random() * 20,
      total: 100,
      unit: 'Mbps',
      icon: Wifi
    }
  ], []);

  const generateMockActivities = useCallback((): ActivityItem[] => {
    const activities = [];
    const types = ['user_register', 'download', 'payment', 'system', 'success'];
    const titles = {
      user_register: 'Người dùng mới đăng ký',
      download: 'Video được tải xuống',
      payment: 'Thanh toán thành công',
      system: 'Cập nhật hệ thống',
      success: 'Tác vụ hoàn thành'
    };

    for (let i = 0; i < 15; i++) {
      const type = types[Math.floor(Math.random() * types.length)] as keyof typeof titles;
      const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
      
      activities.push({
        id: `activity-${i}`,
        type,
        title: titles[type],
        description: `Chi tiết về ${titles[type].toLowerCase()}`,
        timestamp: timestamp.toISOString(),
        user: Math.random() > 0.3 ? {
          name: `User ${i + 1}`,
          email: `user${i + 1}@example.com`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
        } : undefined
      });
    }

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, []);

  // Data fetching
  const fetchDashboardData = useCallback(async () => {
    try {
      // const token = localStorage.getItem('adminToken');
      
      // Simulate API calls with realistic delays
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      
      // In a real app, these would be actual API calls
      const [statsData, servicesData, resourcesData, activitiesData] = await Promise.all([
        Promise.resolve(generateMockStats()),
        Promise.resolve(generateMockServices()),
        Promise.resolve(generateMockResources()),
        Promise.resolve(generateMockActivities())
      ]);

      setStats(statsData);
      setServices(servicesData);
      setResources(resourcesData);
      setActivities(activitiesData);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Không thể tải dữ liệu dashboard');
      
      // Fallback to mock data
      setStats(generateMockStats());
      setServices(generateMockServices());
      setResources(generateMockResources());
      setActivities(generateMockActivities());
    }
  }, [generateMockStats, generateMockServices, generateMockResources, generateMockActivities]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDashboardData();
      setIsLoading(false);
    };

    loadData();
  }, [fetchDashboardData]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Dữ liệu đã được cập nhật');
  }, [fetchDashboardData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        fetchDashboardData();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchDashboardData, isLoading, isRefreshing]);

  // Memoized stat cards data
  const statCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Tổng người dùng',
        value: stats.totalUsers,
        change: stats.userGrowth,
        changeLabel: 'so với tháng trước',
        icon: Users,
        color: 'blue' as const,
        onClick: () => window.open('/admin/users', '_blank')
      },
      {
        title: 'Người dùng hoạt động',
        value: stats.activeUsers,
        change: stats.userGrowth * 0.8,
        changeLabel: 'so với tháng trước',
        icon: Activity,
        color: 'green' as const
      },
      {
        title: 'Tổng lượt tải',
        value: stats.totalDownloads,
        change: stats.downloadGrowth,
        changeLabel: 'so với tháng trước',
        icon: Download,
        color: 'purple' as const
      },
      {
        title: 'Doanh thu hôm nay',
        value: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND'
        }).format(stats.revenueToday),
        change: stats.revenueGrowth,
        changeLabel: 'so với hôm qua',
        icon: DollarSign,
        color: 'orange' as const
      }
    ];
  }, [stats]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-8 p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatCard
              key={i}
              title=""
              value=""
              icon={Users}
              color="blue"
              isLoading={true}
            />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard Mới
          </h1>
          <p className="text-gray-600">
            Chào mừng trở lại! Đây là tổng quan hệ thống hiện đại của bạn.
          </p>
          <p className="text-xs text-gray-500">
            Cập nhật lần cuối: {lastUpdated.toLocaleString('vi-VN')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-2"
            aria-label="Làm mới dữ liệu dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {stats && (
        <Alert className={`${
          stats.systemStatus === 'healthy' 
            ? 'border-green-200 bg-green-50' 
            : stats.systemStatus === 'warning'
            ? 'border-yellow-200 bg-yellow-50'
            : 'border-red-200 bg-red-50'
        }`}>
          {stats.systemStatus === 'healthy' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription className={
            stats.systemStatus === 'healthy' 
              ? 'text-green-800' 
              : stats.systemStatus === 'warning'
              ? 'text-yellow-800'
              : 'text-red-800'
          }>
            {stats.systemStatus === 'healthy' 
              ? `Hệ thống đang hoạt động bình thường. Uptime: ${stats.serverUptime}`
              : stats.systemStatus === 'warning'
              ? 'Hệ thống có một số vấn đề cần chú ý.'
              : 'Hệ thống đang gặp sự cố nghiêm trọng.'
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            change={card.change}
            changeLabel={card.changeLabel}
            icon={card.icon}
            color={card.color}
            onClick={card.onClick}
            aria-label={`${card.title}: ${card.value}`}
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - System Health */}
        <div className="lg:col-span-2 space-y-6">
          <SystemHealth 
            services={services} 
            resources={resources}
            isLoading={false}
          />
        </div>

        {/* Right Column - Activity and Quick Actions */}
        <div className="space-y-6">
          <ActivityFeed 
            activities={activities}
            isLoading={false}
            maxItems={8}
          />
          
          <QuickActions 
            isLoading={false}
          />
        </div>
      </div>
    </div>
  );
}
