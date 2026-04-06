import { ContentRelevanceChecker } from "@/components/content-relevance-checker";

export default async function RelevancePage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;

  return <ContentRelevanceChecker initialUrl={params.url ?? ""} />;
}
