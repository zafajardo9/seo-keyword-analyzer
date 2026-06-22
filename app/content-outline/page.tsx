import { ContentOutlinePanel } from "@/components/content-outline-panel";

export const metadata = {
  title: "Content Outline — SEO Analyzer",
  description: "Generate SERP-informed content outlines with H2/H3 hierarchy and word counts.",
};

interface PageProps {
  searchParams: Promise<{ keyword?: string; session?: string }>;
}

export default async function ContentOutlinePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <ContentOutlinePanel
      initialKeyword={params.keyword ?? ""}
      sessionId={params.session ?? ""}
    />
  );
}
