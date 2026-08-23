import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterCustomer } from "@/hooks/use-customer";
import { useAuth } from "@/context/auth-context";
import { useLocale } from "@/hooks";

/**
 * Public customer registration (Phase 6 over the Phase 2A backend).
 * On success the customer signs in through the standard login page with
 * their new credentials — no session is minted client-side here.
 */
export default function CustomerRegisterPage() {
  const register = useRegisterCustomer();
  const navigate = useNavigate();
  const { localize } = useLocale();
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Already signed in as a customer? Route them into the portal instead of
  // showing the registration form again. Admins/super_admins still see the
  // form — "API Access" is a public CTA and staff may need to register a
  // customer account without signing out of their session.
  if (isAuthenticated && user?.role === "customer") {
    return <Navigate to={localize("/customer")} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await register.mutateAsync({
        email,
        password,
        companyName: companyName || undefined,
        phone: phone || undefined,
      });
      // Registered — send the customer to log in (pre-filled email via state
      // is unnecessary; the login page is one step away).
      navigate(localize("/admin/login"), { replace: true, state: { from: localize("/customer") } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("customer.register.errorFallback"));
    }
  }

  return (
    <AuthShell
      title={t("customer.register.title")}
      subtitle={t("customer.register.subtitle")}
      badge={t("customer.register.portalBadge")}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-5" noValidate>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="register-email">{t("customer.register.email")}</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-password">{t("customer.register.password")}</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
          />
          <p className="text-xs text-muted-foreground">{t("customer.register.passwordHint")}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-company">{t("customer.register.company")}</Label>
          <Input
            id="register-company"
            autoComplete="organization"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-phone">{t("customer.register.phone")}</Label>
          <Input
            id="register-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={register.isPending} className="w-full">
          {register.isPending ? t("common.loading") : t("customer.register.action")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("customer.register.haveAccount")}{" "}
          <Link
            to={localize("/admin/login")}
            className="font-semibold text-primary hover:underline"
          >
            {t("customer.register.signIn")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
