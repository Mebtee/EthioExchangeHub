import { bankAccentClass, bankInitial } from "@/lib/bank";
import { cn } from "@/lib/utils";

interface BankAvatarProps {
  name: string;
  /** Preferred short code (e.g. "CBE"); falls back to the name's initial. */
  short?: string;
  /** Explicit tailwind bg class; defaults to a deterministic accent by name. */
  colorClass?: string;
  /** Extra classes controlling size/shape (e.g. "size-11 rounded-xl"). */
  className?: string;
}

export function BankAvatar({ name, short, colorClass, className }: BankAvatarProps) {
  const color = colorClass ?? bankAccentClass(name);
  return (
    <span
      className={cn(
        "flex items-center justify-center text-white font-bold flex-shrink-0",
        color,
        className ?? "size-10 rounded-full",
      )}
    >
      {short ?? bankInitial(name)}
    </span>
  );
}
