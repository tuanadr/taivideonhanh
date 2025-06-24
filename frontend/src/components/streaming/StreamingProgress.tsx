"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Pause, 
  Play, 
  X, 
  Clock, 
  Zap, 
  FileDown,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface StreamingProgressProps {
  isStreaming: boolean;
  progress: {
    loaded: number;
    total: number;
    percentage: number;
    speed: number;
    timeRemaining: number;
  } | null;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;
  error?: string | null;
  fileName?: string;
}

export const StreamingProgress: React.FC<StreamingProgressProps> = ({
  isStreaming,
  progress,
  onCancel,
  onPause,
  onResume,
  isPaused = false,
  error,
  fileName = 'video'
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, startTime]);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-5 w-5 text-destructive" />;
    if (!isStreaming && progress?.percentage === 100) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (isPaused) return <Pause className="h-5 w-5 text-yellow-500" />;
    if (isStreaming) return <Download className="h-5 w-5 text-blue-500" />;
    return <FileDown className="h-5 w-5" />;
  };

  const getStatusText = () => {
    if (error) return 'Download Failed';
    if (!isStreaming && progress?.percentage === 100) return 'Download Completed';
    if (isPaused) return 'Download Paused';
    if (isStreaming) return 'Downloading...';
    return 'Ready to Download';
  };

  const getStatusColor = () => {
    if (error) return 'destructive';
    if (!isStreaming && progress?.percentage === 100) return 'default';
    if (isPaused) return 'secondary';
    if (isStreaming) return 'default';
    return 'outline';
  };

  if (!isStreaming && !progress && !error) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            Tiến Trình Tải
          </div>
          <Badge variant={getStatusColor()}>
            {getStatusText()}
          </Badge>
        </CardTitle>
        <CardDescription>
          {fileName && `Đang tải: ${fileName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tiến trình</span>
              <span>{Math.round(progress.percentage)}%</span>
            </div>
            <Progress 
              value={progress.percentage} 
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatBytes(progress.loaded)}
                {progress.total > 0 && ` / ${formatBytes(progress.total)}`}
              </span>
              <span>
                {progress.percentage < 100 ? `${Math.round(progress.percentage)}%` : 'Hoàn thành'}
              </span>
            </div>
          </div>
        )}

        {/* Statistics */}
        {progress && isStreaming && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">{formatSpeed(progress.speed)}</div>
                <div className="text-xs text-muted-foreground">Tốc độ</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">{formatTime(elapsedTime)}</div>
                <div className="text-xs text-muted-foreground">Đã trôi qua</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <div className="font-medium">
                  {progress.timeRemaining > 0 ? formatTime(Math.ceil(progress.timeRemaining)) : '--:--'}
                </div>
                <div className="text-xs text-muted-foreground">Còn lại</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive font-medium">Tải Thất Bại</p>
            </div>
            <p className="text-sm text-destructive mt-1">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {!isStreaming && progress?.percentage === 100 && !error && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm text-green-800 font-medium">Tải Hoàn Thành Thành Công</p>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Đã tải {progress.total > 0 ? formatBytes(progress.total) : formatBytes(progress.loaded)} trong {formatTime(elapsedTime)}
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-2">
          {isStreaming && (
            <>
              {onPause && onResume && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPaused ? onResume : onPause}
                  disabled={!isStreaming}
                >
                  {isPaused ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Tiếp tục
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Tạm dừng
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
            </>
          )}

          {error && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Thử lại
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {progress && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            <div className="flex justify-between">
              <span>Bắt đầu: {new Date(startTime).toLocaleTimeString()}</span>
              {!isStreaming && progress.percentage === 100 && (
                <span>Hoàn thành: {new Date().toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
