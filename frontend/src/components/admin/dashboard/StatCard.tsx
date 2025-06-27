'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  isLoading?: boolean;
  onClick?: () => void;
  'aria-label'?: string;
}

const colorConfig = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    border: 'border-l-blue-500',
    gradient: 'from-blue-500 to-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    border: 'border-l-green-500',
    gradient: 'from-green-500 to-green-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    border: 'border-l-purple-500',
    gradient: 'from-purple-500 to-purple-600'
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    border: 'border-l-orange-500',
    gradient: 'from-orange-500 to-orange-600'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    border: 'border-l-red-500',
    gradient: 'from-red-500 to-red-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    border: 'border-l-yellow-500',
    gradient: 'from-yellow-500 to-yellow-600'
  }
};

const StatCard = memo<StatCardProps>(({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  color, 
  isLoading = false,
  onClick,
  'aria-label': ariaLabel
}) => {
  const config = colorConfig[color];

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-gray-300 animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      return val.toLocaleString('vi-VN');
    }
    return val;
  };

  const getChangeColor = (changeValue?: number) => {
    if (!changeValue) return 'text-gray-500';
    return changeValue > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getChangeIcon = (changeValue?: number) => {
    if (!changeValue) return null;
    return changeValue > 0 ? '↗' : '↘';
  };

  return (
    <Card 
      className={`
        ${config.border} border-l-4 
        hover:shadow-lg hover:scale-105 
        transition-all duration-300 ease-in-out
        cursor-pointer group
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
      `}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || `${title}: ${formatValue(value)}`}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-600 truncate">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
              {formatValue(value)}
            </p>
            {(change !== undefined || changeLabel) && (
              <div className="flex items-center gap-1">
                {change !== undefined && (
                  <span className={`text-xs font-medium ${getChangeColor(change)}`}>
                    {getChangeIcon(change)} {Math.abs(change)}%
                  </span>
                )}
                {changeLabel && (
                  <span className="text-xs text-gray-500">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={`
            p-3 rounded-full ${config.bg} 
            group-hover:scale-110 transition-transform duration-300
            shadow-sm group-hover:shadow-md
          `}>
            <Icon className={`h-6 w-6 ${config.icon}`} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
