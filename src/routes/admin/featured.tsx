import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";

import { DataTable } from "@/components/admin/data-table";
import { FeaturedCard } from "@/components/home/featured-card";
import { SearchInput } from "@/components/shared/search-input";
import { SurfaceCard } from "@/components/shared/surface-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminFeatured, useCreateFeatured, useDeleteFeatured, useUpdateFeatured } from "@/hooks";
import type {
  ActiveFeatured,
  AdminFeaturedItem,
  FeaturedDestinationType,
  FeaturedPayload,
} from "@/types/featured";
import { toast } from "sonner";

/** Icon names the homepage card understands (see FEATURE_ICONS in featured-card). */
const FEATURE_ICON_OPTIONS = [
  "graduation-cap",
  "gift",
  "percent",
  "shield-check",
  "rocket",
  "trending-up",
  "users",
  "zap",
  "star",
  "heart",
  "megaphone",
];

interface FeatureForm {
  icon: string;
  title: string;
  description: string;
}

interface FeaturedFormState {
  title: string;
  description: string;
  image_url: string;
  image_alt: string;
  advertiser_name: string;
  badge_text: string;
  cta_text: string;
  destination_url: string;
  destination_type: FeaturedDestinationType;
  display_order: string;
  is_active: boolean;
  /** datetime-local value or "" when unset. */
  start_at: string;
  end_at: string;
  feature_1: FeatureForm;
  feature_2: FeatureForm;
  feature_3: FeatureForm;
}

const EMPTY_FEATURE: FeatureForm = { icon: "", title: "", description: "" };

const EMPTY_FORM: FeaturedFormState = {
  title: "",
  description: "",
  image_url: "",
  image_alt: "",
  advertiser_name: "",
  badge_text: "",
  cta_text: "",
  destination_url: "",
  destination_type: "internal",
  display_order: "0",
  is_active: true,
  start_at: "",
  end_at: "",
  feature_1: { ...EMPTY_FEATURE },
  feature_2: { ...EMPTY_FEATURE },
  feature_3: { ...EMPTY_FEATURE },
};

/** Trims optional text; empty/whitespace becomes null (mirrors the backend). */
function normalize(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** ISO-8601 string → local `YYYY-MM-DDTHH:mm` for the datetime-local input. */
function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

/** datetime-local value → ISO-8601 with offset, or null when blank. */
function datetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toForm(item: AdminFeaturedItem): FeaturedFormState {
  return {
    title: item.title,
    description: item.description ?? "",
    image_url: item.image_url,
    image_alt: item.image_alt ?? "",
    advertiser_name: item.advertiser_name ?? "",
    badge_text: item.badge_text,
    cta_text: item.cta_text,
    destination_url: item.destination_url,
    destination_type: item.destination_type === "external" ? "external" : "internal",
    display_order: String(item.display_order),
    is_active: item.is_active,
    start_at: isoToDatetimeLocal(item.start_at),
    end_at: isoToDatetimeLocal(item.end_at),
    feature_1: {
      icon: item.feature_1_icon ?? "",
      title: item.feature_1_title ?? "",
      description: item.feature_1_description ?? "",
    },
    feature_2: {
      icon: item.feature_2_icon ?? "",
      title: item.feature_2_title ?? "",
      description: item.feature_2_description ?? "",
    },
    feature_3: {
      icon: item.feature_3_icon ?? "",
      title: item.feature_3_title ?? "",
      description: item.feature_3_description ?? "",
    },
  };
}

/**
 * Client-side mirror of the backend's destination rule. The backend is
 * authoritative — this only catches mistakes before round-tripping.
 */
function validateDestination(url: string, type: FeaturedDestinationType): string | null {
  if (type === "external") {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return "External destinations must be a valid http:// or https:// URL.";
      }
    } catch {
      return "External destinations must be a valid http:// or https:// URL.";
    }
    return null;
  }
  if (url.startsWith("//")) return "Internal destinations must not use protocol-relative URLs.";
  if (!url.startsWith("/")) return "Internal destinations must be a route path starting with /.";
  return null;
}

/** True when the value is an absolute http(s) URL. */
function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

