'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Activity,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_suspended: boolean;
  last_login: string | null;
  created_at: string;
  subscription?: {
    tier: string;
    expires_at: string | null;
  };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  freeUsers: number;
  premiumUsers: number;
  proUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('adminToken');

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder
      });

      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (subscriptionFilter) params.append('subscription', subscriptionFilter);

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setMessage('❌ Không thể lấy danh sách người dùng');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage('❌ Lỗi kết nối khi lấy danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, search, statusFilter, subscriptionFilter, sortBy, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');

      const response = await fetch('/api/admin/users/stats/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (type: string, value: string) => {
    if (type === 'status') {
      setStatusFilter(value);
    } else if (type === 'subscription') {
      setSubscriptionFilter(value);
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getUserStatus = (user: User) => {
    if (user.is_suspended) return { label: 'Suspended', variant: 'destructive' as const };
    if (user.is_active) return { label: 'Active', variant: 'default' as const };
    return { label: 'Inactive', variant: 'secondary' as const };
  };

  const getSubscriptionBadge = (subscription?: { tier: string }) => {
    if (!subscription) return <Badge variant="outline">Free</Badge>;

    const tier = subscription.tier;
    if (tier === 'premium') return <Badge variant="default">Premium</Badge>;
    if (tier === 'pro') return <Badge className="bg-purple-600">Pro</Badge>;
    return <Badge variant="outline">Free</Badge>;
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Đang tải danh sách người dùng...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">User Management Dashboard</CardTitle>
            <CardDescription>
              Quản lý người dùng và thống kê hệ thống
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Tổng Users</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
                <div className="text-sm text-gray-600">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.inactiveUsers}</div>
                <div className="text-sm text-gray-600">Inactive</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.suspendedUsers}</div>
                <div className="text-sm text-gray-600">Suspended</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.premiumUsers}</div>
                <div className="text-sm text-gray-600">Premium</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.newUsersToday}</div>
                <div className="text-sm text-gray-600">New Today</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm email, tên..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>

              <Select value={subscriptionFilter} onValueChange={(value) => handleFilterChange('subscription', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Gói đăng ký" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={fetchUsers} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách người dùng ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('email')}
                    >
                      Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Gói</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('last_login')}
                    >
                      Đăng nhập cuối {sortBy === 'last_login' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('created_at')}
                    >
                      Ngày tạo {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const status = getUserStatus(user);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>{getSubscriptionBadge(user.subscription)}</TableCell>
                        <TableCell>{formatDate(user.last_login)}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Hiển thị {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} của {pagination.total} người dùng
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                <span className="text-sm">
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message */}
        {message && (
          <Alert className={message.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.location.href = '/admin/setup'}
            >
              <Activity className="mr-2 h-4 w-4" />
              Quay Về Admin Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
