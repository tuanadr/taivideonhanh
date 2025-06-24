'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserMenu } from '@/components/auth/UserMenu';
import { LogIn, UserPlus, Crown, Home, Download } from 'lucide-react';

export const Navigation: React.FC = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { isPro, currentSubscription } = useSubscription();

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  if (authLoading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <>
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and Navigation Links */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2">
                <Download className="w-6 h-6 text-primary" />
                <span className="font-bold text-lg">TaiVideoNhanh</span>
              </Link>
              
              {isAuthenticated && (
                <div className="hidden md:flex items-center space-x-4">
                  <Link href="/">
                    <Button variant="ghost" size="sm">
                      <Home className="w-4 h-4 mr-2" />
                      Trang chủ
                    </Button>
                  </Link>
                  

                  
                  <Link href="/subscription">
                    <Button variant="ghost" size="sm">
                      <Crown className="w-4 h-4 mr-2" />
                      Subscription
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Subscription Status */}
                  <div className="hidden sm:flex items-center space-x-2">
                    <Badge variant={isPro() ? 'default' : 'secondary'}>
                      {isPro() ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          Pro
                        </>
                      ) : (
                        'Free'
                      )}
                    </Badge>
                    
                    {currentSubscription && currentSubscription.daysRemaining <= 7 && (
                      <Badge variant="destructive" className="text-xs">
                        {currentSubscription.daysRemaining} days left
                      </Badge>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="hidden md:flex items-center space-x-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{user?.email}</span>
                    </div>
                  </div>

                  {/* User Menu */}
                  <UserMenu />
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" onClick={() => openAuthModal('login')}>
                    <LogIn className="w-4 h-4 mr-2" />
                    Đăng nhập
                  </Button>
                  <Button onClick={() => openAuthModal('register')}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Đăng ký
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          {isAuthenticated && (
            <div className="md:hidden border-t py-2">
              <div className="flex items-center justify-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <Home className="w-4 h-4" />
                  </Button>
                </Link>
                

                
                <Link href="/subscription">
                  <Button variant="ghost" size="sm">
                    <Crown className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authModalMode}
      />
    </>
  );
};
