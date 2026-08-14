import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";
import { useTranslation, Trans } from "react-i18next";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/hooks";
import { requestPasswordReset } from "@/lib/api/auth";

export default function AdminForgotPasswordPage() {
  const { localize } = useLocale();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset({ email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.forgotPassword.errorFallback"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title={t("auth.forgotPassword.inboxTitle")}
        subtitle={t("auth.forgotPassword.inboxSubtitle")}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="auth.forgotPassword.sentIntro"
              values={{ email }}
              components={{ email: <span className="font-semibold text-foreground" /> }}
            />
          </p>
          <Link
            to={localize("/admin/login")}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.forgotPassword.title")} subtitle={t("auth.forgotPassword.subtitle")}>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="email">{t("auth.forgotPassword.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@ethioexchange.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendResetLink")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.forgotPassword.rememberedIt")}{" "}
          <Link
            to={localize("/admin/login")}
            className="font-semibold text-primary hover:underline"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
