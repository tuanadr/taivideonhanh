'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, TrendingUp, Activity } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
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
      color: 'blue'
    },
    {
      title: 'Gói đăng ký hoạt động',
      value: stats?.activeSubscriptions || 0,
      change: 0,
      icon: Activity,
      color: 'green'
    },
    {
      title: 'Tổng doanh thu',
      value: stats?.totalRevenue || 0,
      change: stats?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'purple',
      isCurrency: true
    },
    {
      title: 'Người dùng mới hôm nay',
      value: stats?.newUsersToday || 0,
      change: 0,
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchDashboardStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Làm mới
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.isCurrency ? formatCurrency(card.value) : formatNumber(card.value)}
                </p>
                {card.change !== 0 && (
                  <p className={`text-sm ${card.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(card.change)} so với tháng trước
                  </p>
                )}
              </div>
              <div className={`p-3 rounded-full bg-${card.color}-100`}>
                <card.icon className={`h-6 w-6 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/users"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Quản lý người dùng</h3>
            <p className="text-sm text-gray-600 mt-1">Xem và quản lý tài khoản người dùng</p>
          </a>
          
          <a
            href="/admin/cookie"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Cookie YouTube</h3>
            <p className="text-sm text-gray-600 mt-1">Quản lý cookie xác thực YouTube</p>
          </a>
          
          <a
            href="/admin/settings"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Cài đặt hệ thống</h3>
            <p className="text-sm text-gray-600 mt-1">Cấu hình và tùy chỉnh hệ thống</p>
          </a>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái hệ thống</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">API Server</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Hoạt động
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Hoạt động
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">YouTube Cookie</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Cần kiểm tra
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
