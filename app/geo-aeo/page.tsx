import { GeoAeoPanel } from "@/components/geo-aeo-panel";

export default async function GeoAeoPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const params = await searchParams;
  return <GeoAeoPanel initialUrl={params.url ?? ""} />;
}
