import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api/auth";

export default function AdminForgotPasswordPage() {
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
      setError(err instanceof Error ? err.message : "Unable to request a reset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check your inbox" subtitle="We've sent you a password-reset link.">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>,
            a reset link is on its way. Follow the link to choose a new password.
          </p>
          <Link to="/admin/login" className="text-sm font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
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
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/admin/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
