import { PromptAnalyzerPanel } from "@/components/prompt-analyzer-panel";

export const metadata = {
  title: "AI Prompt Analyzer — SEO Analyzer",
  description:
    "Discover which AI search prompts surface your page and how to improve each one.",
};

interface PageProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function PromptAnalyzerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <PromptAnalyzerPanel initialUrl={params.url ?? ""} />;
}
