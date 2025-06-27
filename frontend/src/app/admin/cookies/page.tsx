'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  Cookie,
  TestTube,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  HardDrive
} from 'lucide-react';

interface CookieStatus {
  totalCookieFiles: number;
  activeCookieFile: string | null;
  lastUpload: string | null;
  fileSize: number;
  isValid: boolean;
  supportedPlatforms: string[];
  backupCount: number;
}

interface TestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  testedAt: string;
}

export default function CookieManagement() {
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [testUrl, setTestUrl] = useState('https://www.youtube.com');

  useEffect(() => {
    fetchCookieStatus();
  }, []);

  const fetchCookieStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/cookie/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
      } else {
        setMessage('❌ Không thể lấy thông tin cookie system');
      }
    } catch (error) {
      console.error('Error fetching cookie status:', error);
      setMessage('❌ Lỗi kết nối khi lấy thông tin cookie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setMessage('❌ Vui lòng chọn file cookie');
      return;
    }

    try {
      setIsUploading(true);
      setMessage('🔄 Đang upload cookie file...');

      const formData = new FormData();
      formData.append('cookieFile', selectedFile);
      formData.append('description', description);
      formData.append('platform', platform);

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        await response.json();
        setMessage('✅ Upload cookie file thành công!');
        setSelectedFile(null);
        setDescription('');
        
        // Refresh status
        setTimeout(() => {
          fetchCookieStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Lỗi upload: ${errorData.error || 'Không thể upload file'}`);
      }
    } catch (error) {
      console.error('Error uploading cookie:', error);
      setMessage('❌ Lỗi kết nối khi upload cookie');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTestCookie = async () => {
    try {
      setIsTesting(true);
      setMessage('🧪 Đang test cookie...');

      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/cookie/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testUrl })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResult(data.result);
        setMessage(data.result.success ? '✅ Test cookie thành công!' : '❌ Test cookie thất bại');
      } else {
        const errorData = await response.json();
        setMessage(`❌ Lỗi test: ${errorData.error || 'Không thể test cookie'}`);
      }
    } catch (error) {
      console.error('Error testing cookie:', error);
      setMessage('❌ Lỗi kết nối khi test cookie');
    } finally {
      setIsTesting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Chưa có';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p>Đang tải thông tin cookie system...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Cookie className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Cookie Management System</CardTitle>
            <CardDescription>
              Quản lý cookie files cho hệ thống streaming
            </CardDescription>
          </CardHeader>
        </Card>

        {/* System Status */}
        {status && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Trạng Thái Hệ Thống Cookie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{status.totalCookieFiles}</div>
                  <div className="text-sm text-gray-600">Tổng Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{status.backupCount}</div>
                  <div className="text-sm text-gray-600">Backup Files</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">File Size</div>
                  <div className="text-lg font-bold">{formatFileSize(status.fileSize)}</div>
                </div>
                <div className="text-center">
                  <Badge variant={status.isValid ? "default" : "secondary"}>
                    {status.isValid ? "✅ Valid" : "❌ Invalid"}
                  </Badge>
                </div>
              </div>

              <Alert className={status.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                {status.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="space-y-1">
                    <div><strong>Active File:</strong> {status.activeCookieFile || 'Không có'}</div>
                    <div><strong>Last Upload:</strong> {formatDate(status.lastUpload)}</div>
                    <div><strong>Platforms:</strong> {status.supportedPlatforms.join(', ')}</div>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Upload & Test */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upload Cookie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Cookie File
              </CardTitle>
              <CardDescription>
                Upload file cookie (.txt hoặc .json)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cookieFile">Cookie File</Label>
                <Input
                  id="cookieFile"
                  type="file"
                  accept=".txt,.json"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả (tùy chọn)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả về cookie file này..."
                  disabled={isUploading}
                />
              </div>

              <Button 
                onClick={handleFileUpload}
                disabled={isUploading || !selectedFile}
                className="w-full"
              >
                {isUploading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {isUploading ? 'Đang Upload...' : 'Upload Cookie'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Cookie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Cookie
              </CardTitle>
              <CardDescription>
                Kiểm tra tính hợp lệ của cookie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testUrl">Test URL</Label>
                <Input
                  id="testUrl"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  placeholder="https://www.youtube.com"
                  disabled={isTesting}
                />
              </div>

              <Button 
                onClick={handleTestCookie}
                disabled={isTesting || !status?.activeCookieFile}
                className="w-full"
                variant="outline"
              >
                {isTesting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                {isTesting ? 'Đang Test...' : 'Test Cookie'}
              </Button>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-1">
                      <div><strong>Status:</strong> {testResult.success ? 'Success' : 'Failed'}</div>
                      <div><strong>Response Time:</strong> {testResult.responseTime}ms</div>
                      {testResult.statusCode && <div><strong>Status Code:</strong> {testResult.statusCode}</div>}
                      {testResult.error && <div><strong>Error:</strong> {testResult.error}</div>}
                      <div><strong>Tested At:</strong> {formatDate(testResult.testedAt)}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.includes('✅') ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={fetchCookieStatus} 
              variant="outline" 
              className="w-full justify-start"
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm Mới Trạng Thái
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.location.href = '/admin/setup'}
            >
              <HardDrive className="mr-2 h-4 w-4" />
              Quay Về Admin Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
