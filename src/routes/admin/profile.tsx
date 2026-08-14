import { useState } from "react";
import { CalendarDays, Clock, Mail, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/shared/async-states";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminProfile, useUpdateAdminProfile } from "@/hooks/use-admin";
import { useHydrateOnce } from "@/hooks/use-hydrate-once";
import { formatRelativeTime } from "@/lib/format";

export default function AdminProfilePage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAdminProfile();
  const updateProfile = useUpdateAdminProfile();
  const profile = data ?? null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  // Hydrate the edit form once the profile arrives; never clobber local edits.
  useHydrateOnce(data, (profile) => {
    setName(profile.name);
    setEmail(profile.email);
  });

  function handleSave() {
    updateProfile.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: (updated) => {
          setName(updated.name);
          setEmail(updated.email);
          toast.success(t("admin.profile.toastSaved"));
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t("admin.profile.toastSaveError"));
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("admin.profile.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("admin.profile.subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Profile summary */}
        <SurfaceCard className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="size-20 animate-pulse rounded-full bg-surface-high" />
              <div className="h-4 w-32 animate-pulse rounded-full bg-surface-high" />
              <div className="h-3 w-48 animate-pulse rounded-full bg-surface-high" />
            </div>
          ) : !profile ? (
            <EmptyState
              title={t("admin.profile.noProfileTitle")}
              message={t("admin.profile.noProfileMessage")}
            />
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 text-center">
                <Avatar className="size-20">
                  <AvatarFallback className="bg-primary text-xl font-bold text-primary-foreground">
                    {profile.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
                <StatusBadge tone="success">
                  <ShieldCheck className="mr-1 size-3" />
                  {profile.role}
                </StatusBadge>
              </div>

              <dl className="mt-6 space-y-3 border-t border-border/60 pt-5 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("admin.profile.email")}</span>
                  <span className="ml-auto font-medium">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("admin.profile.memberSince")}</span>
                  <span className="ml-auto font-medium">
                    {formatRelativeTime(profile.memberSince)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("admin.profile.lastLogin")}</span>
                  <span className="ml-auto font-medium">
                    {formatRelativeTime(profile.lastLogin)}
                  </span>
                </div>
              </dl>
            </>
          )}
        </SurfaceCard>

        {/* Edit form */}
        <SurfaceCard className="p-6">
          <h2 className="mb-5 font-semibold">{t("admin.profile.editProfile")}</h2>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("admin.profile.fullName")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("admin.profile.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">{t("admin.profile.bio")}</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                {updateProfile.isPending
                  ? t("admin.profile.saving")
                  : t("admin.profile.saveChanges")}
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
