// src/pages/Modules.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Modules() {
  const [modules, setModules] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getModules().then(setModules);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">K-2 STEM Modules</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Card key={m.id} className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>{m.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">{m.subtitle || "No subtitle"}</p>
              <Button onClick={() => navigate(`/modules/${m.slug}`)}>Start Learning</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
