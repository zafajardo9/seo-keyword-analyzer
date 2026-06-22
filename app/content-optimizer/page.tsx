import { ContentOptimizerPanel } from "@/components/content-optimizer-panel";

export const metadata = {
  title: "Content Optimizer — SEO Analyzer",
  description: "Rewrite and optimize your content to address relevance gaps identified by the audit.",
};

interface PageProps {
  searchParams: Promise<{ keyword?: string; url?: string; draft?: string }>;
}

export default async function ContentOptimizerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ContentOptimizerPanel
      initialKeyword={params.keyword ?? ""}
      initialUrl={params.url ?? ""}
      initialDraft={params.draft ?? ""}
    />
  );
}
