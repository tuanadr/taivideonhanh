'use client';

import { useState } from 'react';

export default function SimpleAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Đang đăng nhập...');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Đăng nhập thành công!');
        localStorage.setItem('adminToken', data.token);
        window.location.href = '/admin';
      } else {
        setMessage(`Lỗi: ${data.error || 'Đăng nhập thất bại'}`);
      }
    } catch (error) {
      setMessage(`Lỗi kết nối: ${error}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
      <h1>Admin Login (Simple)</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            required
          />
        </div>
        <button
          type="submit"
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Đăng nhập
        </button>
      </form>
      {message && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
          {message}
        </div>
      )}
      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>Default credentials:</p>
        <p>Email: admin@taivideonhanh.vn</p>
        <p>Password: admin123456</p>
      </div>
    </div>
  );
}
