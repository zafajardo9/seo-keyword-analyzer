import { ContentStrategyPanel } from "@/components/content-strategy-panel";

export const metadata = {
  title: "Content Strategy — SEO Analyzer",
  description: "Build a topic cluster architecture, audience mapping, and competitive landscape analysis.",
};

interface PageProps {
  searchParams: Promise<{ keyword?: string; url?: string; draft?: string }>;
}

export default async function ContentStrategyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ContentStrategyPanel
      initialKeyword={params.keyword ?? ""}
      initialUrl={params.url ?? ""}
      initialDraft={params.draft ?? ""}
    />
  );
}
