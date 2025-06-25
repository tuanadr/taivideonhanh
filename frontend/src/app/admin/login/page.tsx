'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@taivideonhanh.vn');
  const [password, setPassword] = useState('admin123456');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Debug logging
  console.log('AdminLoginPage rendered at:', new Date().toISOString());
  console.log('Current URL:', window?.location?.href);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('Đang đăng nhập...');

    try {
      console.log('Attempting login with:', { email, password: '***' });

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        console.error('Login failed:', response.status, errorData);
        setMessage(`❌ Lỗi: ${errorData.error || `Đăng nhập thất bại (${response.status})`}`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        setMessage('✅ Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push('/admin');
        }, 1000);
      } else {
        setMessage('❌ Không nhận được token từ server');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            margin: '0 0 10px 0'
          }}>
            🔐 Admin Login
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#6b7280',
            margin: '0'
          }}>
            Truy cập bảng điều khiển quản trị
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '5px'
            }}>
              📧 Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="admin@taivideonhanh.vn"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '5px'
            }}>
              🔑 Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="admin123456"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
          </button>
        </form>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '12px',
            backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.includes('✅') ? '#a7f3d0' : '#fecaca'}`,
            borderRadius: '6px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#6b7280'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>🔧 Debug Info:</h4>
          <p style={{ margin: '5px 0' }}><strong>API URL:</strong> /api/admin/login</p>
          <p style={{ margin: '5px 0' }}><strong>Default Email:</strong> admin@taivideonhanh.vn</p>
          <p style={{ margin: '5px 0' }}><strong>Default Password:</strong> admin123456</p>
          <p style={{ margin: '5px 0' }}><strong>Environment:</strong> {typeof window !== 'undefined' ? 'client' : 'server'}</p>
          <p style={{ margin: '5px 0' }}><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
