import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Languages } from "lucide-react";

import { useLocale } from "@/hooks";
import { LOCALE_LABELS, LOCALES } from "@/i18n/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Language picker. Switching locale re-navigates to the same route with the
 *  new prefix; LocaleLayout then syncs i18next + <html lang> + font. */
export function LocaleSwitcher() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { pathname, search, hash } = useLocation();

  function switchTo(next: (typeof LOCALES)[number]) {
    if (next === locale) return;
    const rest = pathname.replace(/^\/[^/]+/, "") || "/";
    navigate(`/${next}${rest}${search}${hash}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("locale.label")}
          className="rounded-xl text-muted-foreground hover:text-foreground"
        >
          <Languages className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => switchTo(l)} disabled={l === locale}>
            <span className={l === locale ? "font-semibold text-primary" : ""}>
              {LOCALE_LABELS[l]}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
