import { getTranslations } from "next-intl/server";
import { LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { AppNav } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

type ShellProps = {
  tenantName: string;
  logoUrl: string | null;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
};

function TenantBadge({ tenantName, logoUrl }: Pick<ShellProps, "tenantName" | "logoUrl">) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant logos come from Supabase Storage
        <img src={logoUrl} alt="" className="size-8 rounded-md object-cover" />
      ) : (
        <Logo inverse />
      )}
      <span className="truncate font-bold">{tenantName}</span>
    </div>
  );
}

export async function AppShell({ tenantName, logoUrl, userName, roleLabel, children }: ShellProps) {
  const [t, tCommon] = await Promise.all([getTranslations("Auth"), getTranslations("Common")]);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-3"
      >
        {tCommon("skipToContent")}
      </a>
      <aside className="hidden bg-tarp p-4 text-white md:flex md:flex-col md:gap-6">
        <TenantBadge tenantName={tenantName} logoUrl={logoUrl} />
        <AppNav variant="side" />
        <div className="mt-auto grid gap-3">
          <div className="text-sm">
            <div className="truncate font-bold">{userName}</div>
            <div className="text-white/85">{roleLabel}</div>
          </div>
          <LanguageSwitcher inverse />
          <form action={logout}>
            <Button variant="outline" className="w-full border-white/40 bg-tarp text-white hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden />
              {t("logout")}
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 bg-tarp px-4 text-white md:hidden">
          <TenantBadge tenantName={tenantName} logoUrl={logoUrl} />
          <div className="flex items-center gap-1">
            <LanguageSwitcher inverse />
            <form action={logout}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("logout")}
                className="text-white hover:bg-white/15 hover:text-white"
              >
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-4xl flex-1 pb-24 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      <AppNav variant="bottom" />
    </div>
  );
}
