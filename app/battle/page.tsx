import { BlogBattle } from "@/components/blog-battle";

export default async function BattlePage({
  searchParams,
}: {
  searchParams: Promise<{ left?: string }>;
}) {
  const params = await searchParams;

  return <BlogBattle initialLeftUrl={params.left ?? ""} />;
}
