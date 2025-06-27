'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'Quản lý người dùng',
  '/admin/cookie': 'Cookie YouTube',
  '/admin/settings': 'Cài đặt',
  '/admin/login': 'Đăng nhập',
};

export default function AdminBreadcrumb() {
  const pathname = usePathname();
  
  // Don't show breadcrumb on login page
  if (pathname === '/admin/login') {
    return null;
  }

  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbItems = [];

  // Add home/dashboard
  breadcrumbItems.push({
    href: '/admin',
    label: 'Dashboard',
    isHome: true,
  });

  // Build breadcrumb path
  let currentPath = '';
  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += `/${pathSegments[i]}`;
    
    // Skip the first 'admin' segment as it's already handled
    if (pathSegments[i] === 'admin') continue;
    
    const label = routeLabels[currentPath] || pathSegments[i];
    breadcrumbItems.push({
      href: currentPath,
      label,
      isHome: false,
    });
  }

  // Remove duplicate dashboard items
  const uniqueItems = breadcrumbItems.filter((item, index, arr) => {
    if (index === 0) return true; // Keep first item
    return item.href !== arr[0].href;
  });

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {uniqueItems.map((item, index) => (
          <div key={item.href} className="flex items-center">
            <BreadcrumbItem>
              {index === uniqueItems.length - 1 ? (
                <BreadcrumbPage className="flex items-center gap-2">
                  {item.isHome && <Home className="h-4 w-4" />}
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="flex items-center gap-2 hover:text-blue-600">
                    {item.isHome && <Home className="h-4 w-4" />}
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < uniqueItems.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
