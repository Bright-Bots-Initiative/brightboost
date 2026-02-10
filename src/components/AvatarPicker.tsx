import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { join } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { normalizeAvatarUrl } from "@/lib/avatarDefaults";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

interface AvatarProps {
  currentAvatarUrl?: string;
  userInitials: string;
  onAvatarChange?: (url: string) => void;
}

/**
 * Upload avatar to the backend and return the new avatar URL
 */
async function uploadAvatar(file: Blob): Promise<string> {
  const token = localStorage.getItem("bb_access_token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  const formData = new FormData();
  formData.append("avatar", file, "avatar.webp");

  const response = await fetch(join(API_BASE, "/user/avatar/upload"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Upload failed" }));
    throw new Error(error.error || "Failed to upload avatar");
  }

  const data = await response.json();
  return data.avatarUrl;
}

const AvatarPicker: React.FC<AvatarProps> = ({
  currentAvatarUrl = "/robots/robot_default.png",
  userInitials,
  onAvatarChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>(
    normalizeAvatarUrl(currentAvatarUrl),
  );
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(undefined);
    try {
      const cropped = await cropToSquare(file);
      const compressed = await compressToWebP(cropped);
      const localPreview = URL.createObjectURL(compressed);
      setPreviewUrl(localPreview);

      // Upload to backend
      const newAvatarUrl = await uploadAvatar(compressed);

      // Update local state
      setAvatarUrl(newAvatarUrl);
      setPreviewUrl(undefined);

      // Update AuthContext so other components see the change
      updateUser({ avatarUrl: newAvatarUrl });

      if (onAvatarChange) onAvatarChange(newAvatarUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreviewUrl(undefined);
    } finally {
      setLoading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
          "image/webp",
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
          (b) => (b ? resolve(b) : reject("Compression failed")),
          "image/webp",
          0.8,
        );
      };
      img.onerror = reject;
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <button
        type="button"
        aria-label="Change avatar"
        className="relative w-72 h-72 cursor-pointer rounded-md border-2 border-brightboost-yellow overflow-hidden focus-visible:ring-4 focus-visible:ring-brightboost-yellow/50 focus:outline-none"
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className="w-full h-full rounded-md">
          {loading ? (
            <div
              className="w-full h-full animate-pulse bg-muted rounded-md"
              role="status"
              aria-label="Uploading avatar"
            />
          ) : (
            <>
              <SafeAvatarImage
                src={previewUrl ?? avatarUrl}
                alt="Current avatar"
              />
              <AvatarFallback className="rounded-md" aria-hidden="true">{userInitials}</AvatarFallback>
            </>
          )}
        </Avatar>
      </button>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default AvatarPicker;
