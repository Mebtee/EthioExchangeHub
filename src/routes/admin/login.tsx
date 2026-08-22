import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/hooks";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { localize } = useLocale();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-login destination: an explicit "from" path wins; otherwise route by
  // role so customers land in their portal instead of the admin dead end.
  const from = (location.state as { from?: string } | null)?.from;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login({ email, password });
      navigate(from ?? (user.role === "customer" ? "/customer" : "/admin"), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.login.errorFallback"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="email">{t("auth.login.email")}</Label>
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

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <Link
              to={localize("/admin/forgot-password")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={
                showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")
              }
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {isSubmitting ? t("auth.login.signingIn") : t("auth.login.signIn")}
        </Button>
      </form>
    </AuthShell>
  );
}
