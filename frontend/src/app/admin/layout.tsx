'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Users,
  Settings,
  Cookie,
  LogOut,
  Menu,
  X,
  Shield,
  Loader2
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if current page is a login page (should not require authentication)
  const isLoginPage = pathname === '/admin/login' ||
                     pathname === '/admin/simple-login' ||
                     pathname === '/admin/direct-login';

  useEffect(() => {
    // Skip auth check for login pages
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    checkAdminAuth();
  }, [isLoginPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAdminAuth = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // Verify token with backend
      const response = await fetch('/api/admin/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        console.error('Admin auth verification failed:', response.status, response.statusText);
        localStorage.removeItem('adminToken');
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('adminToken');
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  // For login pages, render children directly without authentication check
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm text-muted-foreground">Đang xác thực...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Người dùng', href: '/admin/users', icon: Users },
    { name: 'Cookie YouTube', href: '/admin/cookie', icon: Cookie },
    { name: 'Cài đặt', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-md shadow-xl border-r transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-white" />
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="mt-6 px-3 space-y-2">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-500'}`} />
                  {item.name}
                  {isActive && (
                    <Badge variant="secondary" className="ml-auto bg-white/20 text-white border-0">
                      Active
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>

          <Separator className="my-4" />

          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar - Mobile menu only */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm border-b lg:hidden">
          <div className="flex items-center h-16 px-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
