import { useState } from "react";
import { Bell, Globe, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SurfaceCard } from "@/components/shared/surface-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAdminSettings, useUpdateAdminSettings } from "@/hooks/use-admin";
import { useCurrencies } from "@/hooks";
import { useHydrateOnce } from "@/hooks/use-hydrate-once";

export default function AdminSettingsPage() {
  const { t } = useTranslation();
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
          toast.success(t("admin.settings.toastSettingsSaved"));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("admin.settings.toastSettingsError"));
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
          toast.success(t("admin.settings.toastPrefsSaved"));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("admin.settings.toastPrefsError"));
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.settings.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.settings.subtitle")}</p>
      </div>

      {isError && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {t("admin.settings.loadError", {
            detail: error instanceof Error ? error.message : t("admin.settings.loadErrorFallback"),
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General */}
        <SurfaceCard className="p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe className="size-4" />
            </div>
            <h2 className="font-semibold">{t("admin.settings.general")}</h2>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">{t("admin.settings.siteName")}</Label>
              <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">{t("admin.settings.defaultCurrency")}</Label>
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
                {updateGeneral.isPending
                  ? t("admin.settings.saving")
                  : t("admin.settings.saveChanges")}
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
            <h2 className="font-semibold">{t("admin.settings.notifications")}</h2>
          </div>
          <div className="space-y-4">
            <ToggleRow
              label={t("admin.settings.emailAlerts")}
              description={t("admin.settings.emailAlertsDesc")}
              checked={emailAlerts}
              onChange={setEmailAlerts}
            />
            <ToggleRow
              label={t("admin.settings.failureAlerts")}
              description={t("admin.settings.failureAlertsDesc")}
              checked={failureAlerts}
              onChange={setFailureAlerts}
            />
            <ToggleRow
              label={t("admin.settings.dailyDigest")}
              description={t("admin.settings.dailyDigestDesc")}
              checked={dailyDigest}
              onChange={setDailyDigest}
            />
            <ToggleRow
              label={t("admin.settings.weeklyReport")}
              description={t("admin.settings.weeklyReportDesc")}
              checked={weeklyReport}
              onChange={setWeeklyReport}
            />
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={handleSaveNotifications}
                disabled={updateNotifications.isPending}
              >
                {updateNotifications.isPending
                  ? t("admin.settings.saving")
                  : t("admin.settings.savePreferences")}
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
