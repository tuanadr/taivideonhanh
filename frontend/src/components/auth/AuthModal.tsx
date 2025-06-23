"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  const handleSuccess = () => {
    onClose();
  };

  const handleSwitchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' 
              ? 'Đăng nhập vào tài khoản của bạn' 
              : 'Tạo tài khoản mới'
            }
          </DialogDescription>
        </DialogHeader>
        
        {mode === 'login' ? (
          <LoginForm 
            onSwitchToRegister={handleSwitchMode}
            onSuccess={handleSuccess}
          />
        ) : (
          <RegisterForm 
            onSwitchToLogin={handleSwitchMode}
            onSuccess={handleSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
