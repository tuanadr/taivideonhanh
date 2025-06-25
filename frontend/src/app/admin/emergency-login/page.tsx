'use client';

import { useState } from 'react';

export default function EmergencyAdminLogin() {
  const [email, setEmail] = useState('admin@taivideonhanh.vn');
  const [password, setPassword] = useState('admin123456');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('🔄 Đang đăng nhập...');

    try {
      console.log('🚨 Emergency login attempt:', { email, password: '***' });
      
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login failed:', response.status, errorText);
        setMessage(`❌ Lỗi ${response.status}: ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Response data:', data);

      if (data.token) {
        localStorage.setItem('adminToken', data.token);
        setMessage('✅ Đăng nhập thành công! Đang chuyển hướng...');
        
        // Force redirect after 1 second
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        setMessage('❌ Không nhận được token từ server');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setMessage(`💥 Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    setMessage('🔍 Đang kiểm tra kết nối...');
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setMessage(`✅ Kết nối OK: ${JSON.stringify(data)}`);
    } catch (error) {
      setMessage(`❌ Lỗi kết nối: ${error}`);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#dc2626',
      backgroundImage: 'linear-gradient(45deg, #dc2626 25%, transparent 25%), linear-gradient(-45deg, #dc2626 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #dc2626 75%), linear-gradient(-45deg, transparent 75%, #dc2626 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '3px solid #dc2626'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold', 
            color: '#dc2626',
            margin: '0 0 10px 0',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
            🚨 EMERGENCY ADMIN LOGIN
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#6b7280',
            margin: '0',
            fontWeight: '500'
          }}>
            Trang đăng nhập khẩn cấp cho admin
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              📧 Email Admin
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#dc2626'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              placeholder="admin@taivideonhanh.vn"
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
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
                padding: '12px 16px',
                border: '2px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#dc2626'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              placeholder="admin123456"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: '1',
                padding: '14px',
                backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {isLoading ? '⏳ ĐANG ĐĂNG NHẬP...' : '🚀 ĐĂNG NHẬP NGAY'}
            </button>
            
            <button
              type="button"
              onClick={testConnection}
              style={{
                padding: '14px 20px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              🔍 TEST
            </button>
          </div>
        </form>

        {message && (
          <div style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            backgroundColor: message.includes('✅') ? '#d1fae5' : message.includes('🔍') ? '#dbeafe' : '#fee2e2', 
            border: `2px solid ${message.includes('✅') ? '#10b981' : message.includes('🔍') ? '#3b82f6' : '#ef4444'}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            textAlign: 'center',
            wordBreak: 'break-word'
          }}>
            {message}
          </div>
        )}

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f9fafb', 
          borderRadius: '8px',
          fontSize: '12px', 
          color: '#6b7280',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#374151', fontWeight: '600' }}>
            🔧 Thông tin Debug:
          </h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>API Endpoint:</strong> /api/admin/login</div>
            <div><strong>Health Check:</strong> /api/health</div>
            <div><strong>Default Email:</strong> admin@taivideonhanh.vn</div>
            <div><strong>Default Password:</strong> admin123456</div>
            <div><strong>Current Time:</strong> {new Date().toLocaleString()}</div>
            <div><strong>User Agent:</strong> {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</div>
          </div>
        </div>

        <div style={{ 
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#9ca3af'
        }}>
          <p style={{ margin: '0' }}>
            🚨 Trang này chỉ dành cho trường hợp khẩn cấp khi không thể truy cập admin login thông thường
          </p>
        </div>
      </div>
    </div>
  );
}
