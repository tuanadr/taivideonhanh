'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  TestTube,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface CookieInfo {
  filename: string;
  size: number;
  uploadedAt: string;
  isValid: boolean;
  lastValidated?: string;
  supportedPlatforms?: string[];
}

export default function CookieManagementPage() {
  const [cookieInfo, setCookieInfo] = useState<CookieInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCookieInfo();
  }, []);

  const fetchCookieInfo = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie/info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCookieInfo(data.cookieInfo);
      }
    } catch (error) {
      console.error('Failed to fetch cookie info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.txt')) {
      toast.error('Chỉ chấp nhận file .txt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File không được vượt quá 5MB');
      return;
    }

    uploadCookieFile(file);
  };

  const uploadCookieFile = async (file: File) => {
    setIsUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        const base64Content = content.split(',')[1]; // Remove data:text/plain;base64, prefix

        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/admin/cookie/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content: base64Content,
            filename: file.name
          })
        });

        const data = await response.json();

        if (response.ok) {
          toast.success('Cookie file đã được upload thành công!');
          setCookieInfo(data.cookieInfo);
          
          if (data.testResult?.success) {
            toast.success('Cookie đã được kiểm tra và hoạt động tốt!');
          } else {
            toast.warning(`Cookie upload thành công nhưng test thất bại: ${data.testResult?.error}`);
          }
        } else {
          toast.error(data.error || 'Upload thất bại');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi xảy ra khi upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const testCookieFile = async () => {
    setIsTesting(true);

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        if (data.testResult?.success) {
          toast.success('Cookie hoạt động tốt!');
        } else {
          toast.error(`Cookie test thất bại: ${data.testResult?.error}`);
        }
      } else {
        toast.error('Không thể test cookie');
      }
    } catch (error) {
      console.error('Test error:', error);
      toast.error('Có lỗi xảy ra khi test cookie');
    } finally {
      setIsTesting(false);
    }
  };

  const deleteCookieFile = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa cookie file?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Cookie file đã được xóa');
        setCookieInfo(null);
      } else {
        toast.error('Không thể xóa cookie file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Có lỗi xảy ra khi xóa cookie');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Cookie YouTube</h1>
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Cookie YouTube</h1>
        <button
          onClick={fetchCookieInfo}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </button>
      </div>

      {/* Current Cookie Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái Cookie hiện tại</h2>
        
        {cookieInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{cookieInfo.filename}</h3>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(cookieInfo.size)} • Upload lúc {formatDate(cookieInfo.uploadedAt)}
                  </p>
                  {cookieInfo.supportedPlatforms && cookieInfo.supportedPlatforms.length > 0 && (
                    <p className="text-sm text-blue-600">
                      Platforms: {cookieInfo.supportedPlatforms.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {cookieInfo.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  cookieInfo.isValid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {cookieInfo.isValid ? 'Hợp lệ' : 'Không hợp lệ'}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={testCookieFile}
                disabled={isTesting}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Đang test...' : 'Test Cookie'}
              </button>
              
              <button
                onClick={deleteCookieFile}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa Cookie
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có Cookie file</h3>
            <p className="text-gray-600">Upload cookie file để cải thiện khả năng tải video YouTube</p>
          </div>
        )}
      </div>

      {/* Upload Area */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Cookie mới</h2>
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Kéo thả file cookie hoặc click để chọn
          </h3>
          <p className="text-gray-600 mb-4">
            Chỉ chấp nhận file .txt, tối đa 5MB<br/>
            Hỗ trợ cookie cho YouTube, TikTok, Facebook, Instagram, Twitter, Twitch, Vimeo và nhiều platform khác
          </p>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? 'Đang upload...' : 'Chọn file'}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className="hidden"
          />
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-yellow-800 mb-2">Hướng dẫn lấy Cookie Multi-Platform:</h4>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>Cài đặt extension &quot;Get cookies.txt LOCALLY&quot; trên Chrome</li>
            <li>Đăng nhập vào các platform cần thiết (YouTube, TikTok, Facebook, etc.)</li>
            <li>Truy cập từng trang web và đảm bảo đã đăng nhập thành công</li>
            <li>Click vào extension và export cookies (sẽ chứa cookies của tất cả domains)</li>
            <li>Upload file cookies.txt vào đây - hệ thống sẽ tự động detect platforms</li>
          </ol>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> Một file cookie có thể chứa cookies cho nhiều platform.
              Hệ thống sẽ tự động sử dụng cookies phù hợp cho từng trang web khi tải video.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
