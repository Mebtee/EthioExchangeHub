import { useState } from "react";
import { Bell, Globe, Save } from "lucide-react";

import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/use-admin";
import { useCurrencies } from "@/hooks";
import { useHydrateOnce } from "@/hooks/use-hydrate-once";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { data, isError, error } = useAdminSettings();
  // Separate mutation instances so each Save button shows its own pending state.
  const updateGeneral = useUpdateAdminSettings();
  const updateNotifications = useUpdateAdminSettings();
  const { data: currencies = [] } = useCurrencies();

  // Form state starts at defaults and is hydrated once settings arrive — the
  // hydration effect below is the single source of truth for initial values.
  const [siteName, setSiteName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [failureAlerts, setFailureAlerts] = useState(false);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // Hydrate the form once settings arrive; never clobber local edits on refetch.
  useHydrateOnce(data, (settings) => {
    setSiteName(settings.siteName);
    setDefaultCurrency(settings.defaultCurrency);
    setEmailAlerts(settings.emailAlerts);
    setFailureAlerts(settings.failureAlerts);
    setDailyDigest(settings.dailyDigest);
    setWeeklyReport(settings.weeklyReport);
  });

  function handleSaveGeneral() {
    updateGeneral.mutate(
      { siteName: siteName.trim(), defaultCurrency },
      {
        onSuccess: (updated) => {
          setSiteName(updated.siteName);
          setDefaultCurrency(updated.defaultCurrency);
          toast.success("Settings saved.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save settings.");
        },
      },
    );
  }

  function handleSaveNotifications() {
    updateNotifications.mutate(
      { emailAlerts, failureAlerts, dailyDigest, weeklyReport },
      {
        onSuccess: (updated) => {
          setEmailAlerts(updated.emailAlerts);
          setFailureAlerts(updated.failureAlerts);
          setDailyDigest(updated.dailyDigest);
          setWeeklyReport(updated.weeklyReport);
          toast.success("Preferences saved.");
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Failed to save preferences.");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Platform preferences, notifications, and maintenance actions.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          Unable to load settings:{" "}
          {error instanceof Error ? error.message : "please try again later."}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <SurfaceCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
            <h2 className="font-semibold">General</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">Site name</Label>
              <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Default currency</Label>
              <select
                id="currency"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveGeneral} disabled={updateGeneral.isPending}>
                <Save className="size-4" />
                {updateGeneral.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </SurfaceCard>

        {/* Notifications */}
        <SurfaceCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
              <Bell className="size-4" />
            </div>
            <h2 className="font-semibold">Notifications</h2>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label="Email alerts"
              description="Receive an email when a rate changes significantly."
              checked={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              label="Scraper failure alerts"
              description="Notify me immediately when a scraper fails or times out."
              checked={failureAlerts}
              onChange={setFailureAlerts}
            />
            <ToggleRow
              label="Daily digest"
              description="A summary of the day's scrape activity each evening."
              checked={dailyDigest}
              onChange={setDailyDigest}
            />
            <ToggleRow
              label="Weekly report"
              description="Performance and coverage report delivered every Monday."
              checked={weeklyReport}
              onChange={setWeeklyReport}
            />
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleSaveNotifications}
                disabled={updateNotifications.isPending}
              >
                {updateNotifications.isPending ? "Saving…" : "Save preferences"}
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
