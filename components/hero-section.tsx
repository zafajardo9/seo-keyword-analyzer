"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Buildings,
  ChartLineUp,
  GoogleLogo,
  Lightning,
  ListBullets,
  ListChecks,
  MagnifyingGlass,
  NotePencil,
  Notebook,
  Robot,
  SignOut,
  Sparkle,
  Sword,
  TextAlignLeft,
  X,
} from "@phosphor-icons/react";
import { ModelSelector } from "@/components/model-selector";
import { ApiKeyManager, hasAnyKey } from "@/components/api-key-manager";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

gsap.registerPlugin(TextPlugin);

const TYPED_PHRASES = [
  "Extract SEO Keywords.",
  "Find Content Gaps.",
  "Generate Blog Ideas.",
  "Rank Higher.",
];

export function HeroSection() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const headlineRef = React.useRef<HTMLSpanElement>(null);
  const cursorRef = React.useRef<HTMLSpanElement>(null);
  const bgRef = React.useRef<HTMLDivElement>(null);
  const [model, setModel] = React.useState("");
  const [hasKey, setHasKey] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);

  React.useEffect(() => {
    setHasKey(hasAnyKey());
  }, []);

  useGSAP(
    () => {
      const tl = gsap.timeline({ repeat: -1 });

      TYPED_PHRASES.forEach((phrase) => {
        tl.to(headlineRef.current, {
          duration: phrase.length * 0.06,
          text: { value: phrase, delimiter: "" },
          ease: "none",
        })
          .to({}, { duration: 1.4 })
          .to(headlineRef.current, {
            duration: phrase.length * 0.03,
            text: { value: "", delimiter: "" },
            ease: "none",
          })
          .to({}, { duration: 0.3 });
      });

      gsap.to(cursorRef.current, {
        opacity: 0,
        repeat: -1,
        yoyo: true,
        duration: 0.5,
        ease: "power1.inOut",
      });

      gsap.to(bgRef.current, {
        backgroundPosition: "100% 100%",
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col overflow-hidden"
    >
      <div
        ref={bgRef}
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, oklch(0.553 0.195 38.402 / 12%) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 70%, oklch(0.553 0.195 38.402 / 8%) 0%, transparent 70%)",
          backgroundSize: "200% 200%",
          backgroundPosition: "0% 0%",
        }}
      />

      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <Sparkle size={16} weight="fill" className="text-primary" />
          <span className="font-mono text-sm font-semibold tracking-tight">
            SEO Analyzer
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center gap-3"
        >
          <Link
            href="/analyze"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Launch App →
          </Link>
          <ApiKeyManager onChange={() => setHasKey(hasAnyKey())} />
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/login";
            }}
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-destructive"
            title="Sign out"
          >
            <SignOut size={12} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </motion.div>
      </nav>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <div className="flex flex-col gap-3">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mx-auto inline-flex items-center gap-1.5 border border-primary/30 bg-primary/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary"
            >
              <Sparkle size={10} weight="fill" />
              Powered by Gemini AI
            </motion.span>

            <h1 className="flex min-h-[3.5rem] items-center justify-center font-mono text-4xl font-bold leading-tight tracking-tight text-foreground sm:min-h-[4.5rem] sm:text-5xl md:min-h-[5.5rem] md:text-6xl">
              <span className="inline-flex items-center">
                <span ref={headlineRef} />
                <span
                  ref={cursorRef}
                  className="inline-block w-0.5 bg-primary text-primary"
                >
                  |
                </span>
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="max-w-md font-mono text-sm leading-relaxed text-muted-foreground"
          >
            Paste any URL. Our AI scrapes the page, extracts high-value
            keywords, and generates ready-to-use blog content recommendations —
            in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col items-center gap-5"
          >
            <ModelSelector onModelChange={setModel} />

            {!model && !hasKey && (
              <span className="font-mono text-[10px] text-muted-foreground">
                Select a model or provide an API key to continue
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Bottom CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 flex items-center gap-4"
        >
          <Link
            href="/analyze"
            className={cn(
              "flex items-center gap-2 border border-primary bg-primary px-8 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 active:scale-95",
              !model && !hasKey && "pointer-events-none opacity-50",
            )}
          >
            Start Analyzing
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setToolsOpen(true)}
            className="flex items-center gap-2 border border-border px-8 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-foreground transition-all hover:border-primary hover:text-primary active:scale-95"
          >
            <ListBullets size={14} />
            View Tools
          </button>
        </motion.div>
      </main>

      {/* Tools Dialog */}
      {toolsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setToolsOpen(false)}
          />
          <div className="relative flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <Sparkle size={14} weight="fill" className="text-primary" />
                <span className="font-mono text-sm font-semibold">
                  All Tools
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {TOOLS.length} tools
                </span>
              </div>
              <button
                type="button"
                onClick={() => setToolsOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      onClick={() => setToolsOpen(false)}
                      className="group flex flex-col gap-2 border border-border p-4 transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
                          <Icon size={13} className="text-primary" />
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground group-hover:text-primary">
                          {tool.label}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                        {tool.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TOOLS: Array<{
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    href: "/analyze",
    label: "SEO Analyzer",
    description:
      "Audit any URL — extract keywords, page insights, and blog content recommendations in seconds.",
    icon: ChartLineUp,
  },
  {
    href: "/relevance",
    label: "Relevance Checker",
    description:
      "Check if your content matches search intent with AI-powered relevance scores.",
    icon: Notebook,
  },
  {
    href: "/battle",
    label: "Battle of Blogs",
    description:
      "Put two blog pages head-to-head and let AI judge who wins on SEO and content depth.",
    icon: Sword,
  },
  {
    href: "/company-research",
    label: "Company Research",
    description:
      "Crawl competitor websites to collect public contacts, summaries, and outreach fit.",
    icon: Buildings,
  },
  {
    href: "/market-research",
    label: "Market Research",
    description:
      "Market trends, competitor insights, and industry news aggregated by AI.",
    icon: MagnifyingGlass,
  },
  {
    href: "/indexnow",
    label: "IndexNow Submit",
    description:
      "Push URLs to search engines instantly via the IndexNow protocol.",
    icon: Lightning,
  },
  {
    href: "/geo-aeo",
    label: "GEO & AEO Analyzer",
    description:
      "Score your content's likelihood of being cited by AI assistants like ChatGPT and Perplexity.",
    icon: Brain,
  },
  {
    href: "/google-indexing",
    label: "Google Indexing",
    description:
      "Request Google to crawl and re-index specific URLs via the official Indexing API.",
    icon: GoogleLogo,
  },
  {
    href: "/prompt-analyzer",
    label: "Prompt Analyzer",
    description:
      "Discover which AI search prompts would surface your page with grades and suggestions.",
    icon: TextAlignLeft,
  },
  {
    href: "/crawl-monitor",
    label: "AI Crawl Monitor",
    description:
      "Track which AI bots are crawling your site with real-time beacon monitoring.",
    icon: Robot,
  },
  {
    href: "/content-outline",
    label: "Content Outline",
    description:
      "Generate SERP-informed H2/H3 outlines with real competitor analysis and word counts.",
    icon: ListBullets,
  },
  {
    href: "/seo-validation",
    label: "SEO Validation",
    description:
      "Run a pass/fail checklist on titles, headings, links, OG tags, and schema.",
    icon: ListChecks,
  },
  {
    href: "/content-generator",
    label: "Content Generator",
    description:
      "Create writing personas and generate full blog posts in their unique voice and style.",
    icon: NotePencil,
  },
  {
    href: "/web-search",
    label: "Web Search",
    description:
      "Ask any question and get an AI answer grounded in real-time Google Search results.",
    icon: MagnifyingGlass,
  },
];
