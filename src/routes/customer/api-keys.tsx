import { useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { CopyButton } from "@/components/customer/copy-button";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/async-states";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateCustomerApiKey,
  useCustomerApiKeys,
  useRevokeCustomerApiKey,
} from "@/hooks/use-customer";
import { formatDateTime } from "@/lib/format";

/**
 * Customer API-key management (Phase 6).
 *
 * SECURITY: the full secret from the create response lives ONLY in transient
 * React state (`createdSecret`) — never in localStorage, URLs, or logs. It
 * disappears on navigation/reload by construction; only the backend's stored
 * hash can ever authenticate it again.
 */
export default function CustomerApiKeysPage() {
  const { t } = useTranslation();
  const keys = useCustomerApiKeys();
  const createKey = useCreateCustomerApiKey();
  const revokeKey = useRevokeCustomerApiKey();

  const [newKeyName, setNewKeyName] = useState("");
  /** Transient one-time secret display — cleared when dismissed or unmounted. */
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [keyPendingRevocation, setKeyPendingRevocation] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const created = await createKey.mutateAsync({ name: newKeyName.trim() });
      // The secret is held in memory only until the customer copies it.
      setCreatedSecret(created.key);
      setNewKeyName("");
      toast.success(t("customer.apiKeys.createdToast"));
    } catch (error) {
      // Backend messages are meaningful (subscription required, max keys…).
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    }
  }

  async function handleConfirmRevoke() {
    if (!keyPendingRevocation) return;
    try {
      await revokeKey.mutateAsync(keyPendingRevocation.id);
      toast.success(t("customer.apiKeys.revokedToast"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.unableToLoad"));
    } finally {
      setKeyPendingRevocation(null);
    }
  }

  function dismissSecret() {
    setCreatedSecret(null);
  }

  const activeCount = (keys.data ?? []).filter((k) => !k.revokedAt).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("customer.apiKeys.title")}
        description={t("customer.apiKeys.subtitle")}
      />

      {/* One-time secret display */}
      {createdSecret && (
        <div role="alert" className="rounded-xl border border-gold bg-gold-soft px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-gold-foreground">
            <AlertTriangle className="size-4" />
            {t("customer.apiKeys.secretWarningTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">{t("customer.apiKeys.secretWarningBody")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="block max-w-full truncate rounded-lg bg-background px-3 py-2 font-mono text-xs">
              {createdSecret}
            </code>
            <CopyButton value={createdSecret} label={t("customer.apiKeys.copySecret")} />
            <Button variant="outline" size="sm" onClick={dismissSecret}>
              {t("customer.apiKeys.secretDone")}
            </Button>
          </div>
        </div>
      )}

      <SurfaceCard className="p-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" />
          {t("customer.apiKeys.createTitle")}
        </h3>
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="mt-4 flex flex-wrap gap-3"
          noValidate
        >
          <div className="grid flex-1 gap-1.5">
            <Label htmlFor="api-key-name">{t("customer.apiKeys.nameLabel")}</Label>
            <Input
              id="api-key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t("customer.apiKeys.namePlaceholder")}
              maxLength={100}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={createKey.isPending || newKeyName.trim().length === 0}>
              {createKey.isPending ? t("common.loading") : t("customer.apiKeys.createAction")}
            </Button>
          </div>
        </form>
      </SurfaceCard>

      <SurfaceCard>
        <div className="border-b border-border/60 px-6 py-4">
          <h3 className="font-semibold">{t("customer.apiKeys.listTitle")}</h3>
        </div>

        {keys.isError ? (
          <ErrorState
            message={keys.error instanceof Error ? keys.error.message : undefined}
            onRetry={() => void keys.refetch()}
          />
        ) : keys.isLoading ? (
          <LoadingState />
        ) : (keys.data ?? []).length === 0 ? (
          <EmptyState
            title={t("customer.apiKeys.emptyTitle")}
            message={t("customer.apiKeys.emptyMessage")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customer.apiKeys.colName")}</TableHead>
                <TableHead>{t("customer.apiKeys.colPrefix")}</TableHead>
                <TableHead>{t("customer.apiKeys.colCreated")}</TableHead>
                <TableHead>{t("customer.apiKeys.colLastUsed")}</TableHead>
                <TableHead>{t("customer.apiKeys.colStatus")}</TableHead>
                <TableHead className="text-right">{t("customer.apiKeys.colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(keys.data ?? []).map((apiKey) => {
                const revoked = apiKey.revokedAt !== null;
                const expired =
                  !revoked && apiKey.expiresAt !== null && new Date(apiKey.expiresAt) <= new Date();
                return (
                  <TableRow key={apiKey.id}>
                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-surface-low px-2 py-1 font-mono text-xs">
                        {apiKey.keyPrefix}…
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(apiKey.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apiKey.lastUsedAt
                        ? formatDateTime(apiKey.lastUsedAt)
                        : t("customer.apiKeys.neverUsed")}
                    </TableCell>
                    <TableCell>
                      {revoked ? (
                        <StatusBadge tone="danger">
                          {t("customer.apiKeys.statusRevoked")}
                        </StatusBadge>
                      ) : expired ? (
                        <StatusBadge tone="warning">
                          {t("customer.apiKeys.statusExpired")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="success">
                          {t("customer.apiKeys.statusActive")}
                        </StatusBadge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={revoked}
                        onClick={() =>
                          setKeyPendingRevocation({ id: apiKey.id, name: apiKey.name })
                        }
                      >
                        {t("customer.apiKeys.revoke")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="border-t border-border/60 px-6 py-3 text-xs text-muted-foreground">
          {t("customer.apiKeys.activeCount", { count: activeCount })}
        </div>
      </SurfaceCard>

      {/* Revocation confirmation */}
      <AlertDialog
        open={keyPendingRevocation !== null}
        onOpenChange={(open) => !open && setKeyPendingRevocation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("customer.apiKeys.revokeDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("customer.apiKeys.revokeDialogBody", {
                name: keyPendingRevocation?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("customer.common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revokeKey.isPending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmRevoke();
              }}
            >
              {revokeKey.isPending ? t("common.loading") : t("customer.apiKeys.revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
