'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AdminPageWrapperProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
  maxWidth?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
}

const spacingConfig = {
  tight: 'space-y-4',
  normal: 'space-y-6',
  loose: 'space-y-8'
};

const maxWidthConfig = {
  none: '',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl'
};

export default function AdminPageWrapper({ 
  children, 
  className,
  spacing = 'normal',
  maxWidth = 'none'
}: AdminPageWrapperProps) {
  return (
    <div 
      className={cn(
        'admin-page-wrapper',
        spacingConfig[spacing],
        maxWidth !== 'none' && maxWidthConfig[maxWidth],
        maxWidth !== 'none' && 'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

// Export individual components for specific use cases
export function AdminPageHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('admin-page-header', className)}>
      {children}
    </div>
  );
}

export function AdminPageContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <div className={cn('admin-page-content', className)}>
      {children}
    </div>
  );
}
