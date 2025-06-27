'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users,
  Search,
  RefreshCw,
  UserPlus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Shield
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_suspended: boolean;
  last_login: string | null;
  created_at: string;
  avatar?: string;
  role: 'user' | 'premium' | 'admin';
  subscription?: {
    tier: string;
    expires_at: string | null;
    status: 'active' | 'expired' | 'cancelled';
  };
  stats?: {
    totalDownloads: number;
    lastActivity: string;
  };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  premiumUsers: number;
  newUsersToday: number;
  userGrowth: number;
  activeGrowth: number;
}

type SortField = 'email' | 'created_at' | 'last_login' | 'role';
type SortOrder = 'asc' | 'desc';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // const [isRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState('');
  const [sortField] = useState<SortField>('created_at');
  const [sortOrder] = useState<SortOrder>('desc');
  // const [currentPage, setCurrentPage] = useState(1);
  // const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    filterAndSortUsers();
  }, [users, search, statusFilter, subscriptionFilter, sortField, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');

      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/users/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || generateMockUsers());
      } else {
        setUsers(generateMockUsers());
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || generateMockStats());
      } else {
        setStats(generateMockStats());
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setUsers(generateMockUsers());
      setStats(generateMockStats());
      toast.error('Không thể tải dữ liệu người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  // const handleRefresh = async () => {
  //   setIsRefreshing(true);
  //   await fetchData();
  //   setIsRefreshing(false);
  //   toast.success('Dữ liệu đã được cập nhật');
  // };

  // Mock data generators
  const generateMockUsers = (): User[] => [
    {
      id: '1',
      email: 'user1@example.com',
      first_name: 'Nguyễn',
      last_name: 'Văn A',
      is_active: true,
      is_suspended: false,
      last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'premium',
      subscription: { tier: 'premium', expires_at: '2024-12-31', status: 'active' },
      stats: { totalDownloads: 156, lastActivity: new Date().toISOString() }
    },
    {
      id: '2',
      email: 'user2@example.com',
      first_name: 'Trần',
      last_name: 'Thị B',
      is_active: true,
      is_suspended: false,
      last_login: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'user',
      stats: { totalDownloads: 23, lastActivity: new Date().toISOString() }
    },
    {
      id: '3',
      email: 'suspended@example.com',
      first_name: 'Lê',
      last_name: 'Văn C',
      is_active: false,
      is_suspended: true,
      last_login: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      role: 'user',
      stats: { totalDownloads: 5, lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
    }
  ];

  const generateMockStats = (): UserStats => ({
    totalUsers: 1247,
    activeUsers: 892,
    inactiveUsers: 245,
    suspendedUsers: 110,
    premiumUsers: 156,
    newUsersToday: 23,
    userGrowth: 12.5,
    activeGrowth: 8.3
  });

  // Utility functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  // const formatTimeAgo = (dateString: string | null) => {
  //   if (!dateString) return 'Chưa có';
  //   const now = new Date();
  //   const date = new Date(dateString);
  //   const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  //
  //   if (diffInMinutes < 1) return 'Vừa xong';
  //   if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  //   if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} giờ trước`;
  //   return `${Math.floor(diffInMinutes / 1440)} ngày trước`;
  // };

  const getUserStatus = (user: User) => {
    if (user.is_suspended) return { label: 'Bị khóa', variant: 'destructive' as const, color: 'text-red-600' };
    if (user.is_active) return { label: 'Hoạt động', variant: 'default' as const, color: 'text-green-600' };
    return { label: 'Không hoạt động', variant: 'secondary' as const, color: 'text-yellow-600' };
  };

  const getSubscriptionBadge = (user: User) => {
    if (user.subscription?.tier === 'premium') {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Premium</Badge>;
    }
    if (user.subscription?.tier === 'pro') {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pro</Badge>;
    }
    return <Badge variant="outline">Free</Badge>;
  };

  // const getRoleBadge = (role: string) => {
  //   switch (role) {
  //     case 'admin':
  //       return <Badge className="bg-red-100 text-red-700 border-red-200">Admin</Badge>;
  //     case 'premium':
  //       return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Premium</Badge>;
  //     default:
  //       return <Badge variant="outline">User</Badge>;
  //   }
  // };

  // Filter and sort functions
  const filterAndSortUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active':
            return user.is_active && !user.is_suspended;
          case 'inactive':
            return !user.is_active && !user.is_suspended;
          case 'suspended':
            return user.is_suspended;
          default:
            return true;
        }
      });
    }

    // Apply subscription filter
    if (subscriptionFilter) {
      filtered = filtered.filter(user => {
        switch (subscriptionFilter) {
          case 'free':
            return !user.subscription || user.subscription.tier === 'free';
          case 'premium':
            return user.subscription?.tier === 'premium';
          case 'pro':
            return user.subscription?.tier === 'pro';
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;

      switch (sortField) {
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'last_login':
          aValue = a.last_login ? new Date(a.last_login) : new Date(0);
          bValue = b.last_login ? new Date(b.last_login) : new Date(0);
          break;
        case 'role':
          aValue = a.role;
          bValue = b.role;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
  };

  // const handleSort = (field: SortField) => {
  //   if (sortField === field) {
  //     setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  //   } else {
  //     setSortField(field);
  //     setSortOrder('asc');
  //   }
  // };

  // const handleSearch = (value: string) => {
  //   setSearch(value);
  //   setCurrentPage(1);
  // };

  // const handleFilterChange = (type: string, value: string) => {
  //   if (type === 'status') setStatusFilter(value);
  //   if (type === 'subscription') setSubscriptionFilter(value);
  //   setCurrentPage(1);
  // };

  // Pagination
  // const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  // const startIndex = (currentPage - 1) * itemsPerPage;
  // const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
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
            Quản lý người dùng
          </h1>
          <p className="text-gray-600">
            Quản lý tài khoản và thông tin người dùng hệ thống ({filteredUsers.length} người dùng)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Xuất dữ liệu
          </Button>
          <Button size="sm" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Thêm người dùng
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalUsers.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-green-600">+{stats.userGrowth}%</span>
                    <span className="text-xs text-gray-500">tháng này</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeUsers.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-green-600">+{stats.activeGrowth}%</span>
                    <span className="text-xs text-gray-500">tháng này</span>
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Không hoạt động</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.inactiveUsers.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">30 ngày qua</span>
                  </div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bị khóa</p>
                  <p className="text-2xl font-bold text-red-600">{stats.suspendedUsers.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">Cần xem xét</span>
                  </div>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Premium</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.premiumUsers.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">Đã trả phí</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Mới hôm nay</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.newUsersToday.toLocaleString()}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-gray-500">Hôm nay</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-50 rounded-full">
                  <UserPlus className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo email hoặc tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
                <SelectItem value="suspended">Bị khóa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Gói đăng ký" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tất cả gói</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách người dùng ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Gói</TableHead>
                  <TableHead>Đăng nhập cuối</TableHead>
                  <TableHead>Ngày tạo</TableHead>
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
                      <TableCell>{getSubscriptionBadge(user)}</TableCell>
                      <TableCell>{formatDate(user.last_login)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
