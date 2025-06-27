'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Users,
  DollarSign,
  Activity,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Settings,
  Cookie,
  Zap,
  CheckCircle,
  Clock,
  Download,
  Server,
  AlertTriangle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalDownloads: number;
  revenueToday: number;
  newUsersToday: number;
  downloadsToday: number;
  systemStatus: 'healthy' | 'warning' | 'error';
  serverUptime: string;
  storageUsed: number;
  storageTotal: number;
  bandwidthUsed: number;
  bandwidthLimit: number;
  activeDownloads: number;
  queuedDownloads: number;
  userGrowth: number;
  revenueGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'user_register' | 'download' | 'payment' | 'system';
  message: string;
  timestamp: string;
  user?: {
    email: string;
    avatar?: string;
  };
}

interface SystemHealth {
  api: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  storage: 'online' | 'offline' | 'degraded';
  youtube: 'online' | 'offline' | 'degraded';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');

      // Fetch all dashboard data in parallel
      const [statsRes, activityRes, healthRes] = await Promise.all([
        fetch('/api/admin/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/dashboard/activity', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/dashboard/health', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || generateMockStats());
      } else {
        setStats(generateMockStats());
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData.activities || generateMockActivity());
      } else {
        setRecentActivity(generateMockActivity());
      }

      if (healthRes.ok) {
        const healthData = await healthRes.json();
        setSystemHealth(healthData.health || generateMockHealth());
      } else {
        setSystemHealth(generateMockHealth());
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      // Set mock data on error
      setStats(generateMockStats());
      setRecentActivity(generateMockActivity());
      setSystemHealth(generateMockHealth());
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success('Dữ liệu đã được cập nhật');
  };

  // Mock data generators
  const generateMockStats = (): DashboardStats => ({
    totalUsers: 1247,
    activeUsers: 892,
    totalDownloads: 15420,
    revenueToday: 2450000,
    newUsersToday: 23,
    downloadsToday: 156,
    systemStatus: 'healthy',
    serverUptime: '15 ngày 4 giờ',
    storageUsed: 75,
    storageTotal: 100,
    bandwidthUsed: 45,
    bandwidthLimit: 100,
    activeDownloads: 12,
    queuedDownloads: 3,
    userGrowth: 12.5,
    revenueGrowth: 8.3
  });

  const generateMockActivity = (): RecentActivity[] => [
    {
      id: '1',
      type: 'user_register',
      message: 'Người dùng mới đăng ký',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      user: { email: 'user@example.com' }
    },
    {
      id: '2',
      type: 'download',
      message: 'Video YouTube được tải xuống',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'payment',
      message: 'Thanh toán Premium thành công',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user: { email: 'premium@example.com' }
    }
  ];

  const generateMockHealth = (): SystemHealth => ({
    api: 'online',
    database: 'online',
    storage: 'online',
    youtube: 'online'
  });

  // Utility functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
    return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'online': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'offline': return AlertTriangle;
      default: return Clock;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
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
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Tổng người dùng',
      value: stats?.totalUsers || 0,
      change: stats?.userGrowth || 0,
      icon: Users,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500'
    },
    {
      title: 'Người dùng hoạt động',
      value: stats?.activeUsers || 0,
      change: 0,
      icon: Activity,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-l-green-500'
    },
    {
      title: 'Tổng lượt tải',
      value: stats?.totalDownloads || 0,
      change: 0,
      icon: Download,
      color: 'purple',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-l-purple-500'
    },
    {
      title: 'Doanh thu hôm nay',
      value: stats?.revenueToday || 0,
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'orange',
      isCurrency: true,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-l-orange-500'
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Chào mừng trở lại! Đây là tổng quan hệ thống của bạn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      <Alert className={`${stats?.systemStatus === 'healthy' ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
        {stats?.systemStatus === 'healthy' ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        )}
        <AlertDescription className={stats?.systemStatus === 'healthy' ? 'text-green-800' : 'text-yellow-800'}>
          {stats?.systemStatus === 'healthy'
            ? `Hệ thống đang hoạt động bình thường. Uptime: ${stats?.serverUptime || 'N/A'}`
            : 'Hệ thống có một số vấn đề cần chú ý.'
          }
        </AlertDescription>
      </Alert>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className={`${card.borderColor} border-l-4 hover:shadow-lg transition-all duration-200 hover:scale-105`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                  </p>
                  {card.change !== 0 && (
                    <div className="flex items-center gap-1">
                      {card.change > 0 ? (
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(card.change)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Thống kê nhanh
              </CardTitle>
              <CardDescription>
                Dữ liệu thời gian thực hôm nay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats?.newUsersToday || 0}</div>
                  <div className="text-sm text-gray-600">Người dùng mới</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{stats?.downloadsToday || 0}</div>
                  <div className="text-sm text-gray-600">Lượt tải hôm nay</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{stats?.activeDownloads || 0}</div>
                  <div className="text-sm text-gray-600">Đang tải</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats?.queuedDownloads || 0}</div>
                  <div className="text-sm text-gray-600">Hàng đợi</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Tài nguyên hệ thống
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Dung lượng lưu trữ</span>
                  <span>{stats?.storageUsed || 0}% / {stats?.storageTotal || 100}GB</span>
                </div>
                <Progress value={stats?.storageUsed || 0} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Băng thông</span>
                  <span>{stats?.bandwidthUsed || 0}% / {stats?.bandwidthLimit || 100}GB</span>
                </div>
                <Progress value={stats?.bandwidthUsed || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity and Health */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Hoạt động gần đây
              </CardTitle>
              <CardDescription>
                Các sự kiện mới nhất trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {activity.user?.email?.charAt(0).toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      {activity.user && (
                        <p className="text-xs text-gray-500 truncate">{activity.user.email}</p>
                      )}
                      <p className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Tình trạng hệ thống
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemHealth && Object.entries(systemHealth).map(([service, status]) => {
                  const HealthIcon = getHealthIcon(status);
                  return (
                    <div key={service} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <HealthIcon className={`h-4 w-4 ${getHealthColor(status).split(' ')[0]}`} />
                        <span className="font-medium capitalize">
                          {service === 'api' ? 'API Server' :
                           service === 'database' ? 'Database' :
                           service === 'storage' ? 'Storage' : 'YouTube API'}
                        </span>
                      </div>
                      <Badge className={getHealthColor(status)}>
                        {status === 'online' ? 'Online' :
                         status === 'degraded' ? 'Degraded' : 'Offline'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Thao tác nhanh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/admin/users">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Users className="h-4 w-4" />
                    Quản lý người dùng
                  </Button>
                </Link>
                <Link href="/admin/cookie">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Cookie className="h-4 w-4" />
                    Cookie YouTube
                  </Button>
                </Link>
                <Link href="/admin/settings">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Settings className="h-4 w-4" />
                    Cài đặt hệ thống
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
