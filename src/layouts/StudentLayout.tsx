// src/layouts/StudentLayout.tsx
import { ReactNode } from "react";
import BottomNav from "../components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white p-4 border-b flex justify-between items-center sticky top-0 z-40">
        <div className="font-bold text-xl text-blue-600 cursor-pointer" onClick={() => navigate("/student/dashboard")}>
            BrightBoost
        </div>
        <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-5 w-5" />
        </Button>
      </header>
      <main className="flex-1 container mx-auto p-4 max-w-lg">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
