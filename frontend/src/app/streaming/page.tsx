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
import { VideoAnalyzer } from '@/components/streaming/VideoAnalyzer';
import { StreamingProgress } from '@/components/streaming/StreamingProgress';
import { useStreaming } from '@/hooks/useStreaming';
import { toast } from 'sonner';

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
    createStreamToken,
    startStreaming,
    cancelStreaming,
    refreshStreamToken,
    revokeStreamToken,
    clearState,
  } = useStreaming();

  const handleFormatSelected = async (videoUrl: string, formatId: string, title: string) => {
    setSelectedVideo({ url: videoUrl, formatId, title });
    await createStreamToken(videoUrl, formatId, title);
  };

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
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Video Streaming</h1>
        <p className="text-muted-foreground">
          Analyze videos and download them with real-time streaming
        </p>
      </div>

      {/* Video Analyzer */}
      {!selectedVideo && (
        <VideoAnalyzer onFormatSelected={handleFormatSelected} />
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
              Start New Download
            </Button>
          </div>
        </>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Enter a video URL and click "Analyze" to get available formats</p>
          <p>2. Select your preferred format to create a secure stream token</p>
          <p>3. Click "Start Download" to begin streaming the video directly to your device</p>
          <p>4. Monitor the real-time progress and manage your download</p>
          <p className="text-xs mt-4 p-2 bg-muted/50 rounded">
            <strong>Note:</strong> Stream tokens expire after 30 minutes for security. 
            You can refresh them if needed before they expire.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
