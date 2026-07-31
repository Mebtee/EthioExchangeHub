/** Bank-specific display utilities (no hardcoded banks). */

export function slugifyBankName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function bankInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

/** Deterministic avatar tint derived from the bank name. */
export function bankAccentClass(name: string): string {
  const palette = [
    "bg-primary",
    "bg-red-700",
    "bg-blue-600",
    "bg-orange-500",
    "bg-emerald-700",
    "bg-green-700",
    "bg-yellow-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export function sourceLabel(source: string): string {
  if (!source) return "Bank";
  return source.charAt(0).toUpperCase() + source.slice(1);
}
