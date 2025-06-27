'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestAdminLogin() {
  const [email, setEmail] = useState('admin@taivideonhanh.vn');
  const [password, setPassword] = useState('admin123456');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('🔄 Đang đăng nhập...');

    try {
      console.log('🚀 Attempting login with:', { email, password: '***' });
      
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('📡 Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.token) {
        setMessage('✅ Đăng nhập thành công! Đang chuyển hướng...');
        localStorage.setItem('adminToken', data.token);
        
        // Test verify endpoint
        console.log('🔍 Testing verify endpoint...');
        const verifyResponse = await fetch('/api/admin/verify', {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('🔍 Verify response:', verifyResponse.status);
        const verifyData = await verifyResponse.json();
        console.log('🔍 Verify data:', verifyData);
        
        setTimeout(() => {
          console.log('🔄 Redirecting to /admin...');
          router.push('/admin');
        }, 2000);
      } else {
        setMessage(`❌ Lỗi: ${data.error || 'Đăng nhập thất bại'}`);
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setMessage(`💥 Lỗi kết nối: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🧪 Test Admin Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Test trang đăng nhập admin sau khi sửa lỗi
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? '🔄 Đang xử lý...' : '🚀 Test Đăng nhập'}
            </button>
          </div>

          {message && (
            <div className="mt-4 p-3 rounded-md bg-gray-50 border">
              <p className="text-sm text-gray-700">{message}</p>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <a
            href="/admin/login"
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            ← Quay lại trang đăng nhập chính
          </a>
        </div>
      </div>
    </div>
  );
}
