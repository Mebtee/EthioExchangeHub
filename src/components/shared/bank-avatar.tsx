import { bankAccentClass, bankInitial } from "@/lib/bank";
import { cn } from "@/lib/utils";

interface BankAvatarProps {
  name: string;
  /** Preferred short code (e.g. "CBE"); falls back to the name's initial. */
  short?: string;
  /** Explicit tailwind bg class; defaults to a deterministic accent by name. */
  colorClass?: string;
  /** Bank logo URL; renders the logo image when present, otherwise initials. */
  logo?: string;
  /** Extra classes controlling size/shape (e.g. "size-11 rounded-xl"). */
  className?: string;
}

export function BankAvatar({ name, short, colorClass, logo, className }: BankAvatarProps) {
  const classes = cn("flex-shrink-0", className ?? "size-10 rounded-full");

  if (logo) {
    return (
      <span className={cn("flex items-center justify-center bg-surface-low", classes)}>
        <img src={logo} alt={name} loading="lazy" className="size-[62%] object-contain" />
      </span>
    );
  }

  const color = colorClass ?? bankAccentClass(name);
  return (
    <span className={cn("flex items-center justify-center text-white font-bold", color, classes)}>
      {short ?? bankInitial(name)}
    </span>
  );
}
