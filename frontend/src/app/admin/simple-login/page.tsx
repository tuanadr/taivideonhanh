'use client';

import { useState } from 'react';

export default function SimpleAdminLogin() {
  const [email, setEmail] = useState('admin@taivideonhanh.vn');
  const [password, setPassword] = useState('admin123456');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setMessage('✅ Đăng nhập thành công!');
        localStorage.setItem('adminToken', data.token);
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        setMessage(`❌ Lỗi: ${data.error || 'Đăng nhập thất bại'}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage(`❌ Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testAPI = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setMessage(`✅ API Health: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setMessage(`❌ API Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '50px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>🔐 Admin Login (Debug)</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testAPI}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test API Health
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '14px'
            }}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: isLoading ? '#6c757d' : '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
        </button>
      </form>

      {message && (
        <div style={{ 
          marginTop: '15px', 
          padding: '15px', 
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da', 
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '4px',
        fontSize: '12px', 
        color: '#495057' 
      }}>
        <h4>🔧 Debug Info:</h4>
        <p><strong>API URL:</strong> /api/admin/login</p>
        <p><strong>Default Email:</strong> admin@taivideonhanh.vn</p>
        <p><strong>Default Password:</strong> admin123456</p>
        <p><strong>Environment:</strong> {process.env.NODE_ENV}</p>
      </div>
    </div>
  );
}
