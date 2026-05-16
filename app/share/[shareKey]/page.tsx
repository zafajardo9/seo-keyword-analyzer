import { notFound } from "next/navigation";
import { SharedReportView } from "@/components/shared-report-view";
import { GeoAeoAudit, PromptAnalysis } from "@/lib/types";

interface SharedReport {
  shareKey: string;
  tool: string;
  label: string;
  payload: unknown;
  viewCount: number;
  createdAt: string;
}

async function getReport(shareKey: string): Promise<SharedReport | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const res = await fetch(
      `${baseUrl}/api/share?key=${encodeURIComponent(shareKey)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const { shareKey } = await params;
  const report = await getReport(shareKey);

  if (!report) notFound();

  return (
    <SharedReportView
      label={report.label}
      tool={report.tool}
      shareKey={report.shareKey}
      viewCount={report.viewCount}
      createdAt={report.createdAt}
      audit={report.tool === "geo-aeo" ? (report.payload as { audit: GeoAeoAudit }).audit ?? (report.payload as GeoAeoAudit) : null}
      promptAnalysis={report.tool === "prompt-analyzer" ? (report.payload as { analysis: PromptAnalysis }).analysis ?? null : null}
    />
  );
}
