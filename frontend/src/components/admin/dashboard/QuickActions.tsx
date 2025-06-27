'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Cookie, 
  Settings, 
  BarChart3, 
  Download, 
  Upload,
  Zap,
  ArrowRight,
  Plus
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'purple' | 'orange';
  badge?: string;
  isExternal?: boolean;
  onClick?: () => void;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  isLoading?: boolean;
}

const defaultActions: QuickAction[] = [
  {
    id: 'users',
    title: 'Quản lý người dùng',
    description: 'Xem và quản lý tài khoản người dùng',
    href: '/admin/users',
    icon: Users,
    color: 'blue',
    badge: 'Hot'
  },
  {
    id: 'cookie',
    title: 'Cookie YouTube',
    description: 'Quản lý cookie xác thực',
    href: '/admin/cookie',
    icon: Cookie,
    color: 'green'
  },
  {
    id: 'settings',
    title: 'Cài đặt hệ thống',
    description: 'Cấu hình hệ thống',
    href: '/admin/settings',
    icon: Settings,
    color: 'purple'
  },
  {
    id: 'reports',
    title: 'Báo cáo',
    description: 'Xem báo cáo và thống kê',
    href: '/admin/reports',
    icon: BarChart3,
    color: 'orange',
    badge: 'Soon'
  }
];

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    hover: 'hover:bg-blue-100',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-900'
  },
  green: {
    bg: 'bg-green-50',
    hover: 'hover:bg-green-100',
    border: 'border-green-200',
    icon: 'text-green-600',
    text: 'text-green-900'
  },
  purple: {
    bg: 'bg-purple-50',
    hover: 'hover:bg-purple-100',
    border: 'border-purple-200',
    icon: 'text-purple-600',
    text: 'text-purple-900'
  },
  orange: {
    bg: 'bg-orange-50',
    hover: 'hover:bg-orange-100',
    border: 'border-orange-200',
    icon: 'text-orange-600',
    text: 'text-orange-900'
  }
};

const QuickActionsSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const QuickActions = memo<QuickActionsProps>(({ 
  actions = defaultActions, 
  isLoading = false 
}) => {
  if (isLoading) {
    return <QuickActionsSkeleton />;
  }

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    }
  };

  return (
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
          {actions.map((action) => {
            const config = colorConfig[action.color];
            const ActionIcon = action.icon;

            const ActionContent = (
              <div 
                className={`
                  group relative p-4 rounded-lg border-2 transition-all duration-300
                  ${config.bg} ${config.hover} ${config.border}
                  hover:shadow-md hover:scale-105 cursor-pointer
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                `}
                role="button"
                tabIndex={0}
                aria-label={`${action.title}: ${action.description}`}
                onClick={() => handleActionClick(action)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActionClick(action);
                  }
                }}
              >
                {/* Badge */}
                {action.badge && (
                  <Badge 
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1"
                    aria-label={`Badge: ${action.badge}`}
                  >
                    {action.badge}
                  </Badge>
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`
                    p-2 rounded-lg ${config.bg} 
                    group-hover:scale-110 transition-transform duration-300
                    shadow-sm group-hover:shadow-md
                  `}>
                    <ActionIcon 
                      className={`h-6 w-6 ${config.icon}`} 
                      aria-hidden="true" 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-sm ${config.text} group-hover:text-opacity-80 transition-colors`}>
                      {action.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {action.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight 
                    className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" 
                    aria-hidden="true"
                  />
                </div>
              </div>
            );

            // Wrap with Link if it's an internal link
            if (!action.isExternal && !action.onClick) {
              return (
                <Link key={action.id} href={action.href}>
                  {ActionContent}
                </Link>
              );
            }

            // External link
            if (action.isExternal) {
              return (
                <a 
                  key={action.id} 
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {ActionContent}
                </a>
              );
            }

            // Custom onClick
            return (
              <div key={action.id}>
                {ActionContent}
              </div>
            );
          })}
        </div>

        {/* Additional Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" className="gap-2 flex-1">
              <Download className="h-4 w-4" />
              Xuất dữ liệu
            </Button>
            <Button variant="outline" size="sm" className="gap-2 flex-1">
              <Upload className="h-4 w-4" />
              Nhập dữ liệu
            </Button>
            <Button size="sm" className="gap-2 flex-1">
              <Plus className="h-4 w-4" />
              Thêm mới
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

QuickActions.displayName = 'QuickActions';

export default QuickActions;
