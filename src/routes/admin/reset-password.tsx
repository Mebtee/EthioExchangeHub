import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks";
import { resetPassword } from "@/lib/api/auth";

export default function AdminResetPasswordPage() {
  const { localize } = useLocale();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.resetPassword.errorTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetPassword.errorMismatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.resetPassword.errorFallback"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title={t("auth.resetPassword.invalidTitle")}
        subtitle={t("auth.resetPassword.invalidSubtitle")}
      >
        <p className="text-sm text-muted-foreground">
          {t("auth.resetPassword.requestNewLinkText")}
        </p>
        <div className="mt-6">
          <Button asChild size="lg" className="w-full">
            <Link to={localize("/admin/forgot-password")}>
              {t("auth.resetPassword.requestNewLink")}
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell
        title={t("auth.resetPassword.doneTitle")}
        subtitle={t("auth.resetPassword.doneSubtitle")}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">{t("auth.resetPassword.doneText")}</p>
          <Button asChild size="lg" className="w-full">
            <Link to={localize("/admin/login")}>{t("auth.resetPassword.signIn")}</Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.resetPassword.title")} subtitle={t("auth.resetPassword.subtitle")}>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="password">{t("auth.resetPassword.newPassword")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.resetPassword.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="confirm">{t("auth.resetPassword.confirmPassword")}</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.resetPassword.confirmPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? t("auth.resetPassword.resetting") : t("auth.resetPassword.resetPassword")}
        </Button>
      </form>
    </AuthShell>
  );
}
