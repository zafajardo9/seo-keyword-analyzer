import { SeoValidationPanel } from "@/components/seo-validation-panel";

export const metadata = {
  title: "SEO Validation — SEO Analyzer",
  description:
    "Run a structured pass/fail checklist on any page. Covers titles, headings, links, OG tags, and schema.",
};

interface PageProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function SeoValidationPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  return <SeoValidationPanel initialUrl={params.url ?? ""} />;
}
