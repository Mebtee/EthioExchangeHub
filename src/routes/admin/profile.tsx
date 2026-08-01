import { useState } from "react";
import { CalendarDays, Clock, Mail, ShieldCheck } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminProfile } from "@/hooks/use-admin";
import { ADMIN_PROFILE } from "@/mocks/admin";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const { data, isLoading } = useAdminProfile();
  const profile = data ?? ADMIN_PROFILE;

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [bio, setBio] = useState("Keeping Ethiopia's exchange-rate data fresh and accurate.");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your admin account and public profile details.
        </p>
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
                  <span className="text-muted-foreground">Email</span>
                  <span className="ml-auto font-medium">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since</span>
                  <span className="ml-auto font-medium">
                    {formatRelativeTime(profile.memberSince)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last login</span>
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
          <h2 className="mb-5 font-semibold">Edit profile</h2>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  toast.success("Profile updated", {
                    description: "Your changes have been saved (mock).",
                  })
                }
              >
                Save changes
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
