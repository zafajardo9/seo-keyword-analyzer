import { CompanyResearch } from "@/components/company-research";

export default async function CompanyResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;

  return <CompanyResearch initialUrl={params.url ?? ""} />;
}

