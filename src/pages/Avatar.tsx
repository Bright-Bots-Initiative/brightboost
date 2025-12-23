// src/pages/Avatar.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Avatar() {
  const [avatar, setAvatar] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getAvatar().then(setAvatar);
  }, []);

  if (!avatar) return <div>Loading Avatar...</div>;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Avatar</h1>
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
              <p>No abilities unlocked yet.</p>
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
