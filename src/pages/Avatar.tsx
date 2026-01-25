// src/pages/Avatar.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AvatarPicker from "@/components/AvatarPicker";
import { useAuth } from "../contexts/AuthContext";

export default function Avatar() {
  const [avatar, setAvatar] = useState<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    api.getAvatar().then(setAvatar);
  }, []);

  if (!avatar) {
    return (
      <div
        className="p-4 space-y-6"
        role="status"
        aria-busy="true"
        aria-label="Loading avatar details"
      >
        <span className="sr-only">Loading avatar details...</span>
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
        </div>

        <div className="mb-6 flex justify-center">
          <Skeleton className="w-24 h-24 rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Avatar</h1>
      </div>

      <div className="mb-6 flex justify-center">
        <AvatarPicker
          userInitials={getInitials(user?.name || "??")}
          currentAvatarUrl={(user as any)?.avatarUrl} // Assuming user object has avatarUrl, or we use a fallback if not present in AuthContext user type.
          // Note: AuthContext user might not be updated immediately after upload unless we refresh it.
          // For now, we rely on the component's internal state for immediate feedback.
          onAvatarChange={(url) => {
            console.log("Avatar updated:", url);
            // Optionally trigger a user profile refresh here
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <strong>Archetype:</strong> {avatar.archetype}
            </p>
            <p>
              <strong>Level:</strong> {avatar.level}
            </p>
            <p>
              <strong>XP:</strong> {avatar.xp}
            </p>
            <p>
              <strong>HP:</strong> {avatar.hp}
            </p>
            <p>
              <strong>Energy:</strong> {avatar.energy}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unlocked Abilities</CardTitle>
          </CardHeader>
          <CardContent>
            {avatar.unlockedAbilities?.length === 0 ? (
              <p className="text-gray-500 italic">
                No abilities unlocked yet. Keep playing to earn them!
              </p>
            ) : (
              <ul className="space-y-2">
                {avatar.unlockedAbilities?.map((ua: any) => (
                  <li key={ua.id} className="border p-2 rounded">
                    <div className="font-bold">{ua.Ability.name}</div>
                    <div className="text-sm text-gray-500">
                      {ua.Ability.description}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
