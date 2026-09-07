import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postHomeAccess } from "@/services/homeAccessApi";
import { useAuth } from "@/contexts/AuthContext";
import { readSessionAuth } from "@/utils/sessionAuth";

/**
 * Home access on the student settings page (#872).
 *
 * - Home access not set up yet: explain that a teacher or grown-up sets it up
 *   (the teacher sends an invitation to the parent's email). There is no
 *   self-service form any more — a classroom session must never be able to
 *   bind or replace home credentials.
 * - Home access on, but this is a classroom session (icon / PIN login or an
 *   older token): explain that home login details can only be changed after
 *   signing in with the home email and password.
 * - Home access on and signed in with the home password: a small form that
 *   re-asks the current password to change email, password or parent email.
 */
export function HomeAccessCard() {
  const { user, token } = useAuth();
  if (!user || user.role !== "student") return null;

  if (!user.homeAccessEnabled) return <SetupGuidance />;
  if (readSessionAuth(token) !== "password") return <ClassroomNotice />;
  return <ManageHomeLogin />;
}

function SetupGuidance() {
  const { t } = useTranslation();
  return (
    <Card className="border-2" data-testid="home-access-setup">
      <CardHeader>
        <CardTitle>{t("homeAccess.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>{t("homeAccess.setup.body")}</p>
        <p>{t("homeAccess.setup.recovery")}</p>
      </CardContent>
    </Card>
  );
}

function ClassroomNotice() {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-xl border bg-green-50 p-4 text-sm text-green-800"
      data-testid="home-access-classroom-notice"
    >
      {t("homeAccess.classroomNotice")}
    </div>
  );
}

function ManageHomeLogin() {
  const { t } = useTranslation();
  const { token, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !password && !parentEmail) {
      setStatus("error");
      setMessage(t("homeAccess.manage.nothing"));
      return;
    }
    setStatus("saving");
    setMessage("");

    const body: Record<string, string> = { currentPassword };
    if (email) body.email = email;
    if (password) body.password = password;
    if (parentEmail) body.parentEmail = parentEmail;

    try {
      const result = await postHomeAccess<{
        user?: { email?: string | null };
      }>("/auth/home-access/credentials", body, token);
      if (result?.user?.email) updateUser({ email: result.user.email });
      setStatus("saved");
      setMessage(t("homeAccess.manage.success"));
      setCurrentPassword("");
      setPassword("");
      setEmail("");
      setParentEmail("");
    } catch (err) {
      setStatus("error");
      const code = err instanceof Error ? err.message : "";
      setMessage(
        t(`homeAccess.errors.${code}`, {
          defaultValue: t("homeAccess.errors.generic"),
        }),
      );
    }
  }

  return (
    <Card className="border-2" data-testid="home-access-manage">
      <CardHeader>
        <CardTitle>{t("homeAccess.manage.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("homeAccess.manage.description")}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="home-access-current-password">
              {t("homeAccess.manage.currentPassword")}
            </Label>
            <Input
              id="home-access-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-access-new-email">
              {t("homeAccess.manage.newEmail")}
            </Label>
            <Input
              id="home-access-new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-access-new-password">
              {t("homeAccess.manage.newPassword")}
            </Label>
            <Input
              id="home-access-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-access-parent-email">
              {t("homeAccess.manage.parentEmail")}
            </Label>
            <Input
              id="home-access-parent-email"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          <Button type="submit" disabled={status === "saving"}>
            {status === "saving"
              ? t("homeAccess.manage.saving")
              : t("homeAccess.manage.save")}
          </Button>

          {message ? (
            <p
              className={
                status === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-green-700"
              }
              role="status"
            >
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
