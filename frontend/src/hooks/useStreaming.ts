"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface VideoFormat {
  format_id: string;
  ext: string;
  resolution?: string;
  fps?: number;
  filesize?: number;
  acodec?: string;
  vcodec?: string;
  format_note?: string;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: number;
  formats: VideoFormat[];
  description?: string;
  uploader?: string;
  upload_date?: string;
}

interface AnalysisResult {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    videoInfo: VideoInfo;
    supportedFormatsCount: number;
  };
  error?: string;
}

interface StreamToken {
  token: string;
  expiresAt: string;
  streamUrl: string;
}

interface StreamingProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed: number;
  timeRemaining: number;
}

export const useStreaming = () => {
  const { tokens } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);
  const [streamToken, setStreamToken] = useState<StreamToken | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingProgress, setStreamingProgress] = useState<StreamingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // API base URL
  const API_BASE = '/api';

  /**
   * Make authenticated API request
   */
  const apiRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!tokens?.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, [tokens?.accessToken]);

  /**
   * Analyze video URL to get available formats
   */
  const analyzeVideo = useCallback(async (url: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setError(null);

    try {
      // Start analysis
      const startResponse = await apiRequest('/streaming/analyze', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      const requestId = startResponse.requestId;

      // Poll for results
      const pollResults = async () => {
        try {
          const result = await apiRequest(`/streaming/analyze/${requestId}`);
          
          setAnalysisResult(result);

          if (result.status === 'completed') {
            setIsAnalyzing(false);
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            toast.success('Video analysis completed');
          } else if (result.status === 'failed') {
            setIsAnalyzing(false);
            setError(result.error || 'Analysis failed');
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            toast.error('Video analysis failed');
          }
        } catch (error) {
          console.error('Polling error:', error);
          setError(error instanceof Error ? error.message : 'Polling failed');
          setIsAnalyzing(false);
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      };

      // Start polling
      pollingIntervalRef.current = setInterval(pollResults, 2000);
      
      // Initial poll
      await pollResults();

    } catch (error) {
      setIsAnalyzing(false);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      toast.error('Failed to start video analysis');
    }
  }, [apiRequest]);

  /**
   * Create stream token for download
   */
  const createStreamToken = useCallback(async (videoUrl: string, formatId: string, title?: string) => {
    setIsCreatingToken(true);
    setError(null);

    try {
      const response = await apiRequest('/streaming/token', {
        method: 'POST',
        body: JSON.stringify({
          videoUrl,
          formatId,
          title,
        }),
      });

      setStreamToken({
        token: response.token,
        expiresAt: response.expiresAt,
        streamUrl: response.streamUrl,
      });

      toast.success('Stream token created successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create stream token');
      toast.error('Failed to create stream token');
    } finally {
      setIsCreatingToken(false);
    }
  }, [apiRequest]);

  /**
   * Start streaming download
   */
  const startStreaming = useCallback(async (token: string, filename?: string) => {
    if (!token) {
      setError('No stream token available');
      return;
    }

    setIsStreaming(true);
    setStreamingProgress({ loaded: 0, total: 0, percentage: 0, speed: 0, timeRemaining: 0 });
    setError(null);

    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE}/streaming/stream/${token}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens?.accessToken}`,
        },
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      let loaded = 0;
      const startTime = Date.now();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Calculate progress
        const percentage = total > 0 ? (loaded / total) * 100 : 0;
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = loaded / elapsed; // bytes per second
        const timeRemaining = total > 0 && speed > 0 ? (total - loaded) / speed : 0;

        setStreamingProgress({
          loaded,
          total,
          percentage,
          speed,
          timeRemaining,
        });
      }

      // Create blob and download
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'video';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download completed successfully');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast.info('Download cancelled');
      } else {
        setError(error instanceof Error ? error.message : 'Streaming failed');
        toast.error('Download failed');
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [tokens?.accessToken]);

  /**
   * Cancel streaming
   */
  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Refresh stream token
   */
  const refreshStreamToken = useCallback(async (token: string) => {
    try {
      await apiRequest(`/streaming/token/${token}/refresh`, {
        method: 'POST',
      });
      toast.success('Token refreshed successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to refresh token');
      toast.error('Failed to refresh token');
    }
  }, [apiRequest]);

  /**
   * Revoke stream token
   */
  const revokeStreamToken = useCallback(async (token: string) => {
    try {
      await apiRequest(`/streaming/token/${token}`, {
        method: 'DELETE',
      });
      setStreamToken(null);
      toast.success('Token revoked successfully');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke token');
      toast.error('Failed to revoke token');
    }
  }, [apiRequest]);

  /**
   * Clear all state
   */
  const clearState = useCallback(() => {
    setAnalysisResult(null);
    setStreamToken(null);
    setStreamingProgress(null);
    setError(null);
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    isAnalyzing,
    analysisResult,
    isCreatingToken,
    streamToken,
    isStreaming,
    streamingProgress,
    error,

    // Actions
    analyzeVideo,
    createStreamToken,
    startStreaming,
    cancelStreaming,
    refreshStreamToken,
    revokeStreamToken,
    clearState,
  };
};
