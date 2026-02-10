// src/pages/Avatar.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import AvatarPicker from "@/components/AvatarPicker";
import { useAuth } from "../contexts/AuthContext";
import { STEM1_SET1_IDS } from "../constants/stem1Set1Games";
import { normalizeAvatarUrl } from "@/lib/avatarDefaults";

// Helper to get display name for archetype
function getArchetypeDisplay(avatar: any): string {
  if (!avatar) return "Unknown";
  if (avatar.stage === "GENERAL" || !avatar.archetype) {
    return "Explorer";
  }
  return avatar.archetype;
}

export default function Avatar() {
  const [avatar, setAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [specialtyUnlocked, setSpecialtyUnlocked] = useState(false);
  const [selectingArchetype, setSelectingArchetype] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [avatarData, progressList] = await Promise.all([
          api.getAvatar(),
          api.getProgress().catch(() => []),
        ]);
        setAvatar(avatarData);

        // Check if specialty is unlocked (3+ STEM1 activities completed)
        const completedIds = progressList
          .filter((p: any) => p.status === "COMPLETED")
          .map((p: any) => p.activityId);
        const foundationCount = completedIds.filter((id: string) =>
          STEM1_SET1_IDS.includes(id as any)
        ).length;
        setSpecialtyUnlocked(foundationCount >= 3);
      } catch (err) {
        console.error("Failed to fetch avatar data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectArchetype = async (archetype: string) => {
    setSelectingArchetype(true);
    try {
      const result = await api.selectArchetype(archetype);
      if (result?.avatar) {
        setAvatar(result.avatar);
      }
    } catch (err) {
      console.error("Failed to select archetype:", err);
    } finally {
      setSelectingArchetype(false);
    }
  };

  if (loading) {
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

  // Determine if avatar is GENERAL (Explorer)
  const isGeneral = !avatar || avatar.stage === "GENERAL" || !avatar.archetype;

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
          currentAvatarUrl={normalizeAvatarUrl(user?.avatarUrl)}
          // Note: AuthContext user might not be updated immediately after upload unless we refresh it.
          // For now, we rely on the component's internal state for immediate feedback.
          onAvatarChange={(url) => {
            console.log("Avatar updated:", url);
            // Optionally trigger a user profile refresh here
          }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Stage:</span>
              <span className={`px-2 py-1 rounded text-sm ${isGeneral ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`}>
                {isGeneral ? "Explorer" : "Specialized"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Archetype:</span>
              <span className="font-bold">{getArchetypeDisplay(avatar)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Level:</span>
              <span>{avatar?.level || 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">XP:</span>
              <span>{avatar?.xp || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">HP:</span>
              <span>{avatar?.hp || 100}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Energy:</span>
              <span>{avatar?.energy || 100}</span>
            </div>
          </CardContent>
        </Card>

        {/* Core Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Core Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Speed</span>
                <span className="text-sm text-gray-500">{avatar?.speed || 0}/100</span>
              </div>
              <Progress value={avatar?.speed || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Control</span>
                <span className="text-sm text-gray-500">{avatar?.control || 0}/100</span>
              </div>
              <Progress value={avatar?.control || 0} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Focus</span>
                <span className="text-sm text-gray-500">{avatar?.focus || 0}/100</span>
              </div>
              <Progress value={avatar?.focus || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Specialty Selection Card (only for GENERAL avatars) */}
        {isGeneral && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Choose Your Specialty</CardTitle>
            </CardHeader>
            <CardContent>
              {!specialtyUnlocked ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">
                    Complete 3 foundation activities to unlock specialty selection!
                  </p>
                  <p className="text-sm text-gray-400">
                    Keep exploring and learning to choose your path.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-green-600 font-medium">
                    You've unlocked specialty selection!
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => handleSelectArchetype("AI")}
                      disabled={selectingArchetype}
                    >
                      <span className="text-2xl mb-2">🤖</span>
                      <span className="font-bold">AI</span>
                      <span className="text-xs text-gray-500">Master of Logic</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center hover:bg-purple-50 hover:border-purple-300"
                      onClick={() => handleSelectArchetype("QUANTUM")}
                      disabled={selectingArchetype}
                    >
                      <span className="text-2xl mb-2">⚛️</span>
                      <span className="font-bold">Quantum</span>
                      <span className="text-xs text-gray-500">Reality Bender</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto py-4 flex flex-col items-center hover:bg-green-50 hover:border-green-300"
                      onClick={() => handleSelectArchetype("BIOTECH")}
                      disabled={selectingArchetype}
                    >
                      <span className="text-2xl mb-2">🧬</span>
                      <span className="font-bold">Biotech</span>
                      <span className="text-xs text-gray-500">Life Engineer</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unlocked Abilities Card (only for SPECIALIZED avatars) */}
        {!isGeneral && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Unlocked Abilities</CardTitle>
            </CardHeader>
            <CardContent>
              {avatar?.unlockedAbilities?.length === 0 ? (
                <p className="text-gray-500 italic">
                  No abilities unlocked yet. Keep playing to earn them!
                </p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {avatar?.unlockedAbilities?.map((ua: any) => (
                    <li key={ua.id} className="border p-3 rounded-lg">
                      <div className="font-bold">{ua.Ability?.name || "Unknown Ability"}</div>
                      <div className="text-sm text-gray-500">
                        {ua.Ability?.description || ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
