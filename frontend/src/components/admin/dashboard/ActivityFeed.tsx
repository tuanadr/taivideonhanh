'use client';

import React, { memo, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  UserPlus, 
  Download, 
  CreditCard, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

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
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
}

const getActivityConfig = (type: string) => {
  switch (type) {
    case 'user_register':
      return {
        icon: UserPlus,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        badgeColor: 'bg-blue-100 text-blue-700'
      };
    case 'download':
      return {
        icon: Download,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        badgeColor: 'bg-green-100 text-green-700'
      };
    case 'payment':
      return {
        icon: CreditCard,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        badgeColor: 'bg-purple-100 text-purple-700'
      };
    case 'system':
      return {
        icon: Settings,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        badgeColor: 'bg-gray-100 text-gray-700'
      };
    case 'error':
      return {
        icon: AlertTriangle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        badgeColor: 'bg-red-100 text-red-700'
      };
    case 'success':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        badgeColor: 'bg-green-100 text-green-700'
      };
    default:
      return {
        icon: Activity,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        badgeColor: 'bg-gray-100 text-gray-700'
      };
  }
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

const ActivityFeedSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const ActivityFeed = memo<ActivityFeedProps>(({ 
  activities, 
  isLoading = false, 
  maxItems = 10 
}) => {
  const displayedActivities = useMemo(() => {
    return activities.slice(0, maxItems);
  }, [activities, maxItems]);

  if (isLoading) {
    return <ActivityFeedSkeleton />;
  }

  if (activities.length === 0) {
    return (
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
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có hoạt động nào</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Hoạt động gần đây
        </CardTitle>
        <CardDescription>
          {activities.length} sự kiện mới nhất trong hệ thống
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedActivities.map((activity, index) => {
            const config = getActivityConfig(activity.type);
            const ActivityIcon = config.icon;

            return (
              <div 
                key={activity.id}
                className={`
                  flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors
                  ${index === 0 ? 'bg-blue-50/50' : ''}
                `}
                role="listitem"
                aria-label={`${activity.title} - ${formatTimeAgo(activity.timestamp)}`}
              >
                {/* Activity Icon or User Avatar */}
                <div className="flex-shrink-0">
                  {activity.user ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.avatar} alt={activity.user.name || activity.user.email} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                        {(activity.user.name || activity.user.email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className={`p-1.5 rounded-full ${config.bgColor}`}>
                      <ActivityIcon className={`h-4 w-4 ${config.color}`} aria-hidden="true" />
                    </div>
                  )}
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {activity.description}
                        </p>
                      )}
                      {activity.user && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {activity.user.email}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        <time dateTime={activity.timestamp}>
                          {formatTimeAgo(activity.timestamp)}
                        </time>
                      </div>
                      <Badge className={`text-xs ${config.badgeColor}`}>
                        {activity.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {activities.length > maxItems && (
          <div className="mt-4 text-center">
            <button 
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              onClick={() => {/* Handle view more */}}
            >
              Xem thêm {activities.length - maxItems} hoạt động
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
