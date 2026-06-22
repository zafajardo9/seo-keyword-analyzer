import { ContentBriefPanel } from "@/components/content-brief-panel";

export const metadata = {
  title: "Content Brief — SEO Analyzer",
  description: "Generate a detailed content brief with target keywords, outline, and SEO recommendations.",
};

interface PageProps {
  searchParams: Promise<{ keyword?: string; url?: string; draft?: string }>;
}

export default async function ContentBriefPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ContentBriefPanel
      initialKeyword={params.keyword ?? ""}
      initialUrl={params.url ?? ""}
      initialDraft={params.draft ?? ""}
    />
  );
}