/** True for Google Drive share/view URLs that do not return raw image bytes. */
function isGoogleDriveShareUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("drive.google.com") ||
    lower.includes("docs.google.com") ||
    lower.includes("/file/d/")
  );
}

const IMAGE_URL_HELP =
  "Use a direct image URL that returns an image file. Google Drive sharing/view links will not work.";

function validateImageUrl(url: string): string | null {
  if (!url) return "Image URL is required.";
  if (!isHttpUrl(url)) return "Image URL must be a direct http:// or https:// URL.";
  if (isGoogleDriveShareUrl(url)) return IMAGE_URL_HELP;
  return null;
}

function ImageUrlWarning({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </p>
  );
}

/** Live image preview that degrades gracefully and never crashes the form. */
function ImageUrlPreview({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();

  useEffect(() => setFailed(false), [trimmed]);

  if (!isHttpUrl(trimmed)) return null;
  if (isGoogleDriveShareUrl(trimmed)) return <ImageUrlWarning message={IMAGE_URL_HELP} />;
  if (failed) return <ImageUrlWarning message={IMAGE_URL_HELP} />;

  return (
    <div className="mt-1.5">
      <p className="text-xs font-semibold text-muted-foreground">Preview</p>
      <div className="mt-1.5 overflow-hidden rounded-lg border border-border/60 bg-surface-low">
        <img
          src={trimmed}
          alt="Campaign image preview"
          loading="lazy"
          className="max-h-40 w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    </div>
  );
}

/** Builds a live preview card from the current form state. */
function buildPreviewItem(
  form: FeaturedFormState,
  editing: AdminFeaturedItem | null,
): ActiveFeatured {
  const features = ([form.feature_1, form.feature_2, form.feature_3] as const)
    .map((f) =>
      f.title.trim()
        ? { icon: f.icon, title: f.title.trim(), description: f.description.trim() }
        : null,
    )
    .filter((f): f is { icon: string; title: string; description: string } => f !== null);
  return {
    id: editing?.id ?? "preview",
    title: form.title.trim() || "Campaign title",
    description: normalize(form.description),
    image_url: form.image_url.trim(),
    image_alt: normalize(form.image_alt),
    advertiser_name: normalize(form.advertiser_name),
    badge_text: form.badge_text.trim() || "FEATURED",
    cta_text: form.cta_text.trim() || "Learn More",
    destination_url: form.destination_url.trim() || "/",
    destination_type: form.destination_type,
    features,
  };
}

function buildPayload(form: FeaturedFormState): FeaturedPayload {
  return {
    title: form.title.trim(),
    description: normalize(form.description),
    image_url: form.image_url.trim(),
    advertiser_name: normalize(form.advertiser_name),
    badge_text: normalize(form.badge_text),
    cta_text: normalize(form.cta_text),
    destination_url: form.destination_url.trim(),
    destination_type: form.destination_type,
    image_alt: normalize(form.image_alt),
    is_active: form.is_active,
    display_order: Number(form.display_order) || 0,
    start_at: datetimeLocalToIso(form.start_at),
    end_at: datetimeLocalToIso(form.end_at),
    feature_1_icon: normalize(form.feature_1.icon),
    feature_1_title: normalize(form.feature_1.title),
    feature_1_description: normalize(form.feature_1.description),
    feature_2_icon: normalize(form.feature_2.icon),
    feature_2_title: normalize(form.feature_2.title),
    feature_2_description: normalize(form.feature_2.description),
    feature_3_icon: normalize(form.feature_3.icon),
    feature_3_title: normalize(form.feature_3.title),
    feature_3_description: normalize(form.feature_3.description),
  };
}

function formatSchedule(item: AdminFeaturedItem): string {
  if (!item.start_at && !item.end_at) return "Anytime";
  const start = item.start_at ? new Date(item.start_at).toLocaleDateString() : "now";
  const end = item.end_at ? new Date(item.end_at).toLocaleDateString() : "forever";
  return `${start} → ${end}`;
}

export default function AdminFeaturedPage() {
  const { data, isLoading, isError, refetch } = useAdminFeatured();
  const createCampaign = useCreateFeatured();
  const updateCampaign = useUpdateFeatured();
  const deleteCampaign = useDeleteFeatured();

  const items = useMemo(() => data ?? [], [data]);

  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFeaturedItem | null>(null);
  const [form, setForm] = useState<FeaturedFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AdminFeaturedItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.advertiser_name ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  function openAdd() {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      feature_1: { ...EMPTY_FEATURE },
      feature_2: { ...EMPTY_FEATURE },
      feature_3: { ...EMPTY_FEATURE },
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: AdminFeaturedItem) {
    setEditing(item);
    setForm(toForm(item));
    setFormError(null);
    setDialogOpen(true);
  }

  function validateForm(): string | null {
    if (!form.title.trim()) return "Title is required.";
    const imageProblem = validateImageUrl(form.image_url.trim());
    if (imageProblem) return imageProblem;
    const destinationProblem = validateDestination(
      form.destination_url.trim(),
      form.destination_type,
    );
    if (destinationProblem) return destinationProblem;
    if (form.display_order.trim() && !/^\d+$/.test(form.display_order.trim())) {
      return "Display order must be a whole number.";
    }
    const start = datetimeLocalToIso(form.start_at);
    const end = datetimeLocalToIso(form.end_at);
    if (start && end && end < start) return "End date cannot be before start date.";
    return null;
  }

  async function handleSave() {
    const problem = validateForm();
    if (problem) {
      setFormError(problem);
      return;
    }
    setFormError(null);
    const payload = buildPayload(form);
    try {
      if (editing) {
        await updateCampaign.mutateAsync({ id: editing.id, payload });
        toast.success("Campaign updated");
      } else {
        await createCampaign.mutateAsync(payload);
        toast.success("Campaign created");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save the campaign.");
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCampaign.mutateAsync(deleting.id);
      toast.success("Campaign deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete the campaign.");
    }
  }

  async function handleToggleActive(item: AdminFeaturedItem) {
    try {
      await updateCampaign.mutateAsync({
        id: item.id,
        payload: { is_active: !item.is_active },
      });
      toast.success(item.is_active ? "Campaign deactivated" : "Campaign activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to change campaign status.");
    }
  }

  const busy = createCampaign.isPending || updateCampaign.isPending || deleteCampaign.isPending;

  function setFeature(
    key: "feature_1" | "feature_2" | "feature_3",
    field: keyof FeatureForm,
    value: string,
  ) {
    setForm((f) => ({ ...f, [key]: { ...f[key], [field]: value } }));
  }

  function featureFields(label: string, index: 1 | 2 | 3) {
    const key = `feature_${index}` as const;
    return (
      <div className="grid gap-3 rounded-xl border border-border/60 p-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${key}-icon`}>{label} icon</Label>
            <select
              id={`${key}-icon`}
              value={form[key].icon}
              onChange={(e) => setFeature(key, "icon", e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None</option>
              {FEATURE_ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${key}-title`}>{label} title</Label>
            <Input
              id={`${key}-title`}
              value={form[key].title}
              onChange={(e) => setFeature(key, "title", e.target.value)}
              placeholder="e.g. Zero balance"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${key}-description`}>{label} description (optional)</Label>
          <Input
            id={`${key}-description`}
            value={form[key].description}
            onChange={(e) => setFeature(key, "description", e.target.value)}
            placeholder="e.g. No minimum balance required."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Featured Content</h1>
          <p className="mt-1 text-muted-foreground">
            Admin-controlled campaigns shown on the homepage. The highest-priority eligible campaign
            wins.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          type="text"
          value={query}
          onChange={setQuery}
          placeholder="Search title or advertiser..."
          wrapperClassName="w-72"
        />
      </div>

      <SurfaceCard className="overflow-hidden">
        <DataTable
          rows={filtered}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage={
            isError
              ? "Unable to load featured content. Check your connection and try again."
              : undefined
          }
          onRetry={() => void refetch()}
          emptyTitle="No featured campaigns yet."
          emptyMessage="Create a campaign to feature an offer on the homepage."
          footer={`Showing ${filtered.length} of ${items.length} campaigns`}
          columns={[
            {
              key: "campaign",
              header: "Campaign",
              cell: (r) => (
                <div className="min-w-0">
                  <p className="font-medium leading-snug">{r.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {r.advertiser_name ?? "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              cell: (r) => (
                <Badge variant={r.destination_type === "external" ? "secondary" : "outline"}>
                  {r.destination_type === "external" ? "External" : "Internal"}
                </Badge>
              ),
            },
            {
              key: "destination",
              header: "Destination",
              cell: (r) => (
                <span className="block max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                  {r.destination_url}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  {r.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                  <Switch
                    checked={r.is_active}
                    disabled={updateCampaign.isPending}
                    onCheckedChange={() => void handleToggleActive(r)}
                    aria-label={`Toggle active for ${r.title}`}
                  />
                </div>
              ),
            },
            {
              key: "schedule",
              header: "Schedule",
              cell: (r) => <span className="whitespace-nowrap text-xs">{formatSchedule(r)}</span>,
            },
            {
              key: "order",
              header: "Order",
              cell: (r) => <span className="tabular">{r.display_order}</span>,
            },
            {
              key: "clicks",
              header: "Clicks",
              cell: (r) => <span className="tabular">{r.click_count}</span>,
            },
            {
              key: "actions",
              header: "",
              headerClassName: "text-right",
              className: "text-right",
              cell: (r) => (
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Edit ${r.title}`}
                    onClick={() => openEdit(r)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Delete ${r.title}`}
                    onClick={() => setDeleting(r)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </SurfaceCard>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit campaign" : "Add campaign"}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Update "${editing.title}" for the homepage.`
                : "Create a campaign that the homepage may feature."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2 pr-1">
            <div className="pointer-events-none select-none" inert aria-label="Live card preview">
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Card preview</p>
              <FeaturedCard item={buildPreviewItem(form, editing)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Awash Bank — Back-to-School Offer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                value={form.image_url}
                onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                placeholder="https://cdn.example.com/campaign.jpg"
              />
              <ImageUrlPreview url={form.image_url} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image_alt">Image alt text (optional)</Label>
              <Input
                id="image_alt"
                value={form.image_alt}
                onChange={(e) => setForm((f) => ({ ...f, image_alt: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="advertiser_name">Advertiser (optional)</Label>
                <Input
                  id="advertiser_name"
                  value={form.advertiser_name}
                  onChange={(e) => setForm((f) => ({ ...f, advertiser_name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="badge_text">Badge text</Label>
                <Input
                  id="badge_text"
                  value={form.badge_text}
                  onChange={(e) => setForm((f) => ({ ...f, badge_text: e.target.value }))}
                  placeholder="SPONSORED"
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold text-foreground">Destination</p>
              <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="destination_url">Destination URL</Label>
                  <Input
                    id="destination_url"
                    value={form.destination_url}
                    onChange={(e) => setForm((f) => ({ ...f, destination_url: e.target.value }))}
                    placeholder="/offers/awash-school"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination_type">Type</Label>
                  <select
                    id="destination_type"
                    value={form.destination_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        destination_type: e.target.value as FeaturedDestinationType,
                      }))
                    }
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="internal">Internal route</option>
                    <option value="external">External site</option>
                  </select>
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ExternalLink className="size-3" />
                Internal = a route path starting with <code>/</code>. External = an absolute http(s)
                URL.
              </p>
            </div>

            <div className="grid gap-3 rounded-xl border border-border/60 p-3">
              <p className="text-sm font-semibold text-foreground">Publishing</p>
              <div className="flex items-center justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive campaigns never appear on the homepage.
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="display_order">Display order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={form.display_order}
                    onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="start_at">Start (optional)</Label>
                  <Input
                    id="start_at"
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_at">End (optional)</Label>
                  <Input
                    id="end_at"
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lower display order wins. Leave start/end blank for immediate, never-expiring
                eligibility.
              </p>
            </div>

            {featureFields("Highlight 1 (optional)", 1)}
            {featureFields("Highlight 2 (optional)", 2)}
            {featureFields("Highlight 3 (optional)", 3)}

            {formError && (
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <TriangleAlert className="size-4" />
                {formError}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Add campaign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `"${deleting.title}" will be permanently removed and its click records will no longer be aggregated.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={busy}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
