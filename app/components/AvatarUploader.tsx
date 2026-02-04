"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Props {
  value?: string | null;
  onChange?: (url: string) => void;
  uploadEndpoint?: string;
  getHeaders?: () => Record<string, string> | null;
  requireAuth?: boolean;
}

export function AvatarUploader({
  value,
  onChange,
  uploadEndpoint,
  getHeaders,
  requireAuth,
}: Props) {
  const [preview, setPreview] = useState<string | null>(value ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropBoxSize, setCropBoxSize] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; r: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingUrlRef = useRef<string | null>(null);
  const cropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPreview(value ?? null);
    if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    pendingUrlRef.current = null;
    setPendingUrl(null);
    setPendingFile(null);
    setCrop(null);
    setCropBoxSize(0);
    setDragging(false);
    setZoom(1);
  }, [value]);

  useEffect(() => {
    return () => {
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingFile) {
      setCrop(null);
      setCropBoxSize(0);
      setZoom(1);
      return;
    }
    const syncBox = () => {
      if (!cropRef.current) return;
      const rect = cropRef.current.getBoundingClientRect();
      const size = rect.width;
      if (!size) return;
      const r = Math.max(32, Math.round(size * 0.38));
      setCropBoxSize(size);
      setCrop({ x: size / 2, y: size / 2, r });
    };
    const raf = requestAnimationFrame(syncBox);
    window.addEventListener("resize", syncBox);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncBox);
    };
  }, [pendingFile]);

  const handleSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("图片需小于 2MB");
      return;
    }
    if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    const url = URL.createObjectURL(file);
    pendingUrlRef.current = url;
    setPendingUrl(url);
    setPendingFile(file);
    setZoom(1);
  };

  const cropToCircle = async (
    file: File,
    cropInfo: { x: number; y: number; r: number } | null,
    boxSize: number,
    zoomLevel: number,
    size = 512
  ): Promise<Blob> => {
    let bitmap: ImageBitmap | null = null;
    if ("createImageBitmap" in window) {
      bitmap = await createImageBitmap(file);
    }
    const image = bitmap
      ? null
      : await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("图片读取失败"));
          img.src = URL.createObjectURL(file);
        });
    const width = bitmap ? bitmap.width : image!.naturalWidth;
    const height = bitmap ? bitmap.height : image!.naturalHeight;
    const maxSide = Math.min(width, height);
    let sx = Math.max(0, (width - maxSide) / 2);
    let sy = Math.max(0, (height - maxSide) / 2);
    let side = maxSide;
    if (cropInfo && boxSize > 0) {
      const baseScale = Math.max(boxSize / width, boxSize / height);
      const scale = baseScale * Math.max(1, zoomLevel);
      const dispW = width * scale;
      const dispH = height * scale;
      const offsetX = (boxSize - dispW) / 2;
      const offsetY = (boxSize - dispH) / 2;
      const srcSize = (cropInfo.r * 2) / scale;
      if (srcSize <= maxSide) {
        const srcX = (cropInfo.x - cropInfo.r - offsetX) / scale;
        const srcY = (cropInfo.y - cropInfo.r - offsetY) / scale;
        sx = Math.min(Math.max(0, srcX), Math.max(0, width - srcSize));
        sy = Math.min(Math.max(0, srcY), Math.max(0, height - srcSize));
        side = srcSize;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("无法创建画布");
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (bitmap) {
      ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    } else {
      ctx.drawImage(image!, sx, sy, side, side, 0, 0, size, size);
    }
    ctx.restore();
    if (bitmap && "close" in bitmap) bitmap.close();
    if (image) URL.revokeObjectURL(image.src);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("图片处理失败"))), "image/png", 0.92);
    });
    return blob;
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    const endpoint = uploadEndpoint || `${API_BASE}/api/me/avatar`;
    const needsAuth = requireAuth ?? !uploadEndpoint;
    const headersFromProp = getHeaders?.() ?? null;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers = headersFromProp ?? (token ? { Authorization: `Bearer ${token}` } : null);
    if (needsAuth && !headers) {
      alert("请先登录");
      return;
    }
    setUploading(true);
    try {
      const blob = await cropToCircle(pendingFile, crop, cropBoxSize, zoom);
      const form = new FormData();
      form.append("avatar", new File([blob], "avatar.png", { type: "image/png" }));
      const res = await fetch(endpoint, {
        method: "POST",
        headers: headers ?? undefined,
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "上传失败");
      }
      const data = await res.json();
      const url = data.avatar_url as string;
      setPreview(url);
      onChange?.(url);
      if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
      pendingUrlRef.current = null;
      setPendingUrl(null);
      setPendingFile(null);
    } catch (err: any) {
      alert(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const clampCenter = (x: number, y: number, r: number, size: number) => ({
    x: Math.min(Math.max(r, x), size - r),
    y: Math.min(Math.max(r, y), size - r),
    r,
  });

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!crop || !cropRef.current || uploading) return;
    const rect = cropRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrop((prev) => (prev ? clampCenter(x, y, prev.r, rect.width) : prev));
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !crop || !cropRef.current || uploading) return;
    const rect = cropRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCrop((prev) => (prev ? clampCenter(x, y, prev.r, rect.width) : prev));
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={cropRef}
        className={`relative overflow-hidden border-2 border-[#f3d4e8] bg-gradient-to-br from-accent/60 to-[#6b7bff]/45 shadow-md ${
          pendingFile ? "h-44 w-44 rounded-3xl sm:h-56 sm:w-56" : "h-20 w-20 rounded-full cursor-pointer sm:h-24 sm:w-24"
        }`}
        onClick={() => {
          if (!pendingFile) inputRef.current?.click();
        }}
      >
        {pendingUrl || preview ? (
          <img
            src={pendingUrl || preview || ""}
            alt="avatar"
            className="h-full w-full object-cover select-none"
            style={pendingFile ? { transform: `scale(${zoom})`, transformOrigin: "center" } : undefined}
            draggable={false}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-black font-extrabold text-sm">上传头像</span>
        )}
        {pendingFile && crop && (
          <div
            className={`absolute inset-0 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div
              className="absolute rounded-full border-2 border-white/90"
              style={{
                left: crop.x - crop.r,
                top: crop.y - crop.r,
                width: crop.r * 2,
                height: crop.r * 2,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
              }}
            />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-semibold text-[#ff6ba6]">上传中…</div>
        )}
      </div>
      {pendingFile && (
        <p className="text-xs text-[#7a4a7c] font-semibold">拖拽圆形区域进行裁剪</p>
      )}
      {pendingFile && (
        <div className="w-full max-w-[220px]">
          <div className="flex items-center justify-between text-xs text-[#7a4a7c] font-semibold">
            <span>缩放</span>
            <span>x{zoom.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="mt-1 w-full accent-[#ff6ba6]"
          />
        </div>
      )}
      {pendingFile && (
        <button
          className="rounded-full border border-[#f3d4e8] bg-white px-4 py-1 text-xs font-semibold text-[#ff6ba6] hover:border-accent disabled:opacity-60"
          onClick={handleUpload}
          disabled={uploading}
        >
          立即上传
        </button>
      )}
      {pendingFile && (
        <button
          className="rounded-full border border-[#f3d4e8] bg-white px-4 py-1 text-xs font-semibold text-[#2f2a2a] hover:border-accent disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          重新选择
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleSelect(file);
        }}
      />
    </div>
  );
}

export default AvatarUploader;
