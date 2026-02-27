import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Bell, Globe } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LanguageToggle from "../components/LanguageToggle";

const TeacherSettings = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Name</p>
                <p className="text-sm text-slate-500">{user?.name || "—"}</p>
              </div>
            </div>
            <div className="border-t pt-3 flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="text-sm text-slate-500">{user?.email || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-500" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              Notification preferences coming soon.
            </p>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-500" />
              Language
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">
                Display language
              </p>
              <LanguageToggle />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherSettings;
