"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Download, Clock, FileVideo, Info } from 'lucide-react';
import { useStreaming } from '@/hooks/useStreaming';
import Image from 'next/image';

interface VideoAnalyzerProps {
  onFormatSelected?: (videoUrl: string, formatId: string, title: string) => void;
}

export const VideoAnalyzer: React.FC<VideoAnalyzerProps> = ({ onFormatSelected }) => {
  const [url, setUrl] = useState('');
  const { 
    isAnalyzing, 
    analysisResult, 
    error, 
    analyzeVideo, 
    clearState 
  } = useStreaming();

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    
    clearState();
    await analyzeVideo(url.trim());
  };

  const handleFormatSelect = (formatId: string) => {
    if (analysisResult?.result && onFormatSelected) {
      onFormatSelected(url, formatId, analysisResult.result.videoInfo.title);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityBadgeColor = (resolution?: string) => {
    if (!resolution) return 'secondary';
    const height = parseInt(resolution.split('x')[1] || '0');
    if (height >= 1080) return 'default';
    if (height >= 720) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Video Analysis
          </CardTitle>
          <CardDescription>
            Enter a video URL to analyze available formats and quality options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter video URL (YouTube, etc.)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isAnalyzing}
              className="flex-1"
            />
            <Button 
              onClick={handleAnalyze}
              disabled={!url.trim() || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>

          {/* Analysis Progress */}
          {isAnalyzing && analysisResult && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analysis Progress</span>
                <span>{analysisResult.progress}%</span>
              </div>
              <Progress value={analysisResult.progress} className="w-full" />
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

      {/* Video Information */}
      {analysisResult?.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Video Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {analysisResult.result.videoInfo.thumbnail && (
                <Image
                  src={analysisResult.result.videoInfo.thumbnail}
                  alt="Video thumbnail"
                  width={128}
                  height={96}
                  className="w-32 h-24 object-cover rounded-md"
                />
              )}
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">
                  {analysisResult.result.videoInfo.title}
                </h3>
                {analysisResult.result.videoInfo.uploader && (
                  <p className="text-sm text-muted-foreground">
                    By {analysisResult.result.videoInfo.uploader}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {analysisResult.result.videoInfo.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(analysisResult.result.videoInfo.duration)}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <FileVideo className="h-4 w-4" />
                    {analysisResult.result.supportedFormatsCount} formats available
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Formats */}
      {analysisResult?.result && analysisResult.result.videoInfo.formats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Available Formats
            </CardTitle>
            <CardDescription>
              Select a format to create a download token
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysisResult.result.videoInfo.formats.map((format) => (
                <div
                  key={format.format_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={getQualityBadgeColor(format.resolution)}>
                          {format.resolution || 'Unknown'}
                        </Badge>
                        <Badge variant="outline">
                          {format.ext.toUpperCase()}
                        </Badge>
                        {format.fps && (
                          <Badge variant="outline">
                            {format.fps}fps
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format.format_note && (
                          <span>{format.format_note} • </span>
                        )}
                        {format.acodec && format.acodec !== 'none' && (
                          <span>Audio: {format.acodec} • </span>
                        )}
                        {format.vcodec && format.vcodec !== 'none' && (
                          <span>Video: {format.vcodec} • </span>
                        )}
                        Size: {formatFileSize(format.filesize)}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleFormatSelect(format.format_id)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
