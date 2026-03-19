import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/services/api";

type HomeAccessCardProps = {
  onSaved?: () => void;
};

export function HomeAccessCard({ onSaved }: HomeAccessCardProps) {
  const { t } = useTranslation();
  const api = useApi();
  const [email, setEmail] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      await api.post("/auth/home-access/enable", {
        email,
        parentEmail,
        password,
        managedByParent: true,
      });

      setStatus("saved");
      setMessage(
        t("homeAccess.success", {
          defaultValue:
            "Home access is ready. A parent can now use this email and password to sign in with the student at home.",
        }),
      );
      setPassword("");
      onSaved?.();
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error
          ? err.message
          : t("homeAccess.error", {
              defaultValue: "Could not enable home access",
            }),
      );
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle>
          {t("homeAccess.title", { defaultValue: "Set Up Home Access" })}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("homeAccess.description", {
            defaultValue:
              "A parent or guardian can add an email and password for home use. This keeps the simple class-code login for school and adds a long-term sign-in option.",
          })}
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="home-access-email">
              {t("homeAccess.emailLabel", {
                defaultValue: "Home login email",
              })}
            </Label>
            <Input
              id="home-access-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent-email">
              {t("homeAccess.parentEmailLabel", {
                defaultValue: "Parent or guardian email (optional)",
              })}
            </Label>
            <Input
              id="parent-email"
              type="email"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="home-access-password">
              {t("homeAccess.passwordLabel", { defaultValue: "Password" })}
            </Label>
            <Input
              id="home-access-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("homeAccess.passwordPlaceholder", {
                defaultValue: "At least 8 characters",
              })}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={status === "saving"}>
            {status === "saving"
              ? t("homeAccess.saving", { defaultValue: "Saving..." })
              : t("homeAccess.enable", {
                  defaultValue: "Enable Home Access",
                })}
          </Button>

          {message ? (
            <p
              className={
                status === "error"
                  ? "text-sm text-red-600"
                  : "text-sm text-green-700"
              }
            >
              {message}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
