import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { BankCard } from "@/components/banks/bank-card";
import { useBanks } from "@/hooks/use-banks";

function BanksPage() {
  const { data: banks = [] } = useBanks();

  return (
    <SiteShell>
      <PageContainer>
        <PageHeader
          title="Bank Directory"
          description={`${banks.length} commercial banks reporting live USD/ETB rates.`}
          action={
            <SearchInput placeholder="Search bank name..." wrapperClassName="w-full sm:w-72" />
          }
        />

        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((b) => (
            <BankCard key={b.slug} bank={b} />
          ))}
        </ul>
      </PageContainer>
    </SiteShell>
  );
}

export default BanksPage;
