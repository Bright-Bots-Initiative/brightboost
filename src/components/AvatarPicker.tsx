import React, { useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AvatarProps {
  currentAvatarUrl?: string;
  userInitials: string;
  onAvatarChange?: (url: string) => void;
}

//Stubs - replace later
async function getPresignedUrlStub(): Promise<string> {
  return "https://stub-bucket.s3.amazonaws.com/avatar";
}

async function patchUserAvatarStub(url: string): Promise<void> {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch('/api/user/avatar', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ avatarUrl: url }),
  });

  if (!response.ok) {
    throw new Error('Failed to update avatar');
  }
}

async function invalidateAvatarCache(url: string): Promise<void> {
  console.log("Invalidate avatar cache for:", url);
}


const AvatarPicker: React.FC<AvatarProps> = ({
  currentAvatarUrl = "https://api.dicebear.com/7.x/identicon/svg?seed=default",
  userInitials,
  onAvatarChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(currentAvatarUrl);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      console.log("File selected:", file.name);
      const cropped = await cropToSquare(file);
      console.log("Cropped profile");
      const compressed = await compressToWebP(cropped);
      console.log("Compressed profile");
      const previewUrl = URL.createObjectURL(compressed);
      setPreviewUrl(previewUrl);

      const presignedUrl = await getPresignedUrlStub();
      const finalUrl = presignedUrl.split("?")[0];
      console.log("Uploading to:", presignedUrl);

      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: compressed,
      });

      await invalidateAvatarCache(finalUrl);
      await patchUserAvatarStub(finalUrl);

      setAvatarUrl(finalUrl);
      setPreviewUrl(undefined);
      if (onAvatarChange) onAvatarChange(finalUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setAvatarUrl(undefined);
      setPreviewUrl(undefined);
    } finally {
        setLoading(false);
    }
  };
  
  const cropToSquare = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Could not get canvas context");

        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject("Crop failed")),
            "image/webp"
        );
      };
      img.onerror = reject;
    });
  };
  
  const compressToWebP = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Could not get canvas context");

        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          b => (b ? resolve(b) : reject("Compression failed")),
          "image/webp",
          0.8
        );
      };
      img.onerror = reject;
    });
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative w-24 h-24 cursor-pointer rounded-md border-2 border-brightboost-yellow overflow-hidden"
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className="w-full h-full">
          {loading ? (
            <div className="w-full h-full animate-pulse bg-muted rounded-md" />
          ) : (
            <>
              <AvatarImage src={previewUrl ?? avatarUrl} alt="avatar" />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </>
          )}
        </Avatar>
      </div>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default AvatarPicker;
