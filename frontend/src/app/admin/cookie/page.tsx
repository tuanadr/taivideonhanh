'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Trash2,
  TestTube,
  RefreshCw,
  Cookie,
  Clock,
  HardDrive,
  Info
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [uploadProgress] = useState(0);
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
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success('Cookie file đã được xóa thành công');
        setCookieInfo(null);
        setShowDeleteDialog(false);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Cookie YouTube
          </h1>
          <p className="text-gray-600">
            Quản lý cookie xác thực cho YouTube và các platform khác
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchCookieInfo}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {/* Status Alert */}
      {cookieInfo && (
        <Alert className={cookieInfo.isValid ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
          {cookieInfo.isValid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          )}
          <AlertDescription>
            {cookieInfo.isValid
              ? 'Cookie đang hoạt động bình thường và hợp lệ'
              : 'Cookie có thể đã hết hạn hoặc không hợp lệ, cần kiểm tra lại'
            }
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Cookie Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Trạng thái Cookie hiện tại
            </CardTitle>
            <CardDescription>
              Thông tin chi tiết về cookie đang sử dụng
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cookieInfo ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <FileText className="h-8 w-8 text-blue-600 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{cookieInfo.filename}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <HardDrive className="h-3 w-3 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatFileSize(cookieInfo.size)}</span>
                      <Clock className="h-3 w-3 text-gray-400 ml-2" />
                      <span className="text-sm text-gray-600">{formatDate(cookieInfo.uploadedAt)}</span>
                    </div>
                    {cookieInfo.supportedPlatforms && cookieInfo.supportedPlatforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cookieInfo.supportedPlatforms.map((platform) => (
                          <Badge key={platform} variant="secondary" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant={cookieInfo.isValid ? 'default' : 'destructive'}>
                    {cookieInfo.isValid ? 'Hợp lệ' : 'Không hợp lệ'}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={testCookieFile}
                    disabled={isTesting}
                    variant="outline"
                    className="gap-2 flex-1"
                  >
                    <TestTube className="h-4 w-4" />
                    {isTesting ? 'Đang kiểm tra...' : 'Kiểm tra Cookie'}
                  </Button>

                  <Button
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                    className="gap-2 flex-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa Cookie
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có Cookie file</h3>
                <p className="text-gray-600">Upload cookie file để cải thiện khả năng tải video</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Cookie mới
            </CardTitle>
            <CardDescription>
              Tải lên file cookie để cải thiện khả năng tải video
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isDragging ? 'Thả file vào đây' : 'Kéo thả file cookie hoặc click để chọn'}
              </h3>
              <p className="text-gray-600 mb-4">
                Chỉ chấp nhận file .txt, tối đa 5MB<br/>
                Hỗ trợ cookie cho YouTube, TikTok, Facebook, Instagram và nhiều platform khác
              </p>

              {isUploading && (
                <div className="mb-4">
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-sm text-gray-600 mt-2">Đang upload... {uploadProgress}%</p>
                </div>
              )}

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Đang upload...' : 'Chọn file'}
              </Button>

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

            <Alert className="mt-6">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Hướng dẫn lấy Cookie Multi-Platform:</p>
                  <ol className="text-sm space-y-1 list-decimal list-inside ml-4">
                    <li>Cài đặt extension &quot;Get cookies.txt LOCALLY&quot; trên Chrome</li>
                    <li>Đăng nhập vào các platform cần thiết (YouTube, TikTok, Facebook, etc.)</li>
                    <li>Truy cập từng trang web và đảm bảo đã đăng nhập thành công</li>
                    <li>Click vào extension và export cookies</li>
                    <li>Upload file cookies.txt vào đây</li>
                  </ol>
                  <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> Một file cookie có thể chứa cookies cho nhiều platform.
                      Hệ thống sẽ tự động sử dụng cookies phù hợp cho từng trang web.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Xóa Cookie File"
        description="Bạn có chắc chắn muốn xóa cookie file hiện tại? Hành động này không thể hoàn tác và có thể ảnh hưởng đến khả năng tải video."
        confirmText="Xóa"
        cancelText="Hủy"
        variant="destructive"
        onConfirm={deleteCookieFile}
      />
    </div>
  );
}
