import Link from "next/link";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { IndexNowSubmit } from "@/components/indexnow-submit";

export const metadata = {
  title: "IndexNow Submitter — SEO Analyzer",
  description:
    "Submit URLs to IndexNow so search engines like Bing, Yandex, Naver, and Seznam can crawl them quickly.",
};

export default function IndexNowPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          <Sparkle size={16} weight="fill" className="text-primary" />
          <span>SEO Analyzer</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={12} />
          Back home
        </Link>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="flex w-full max-w-3xl flex-col gap-8">
          <header className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
              <Sparkle size={10} weight="fill" />
              IndexNow
            </span>
            <h1 className="font-mono text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              Submit URLs to IndexNow
            </h1>
            <p className="max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
              Notify Bing, Yandex, Naver, Seznam, and Yep that pages on your
              site have been added or updated. Provide your IndexNow API key
              and the list of URLs you want crawled. Search engines will fetch
              your key file from the host to verify ownership before accepting
              the submission.
            </p>
          </header>

          <IndexNowSubmit />

          <section className="flex flex-col gap-3 border border-border p-4">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
              Setup checklist
            </h2>
            <ol className="flex list-decimal flex-col gap-2 pl-5 font-mono text-[11px] leading-relaxed text-muted-foreground">
              <li>
                Generate or paste an API key (8–128 alphanumeric characters).
              </li>
              <li>
                Upload a UTF-8 text file named{" "}
                <span className="text-foreground">{`<key>.txt`}</span> to your
                site root containing only the key, e.g.{" "}
                <span className="text-foreground">
                  https://www.example.com/2371de24ab364e5598751f6b792b07d6.txt
                </span>
                .
              </li>
              <li>
                If you host the key elsewhere, set the{" "}
                <span className="text-foreground">Key Location</span> field to
                its full URL.
              </li>
              <li>
                Add one URL per line. All URLs must use the same host as the{" "}
                <span className="text-foreground">Host</span> field.
              </li>
              <li>Click Submit. A 200 or 202 response means success.</li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}
