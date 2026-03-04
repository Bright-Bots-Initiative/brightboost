import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { join, API_BASE } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { normalizeAvatarUrl } from "@/lib/avatarDefaults";
import { Camera } from "lucide-react";

interface AvatarProps {
  currentAvatarUrl?: string;
  userInitials: string;
  onAvatarChange?: (url: string) => void;
  size?: "md" | "xl";
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
  size = "md",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useAuth();
  const sizeClass = size === "xl" ? "w-72 h-72" : "w-24 h-24";
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

  const isDefaultAvatar =
    !previewUrl &&
    (!avatarUrl ||
      avatarUrl.includes("robot_default") ||
      avatarUrl === "/robots/robot_default.png");

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <button
        type="button"
        aria-label="Upload your photo"
        className={`group relative ${sizeClass} cursor-pointer rounded-xl border-4 border-dashed border-brightboost-yellow overflow-hidden focus-visible:ring-4 focus-visible:ring-brightboost-yellow/50 focus:outline-none transition-all duration-200 hover:border-solid hover:scale-[1.03] hover:shadow-lg`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className="w-full h-full rounded-xl">
          {loading ? (
            <div
              className="w-full h-full animate-pulse bg-blue-100 rounded-xl flex items-center justify-center"
              role="status"
              aria-label="Uploading your photo..."
            >
              <span className="text-blue-400 text-sm font-medium">
                Uploading...
              </span>
            </div>
          ) : (
            <>
              <SafeAvatarImage
                src={previewUrl ?? avatarUrl}
                alt="Your avatar"
              />
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-100 to-purple-100" aria-hidden="true">
                {userInitials}
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Kid-friendly CTA overlay for default/placeholder state */}
        {isDefaultAvatar && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-400/80 to-purple-400/80 rounded-xl transition-all group-hover:from-blue-500/90 group-hover:to-purple-500/90">
            <Camera className="w-12 h-12 text-white mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-white font-bold text-base px-2 text-center leading-tight">
              Add Your Photo!
            </span>
            <span className="text-white/80 text-xs mt-1">
              Tap here to upload
            </span>
          </div>
        )}

        {/* Hover overlay for custom photos */}
        {!isDefaultAvatar && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/0 group-hover:bg-black/40 rounded-xl transition-all">
            <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1">
              Change Photo
            </span>
          </div>
        )}
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
        <p className="text-sm text-red-500 bg-red-50 px-3 py-1.5 rounded-lg" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default AvatarPicker;
