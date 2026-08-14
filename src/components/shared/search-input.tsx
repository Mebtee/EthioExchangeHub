import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type InputType = Extract<InputHTMLAttributes<HTMLInputElement>["type"], string>;

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  /** HTML input type; defaults to "search" to match the original markup. */
  type?: InputType;
  /** Outer wrapper classes (controls width/position). */
  wrapperClassName?: string;
  /** Input classes (e.g. "pl-10 pr-4 py-2.5"). */
  className?: string;
}

export function SearchInput({
  placeholder,
  value,
  onChange,
  type = "search",
  wrapperClassName,
  className,
}: SearchInputProps) {
  const { t } = useTranslation();
  return (
    <div className={cn("relative", wrapperClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder ?? t("common.search")}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          "w-full rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary",
          className ?? "pl-10 pr-4 py-2.5",
        )}
      />
    </div>
  );
}
