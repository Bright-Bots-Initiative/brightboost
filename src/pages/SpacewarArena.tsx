// src/pages/SpacewarArena.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import UnityWebGL from "../components/unity/UnityWebGL";

interface AvatarData {
  archetype?: string;
  level?: number;
  xp?: number;
  avatarUrl?: string;
}

export default function SpacewarArena() {
  const [avatarConfig, setAvatarConfig] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const avatar = await api.getAvatar();
        if (avatar) {
          setAvatarConfig({
            archetype: avatar.archetype,
            level: avatar.level ?? 1,
            xp: avatar.xp ?? 0,
            avatarUrl: avatar.avatarUrl,
          });
        } else {
          // Fallback config if no avatar
          setAvatarConfig({
            archetype: "explorer",
            level: 1,
            xp: 0,
          });
        }
      } catch (err) {
        console.error("Failed to fetch avatar for Spacewar:", err);
        // Use default config on error
        setAvatarConfig({
          archetype: "explorer",
          level: 1,
          xp: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAvatar();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600">Preparing arena...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[85vh] w-full">
      <div className="flex-1 w-full">
        <UnityWebGL
          basePath="/games/spacewar"
          config={avatarConfig ?? undefined}
        />
      </div>
    </div>
  );
}
