"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import Image from 'next/image';
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/layout/Navigation";

interface VideoFormat {
  format_id: string;
  format_note: string;
  ext: string;
  resolution: string;
  vcodec: string;
  acodec: string;
  filesize: number | null;
}

interface VideoInfo {
  title: string;
  thumbnail: string;
  formats: VideoFormat[];
}

const getQualityBadge = (resolution: string) => {
  if (!resolution) return null;
  const height = parseInt(resolution.split('x')[1]);
  if (height >= 4320) return { label: '8K', color: 'bg-purple-600' };
  if (height >= 2160) return { label: '4K', color: 'bg-red-600' };
  if (height >= 1440) return { label: '2K', color: 'bg-blue-600' };
  if (height >= 1080) return { label: 'FHD', color: 'bg-green-600' };
  if (height >= 720) return { label: 'HD', color: 'bg-yellow-600 text-black' };
  return null;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const { isAuthenticated, isLoading: authLoading, user, makeAuthenticatedRequest } = useAuth();

  const handleGetInfo = async () => {
    // Check authentication for free users
    if (!isAuthenticated) {
      toast.error("Vui lòng đăng nhập để sử dụng tính năng này");
      return;
    }

    if (!url) {
      toast.error("Vui lòng nhập URL video");
      return;
    }
    setLoading(true);
    setVideoInfo(null);
    toast.info("Đang lấy thông tin video...");

    try {
      const response = await makeAuthenticatedRequest("/api/info", {
        method: "POST",
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lấy thông tin video thất bại");
      }

      const data: VideoInfo = await response.json();
      setVideoInfo(data);
      toast.success("Lấy thông tin video thành công!");

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format_id: string, title: string, ext: string) => {
    setDownloadingFormat(format_id);
    toast.info("Đang chuẩn bị tải xuống...");

    console.log('Download request:', { url, format_id, title, ext });

    try {
      const response = await makeAuthenticatedRequest("/api/download", {
        method: "POST",
        // Gửi đầy đủ thông tin cần thiết cho backend
        body: JSON.stringify({ url, format_id, title, ext }),
      });

      console.log('Download response status:', response.status, response.statusText);

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorDetails = "Tải video thất bại";

        try {
          if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await response.json();
            errorDetails = errorData.error || errorDetails;
          } else {
            // Cố gắng đọc lỗi dưới dạng text nếu không phải JSON
            const errorText = await response.text();
            console.error('Error response text:', errorText);

            // Check if it's HTML error page (service not reachable)
            if (errorText.includes('Service is not reachable') || errorText.includes('<!DOCTYPE html>')) {
              errorDetails = 'Dịch vụ backend không khả dụng. Vui lòng kiểm tra kết nối hoặc thử lại sau.';
            } else {
              errorDetails = errorText || errorDetails;
            }
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          errorDetails = `Lỗi server (${response.status}): Không thể kết nối đến dịch vụ backend.`;
        }

        throw new Error(errorDetails);
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const fileName = `${title}.${ext}`.replace(/[\\/:*?"<>|]/g, '_'); // Sanitize filename
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href); // Giải phóng bộ nhớ

      toast.success("Tải video thành công!");

    } catch (error: unknown) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : "Đã xảy ra lỗi không xác định.";

      // Try fallback endpoint if main endpoint fails
      if (errorMessage.includes('backend không khả dụng') || errorMessage.includes('Service is not reachable')) {
        toast.error('Backend không khả dụng. Đang thử endpoint dự phòng...');
        try {
          const fallbackResponse = await makeAuthenticatedRequest("/api/info/download", {
            method: "POST",
            body: JSON.stringify({ url, format_id, title }),
          });

          if (fallbackResponse.ok) {
            const blob = await fallbackResponse.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            const fileName = `${title}.${ext}`.replace(/[\\/:*?"<>|]/g, '_');
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);

            toast.success("Tải video thành công qua endpoint dự phòng!");
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback endpoint also failed:', fallbackError);
        }
      }

      toast.error(errorMessage);
    } finally {
      setDownloadingFormat(null);
    }
  };



  if (authLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Đang tải...</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Navigation />
      <main className="flex min-h-screen flex-col items-center justify-center p-8">

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold">TaiVideoNhanh SaaS Platform</h1>
        <p className="text-muted-foreground">Nền tảng tải video nhanh chóng và dễ dàng</p>
        {isAuthenticated && (
          <div className="mt-2">
            <Badge variant={user?.subscription_tier === 'pro' ? 'default' : 'secondary'}>
              {user?.subscription_tier === 'pro' ? 'Pro User' : 'Free User'}
            </Badge>
          </div>
        )}
      </div>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Tải video</CardTitle>
          <CardDescription>Dán link video bạn muốn tải xuống.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            placeholder="https://www.youtube.com/watch?v=..." 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Cách sử dụng</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Hướng dẫn sử dụng</DialogTitle>
                <DialogDescription>
                  1. Sao chép URL của video bạn muốn tải. <br />
                  2. Dán URL vào ô nhập liệu. <br />
                  3. Nhấn nút &quot;Tải xuống&quot; và chờ đợi. <br />
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <Button onClick={handleGetInfo} disabled={loading}>
            {isAuthenticated ? 'Tải xuống' : 'Đăng nhập để tải'}
          </Button>
        </CardFooter>
      </Card>

      {videoInfo && (
        <Card className="w-full max-w-4xl mt-8">
          <CardHeader>
            <CardTitle>{videoInfo.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Image src={videoInfo.thumbnail} alt={videoInfo.title} className="rounded-lg mb-4" width={400} height={225} unoptimized={true} />
            <div className="w-full">
              <h3 className="font-bold mb-2">Chọn chất lượng:</h3>
              <ul className="space-y-2">
                                                    {Object.values(
                                                        videoInfo.formats
                                                            .filter(f => {
                                                                // Chỉ chọn formats có cả video và audio
                                                                if (f.vcodec === 'none' || f.acodec === 'none' || f.ext !== 'mp4' || !f.resolution) return false;
                                                                const height = parseInt(f.resolution.split('x')[1]);
                                                                return height >= 720;
                                                            })
                                                            .reduce((acc, f) => {
                                                                const existingFormat = acc[f.resolution];
                                                                if (!existingFormat) {
                                                                    acc[f.resolution] = f;
                                                                } else if (f.filesize !== null) {
                                                                    if (existingFormat.filesize === null || f.filesize > existingFormat.filesize) {
                                                                        acc[f.resolution] = f;
                                                                    }
                                                                }
                                                                return acc;
                                                            }, {} as Record<string, VideoFormat>)
                                                    ).sort((a, b) => {
                                                        const aRes = parseInt(a.resolution.split('x')[1]);
                                                        const bRes = parseInt(b.resolution.split('x')[1]);
                                                        return bRes - aRes;
                                                    }).map((format) => (
                  <li key={format.format_id} className="flex justify-between items-center p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      {getQualityBadge(format.resolution) && (
                        <Badge variant="destructive" className={`${getQualityBadge(format.resolution)?.color}`}>
                          {getQualityBadge(format.resolution)?.label}
                        </Badge>
                      )}
                      {format.acodec && format.acodec !== 'none' && (
                        <Badge variant="default" className="bg-green-500">
                          🔊 Có âm thanh
                        </Badge>
                      )}
                      <span className="text-sm">{format.resolution || format.format_note} - {format.ext}</span>
                    </div>
                    <Button 
                      variant="secondary"
                      onClick={() => handleDownload(format.format_id, videoInfo.title, format.ext)}
                      disabled={downloadingFormat !== null}
                    >
                      {downloadingFormat === format.format_id ? 'Đang tải...' : 'Tải xuống'}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      </main>
    </>
  );
}
