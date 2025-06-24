"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  Loader2, 
  Key, 
  Clock, 
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
// import { VideoAnalyzer } from '@/components/streaming/VideoAnalyzer';
import { StreamingProgress } from '@/components/streaming/StreamingProgress';
import { Navigation } from '@/components/layout/Navigation';
import { useStreaming } from '@/hooks/useStreaming';

export default function StreamingPage() {
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    formatId: string;
    title: string;
  } | null>(null);

  const {
    isCreatingToken,
    streamToken,
    isStreaming,
    streamingProgress,
    error,
    // createStreamToken,
    startStreaming,
    cancelStreaming,
    refreshStreamToken,
    revokeStreamToken,
    clearState,
  } = useStreaming();

  // const handleFormatSelected = async (videoUrl: string, formatId: string, title: string) => {
  //   setSelectedVideo({ url: videoUrl, formatId, title });
  //   await createStreamToken(videoUrl, formatId, title);
  // };

  const handleStartDownload = async () => {
    if (!streamToken || !selectedVideo) return;
    
    const filename = `${selectedVideo.title}.${selectedVideo.formatId}`;
    await startStreaming(streamToken.token, filename);
  };

  const handleRefreshToken = async () => {
    if (!streamToken) return;
    await refreshStreamToken(streamToken.token);
  };

  const handleRevokeToken = async () => {
    if (!streamToken) return;
    await revokeStreamToken(streamToken.token);
    setSelectedVideo(null);
  };

  const handleNewDownload = () => {
    clearState();
    setSelectedVideo(null);
  };

  const isTokenExpired = () => {
    if (!streamToken) return false;
    return new Date(streamToken.expiresAt) < new Date();
  };

  const getTimeUntilExpiry = () => {
    if (!streamToken) return '';
    const now = new Date();
    const expiry = new Date(streamToken.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Streaming Video</h1>
        <p className="text-muted-foreground">
          Quản lý và theo dõi quá trình tải video với streaming thời gian thực
        </p>
      </div>

      {/* Redirect to home for video analysis */}
      {!selectedVideo && (
        <Card>
          <CardHeader>
            <CardTitle>Bắt Đầu Tải Video</CardTitle>
            <CardDescription>
              Để phân tích và tải video, vui lòng sử dụng form tải video trên trang chủ
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Đi Đến Trang Chủ
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Selected Video & Token Management */}
      {selectedVideo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Stream Token
            </CardTitle>
            <CardDescription>
              Manage your download token for the selected video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selected Video Info */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <h3 className="font-medium">{selectedVideo.title}</h3>
              <p className="text-sm text-muted-foreground">
                Format: {selectedVideo.formatId} • URL: {selectedVideo.url.substring(0, 50)}...
              </p>
            </div>

            {/* Token Status */}
            {isCreatingToken && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating stream token...
              </div>
            )}

            {streamToken && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={isTokenExpired() ? 'destructive' : 'default'}>
                      {isTokenExpired() ? 'Expired' : 'Active'}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {isTokenExpired() ? 'Expired' : `Expires in ${getTimeUntilExpiry()}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshToken}
                      disabled={isStreaming}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRevokeToken}
                      disabled={isStreaming}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  </div>
                </div>

                {/* Token Expiry Warning */}
                {isTokenExpired() && (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">
                      Token has expired. Please refresh or create a new token.
                    </p>
                  </div>
                )}

                {/* Download Button */}
                {!isTokenExpired() && (
                  <Button
                    onClick={handleStartDownload}
                    disabled={isStreaming || isTokenExpired()}
                    className="w-full"
                  >
                    {isStreaming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Start Download
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Streaming Progress */}
      {(isStreaming || streamingProgress || error) && (
        <StreamingProgress
          isStreaming={isStreaming}
          progress={streamingProgress}
          onCancel={cancelStreaming}
          error={error}
          fileName={selectedVideo ? `${selectedVideo.title}.${selectedVideo.formatId}` : undefined}
        />
      )}

      {/* New Download Button */}
      {(selectedVideo || streamToken) && !isStreaming && (
        <>
          <Separator />
          <div className="text-center">
            <Button
              variant="outline"
              onClick={handleNewDownload}
            >
              Bắt Đầu Tải Mới
            </Button>
          </div>
        </>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cách Hoạt Động</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Nhập URL video trên trang chủ và nhấn &quot;Phân Tích&quot; để lấy các định dạng có sẵn</p>
          <p>2. Chọn định dạng ưa thích để tạo token stream bảo mật</p>
          <p>3. Nhấn &quot;Bắt Đầu Tải&quot; để bắt đầu streaming video trực tiếp đến thiết bị của bạn</p>
          <p>4. Theo dõi tiến trình thời gian thực và quản lý quá trình tải</p>
          <p className="text-xs mt-4 p-2 bg-muted/50 rounded">
            <strong>Lưu ý:</strong> Token stream hết hạn sau 30 phút để đảm bảo bảo mật.
            Bạn có thể làm mới chúng nếu cần trước khi hết hạn.
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
