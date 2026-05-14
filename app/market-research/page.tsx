import { MarketResearch } from "@/components/market-research";

export default async function MarketResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;

  return <MarketResearch initialUrl={params.url ?? ""} />;
}
