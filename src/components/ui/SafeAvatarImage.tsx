// src/components/ui/SafeAvatarImage.tsx
import { useState, useEffect } from "react";
import { AvatarImage } from "@/components/ui/avatar";
import {
  normalizeAvatarUrl,
  DEFAULT_AVATAR_URL,
  isLikelyBrokenUrl,
} from "@/lib/avatarDefaults";

interface SafeAvatarImageProps {
  src?: string | null;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}

/**
 * SafeAvatarImage - An AvatarImage wrapper that falls back to default robot
 * on load errors or broken URLs.
 */
export function SafeAvatarImage({
  src,
  fallbackSrc = DEFAULT_AVATAR_URL,
  alt,
  className,
}: SafeAvatarImageProps) {
  // Pre-check for known broken URLs
  const initialSrc = isLikelyBrokenUrl(src)
    ? fallbackSrc
    : normalizeAvatarUrl(src);

  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [hasErrored, setHasErrored] = useState(false);

  // Reset when src prop changes
  useEffect(() => {
    const newSrc = isLikelyBrokenUrl(src)
      ? fallbackSrc
      : normalizeAvatarUrl(src);
    setCurrentSrc(newSrc);
    setHasErrored(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    // If current src is not the fallback, try fallback
    if (currentSrc !== fallbackSrc && !hasErrored) {
      setCurrentSrc(fallbackSrc);
      setHasErrored(true);
    }
    // If fallback also fails, let AvatarFallback handle it (initials)
  };

  return (
    <AvatarImage
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
}

export default SafeAvatarImage;
