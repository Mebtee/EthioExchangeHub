import { useState } from "react";
import { Bell, Globe, Save, Trash2 } from "lucide-react";

import { SurfaceCard } from "@/components/shared/surface-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMockFetch } from "@/hooks/use-mock-fetch";
import { ADMIN_SETTINGS } from "@/lib/admin/mock-data";
import { toast } from "sonner";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "KES"];

export default function AdminSettingsPage() {
  const { data } = useMockFetch(() => ADMIN_SETTINGS);
  const settings = data ?? ADMIN_SETTINGS;

  const [siteName, setSiteName] = useState(settings.siteName);
  const [defaultCurrency, setDefaultCurrency] = useState(settings.defaultCurrency);
  const [emailAlerts, setEmailAlerts] = useState(settings.emailAlerts);
  const [failureAlerts, setFailureAlerts] = useState(settings.failureAlerts);
  const [dailyDigest, setDailyDigest] = useState(settings.dailyDigest);
  const [weeklyReport, setWeeklyReport] = useState(settings.weeklyReport);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Platform preferences, notifications, and maintenance actions.
        </p>
      </div>

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
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => toast.success("General settings saved (mock)")}>
                <Save className="size-4" />
                Save changes
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
                onClick={() => toast.success("Notification settings saved (mock)")}
              >
                Save preferences
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {/* Danger zone */}
      <SurfaceCard className="border-destructive/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-destructive">Danger zone</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reset all demo data back to its initial state. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setConfirmReset(true)}>
            <Trash2 className="size-4" />
            Reset demo data
          </Button>
        </div>
      </SurfaceCard>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              All mock rates, logs, and scraper records will be restored to their defaults. This
              action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmReset(false);
                toast.success("Demo data reset (mock)");
              }}
            >
              Reset data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
