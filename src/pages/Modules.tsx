// src/pages/Modules.tsx
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModulesSkeleton } from "@/components/ModulesSkeleton";
import { BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function Modules() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api
      .getModules()
      .then((data) => {
        // Filter: only K-2 and explicitly exclude stem-1-intro
        const visible = data.filter(
          (m: any) => m.level === "K-2" && m.slug !== "stem-1-intro",
        );
        setModules(visible);
        setError(null);
      })
      .catch(() => {
        setError("Failed to load modules. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-brightboost-navy mb-6">
        K-2 STEM Modules
      </h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <ModulesSkeleton />
      ) : modules.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m) => (
            <Card
              key={m.id}
              className="hover:shadow-lg transition flex flex-col h-full border-2 border-transparent hover:border-brightboost-blue/20"
            >
              <CardHeader>
                <CardTitle className="text-xl text-brightboost-navy">
                  {m.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-500 mb-6">
                  {m.description ?? m.subtitle ?? "..."}
                </p>
                <Button
                  onClick={() => navigate(`/student/modules/${m.slug}`)}
                  className="w-full sm:w-auto"
                  aria-label={`Start learning ${m.title}`}
                >
                  Start Learning
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !error && (
          <div className="text-center py-12 px-4 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
              <BookOpen size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Modules Found
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              We couldn't find any learning modules at the moment. Please check
              back later!
            </p>
          </div>
        )
      )}
    </div>
  );
}
