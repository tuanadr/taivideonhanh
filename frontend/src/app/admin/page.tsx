'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  DollarSign,
  TrendingUp,
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
  Eye
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  newUsersToday: number;
  revenueToday: number;
  userGrowth: number;
  revenueGrowth: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
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
      borderColor: 'border-blue-200'
    },
    {
      title: 'Gói đăng ký hoạt động',
      value: stats?.activeSubscriptions || 0,
      change: 0,
      icon: Activity,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      title: 'Tổng doanh thu',
      value: stats?.totalRevenue || 0,
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'purple',
      isCurrency: true,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Người dùng mới hôm nay',
      value: stats?.newUsersToday || 0,
      change: 0,
      icon: TrendingUp,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200'
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Tổng quan hệ thống quản trị
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDashboardStats}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          Hệ thống đang hoạt động bình thường. Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}
        </AlertDescription>
      </Alert>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Card key={index} className={`${card.borderColor} border-l-4 hover:shadow-lg transition-shadow`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <p className="text-2xl font-bold">
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
                        {formatPercentage(card.change)} so với tháng trước
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Thao tác nhanh
            </CardTitle>
            <CardDescription>
              Truy cập nhanh các chức năng quản trị chính
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/admin/users">
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 hover:border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Quản lý người dùng</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {stats?.totalUsers || 0} người dùng
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/cookie">
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 hover:border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                        <Cookie className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Cookie YouTube</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Quản lý xác thực
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/admin/settings">
                <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group border-2 hover:border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                        <Settings className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Cài đặt hệ thống</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Cấu hình hệ thống
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="border-2 border-dashed border-gray-200 bg-gray-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-600">Báo cáo</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sắp ra mắt
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Hoạt động gần đây
            </CardTitle>
            <CardDescription>
              Các thao tác quản trị mới nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-blue-50 rounded-full">
                  <Users className="h-3 w-3 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Người dùng mới đăng ký</p>
                  <p className="text-xs text-muted-foreground">
                    {stats?.newUsersToday || 0} người dùng hôm nay
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Hôm nay
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 bg-green-50 rounded-full">
                  <DollarSign className="h-3 w-3 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Doanh thu mới</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.revenueToday || 0)} hôm nay
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Hôm nay
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1 bg-purple-50 rounded-full">
                  <Activity className="h-3 w-3 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Hệ thống hoạt động</p>
                  <p className="text-xs text-muted-foreground">
                    Tất cả dịch vụ đang online
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Eye className="h-3 w-3 inline mr-1" />
                  Theo dõi
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
