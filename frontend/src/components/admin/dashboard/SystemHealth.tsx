'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Server,
  Database,
  Youtube,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  HardDrive,
  Cpu
} from 'lucide-react';

interface SystemService {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime?: number;
  uptime?: number;
  lastCheck?: string;
}

interface SystemResource {
  name: string;
  used: number;
  total: number;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SystemHealthProps {
  services: SystemService[];
  resources: SystemResource[];
  isLoading?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'online':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-600'
      };
    case 'degraded':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600'
      };
    case 'offline':
      return {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        iconColor: 'text-red-600'
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: AlertTriangle,
        iconColor: 'text-gray-600'
      };
  }
};

const getServiceIcon = (serviceName: string) => {
  switch (serviceName.toLowerCase()) {
    case 'api server':
    case 'api':
      return Server;
    case 'database':
      return Database;
    case 'youtube api':
    case 'youtube':
      return Youtube;
    case 'storage':
      return HardDrive;
    default:
      return Activity;
  }
};

const SystemHealthSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const SystemHealth = memo<SystemHealthProps>(({ services, resources, isLoading = false }) => {
  if (isLoading) {
    return <SystemHealthSkeleton />;
  }

  const getResourceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Services Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tình trạng dịch vụ
          </CardTitle>
          <CardDescription>
            Trạng thái hoạt động của các dịch vụ hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {services.map((service) => {
              const config = getStatusConfig(service.status);
              const ServiceIcon = getServiceIcon(service.name);
              const StatusIcon = config.icon;

              return (
                <div 
                  key={service.name} 
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  role="status"
                  aria-label={`${service.name}: ${service.status}`}
                >
                  <div className="flex items-center gap-3">
                    <ServiceIcon className="h-4 w-4 text-gray-600" aria-hidden="true" />
                    <div>
                      <span className="font-medium text-gray-900">{service.name}</span>
                      {service.responseTime && (
                        <div className="text-xs text-gray-500">
                          Response: {service.responseTime}ms
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${config.iconColor}`} aria-hidden="true" />
                    <Badge className={config.color}>
                      {service.status === 'online' ? 'Online' : 
                       service.status === 'degraded' ? 'Degraded' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Tài nguyên hệ thống
          </CardTitle>
          <CardDescription>
            Sử dụng tài nguyên server hiện tại
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {resources.map((resource) => {
              const percentage = Math.round((resource.used / resource.total) * 100);
              const ResourceIcon = resource.icon;

              return (
                <div key={resource.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ResourceIcon className="h-4 w-4 text-gray-600" aria-hidden="true" />
                      <span className="text-sm font-medium text-gray-900">
                        {resource.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${getResourceColor(percentage)}`}>
                        {percentage}%
                      </span>
                      <div className="text-xs text-gray-500">
                        {resource.used.toFixed(1)} / {resource.total} {resource.unit}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress 
                      value={percentage} 
                      className="h-2"
                      aria-label={`${resource.name} usage: ${percentage}%`}
                    />
                    <div 
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-500 ${getProgressColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SystemHealth.displayName = 'SystemHealth';

export default SystemHealth;
