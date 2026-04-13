"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Buildings, Notebook, Sparkle, Sword } from "@phosphor-icons/react";
import { ModelSelector } from "@/components/model-selector";
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
        >
          <Link
            href="/analyze"
            className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Launch App →
          </Link>
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

            <h1 className="max-w-2xl font-mono text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              <span ref={headlineRef} />
              <span
                ref={cursorRef}
                className="inline-block w-0.5 bg-primary text-primary"
              >
                |
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

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/analyze"
                className={cn(
                  "flex items-center gap-2 border border-primary bg-primary px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 active:scale-95",
                  !model && "pointer-events-none opacity-50",
                )}
              >
                Start Analyzing
                <ArrowRight size={13} />
              </Link>

              <Link
                href="/relevance"
                className={cn(
                  "flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
                  !model && "pointer-events-none opacity-50",
                )}
              >
                Check Draft Relevance
                <Notebook size={13} />
              </Link>

              <Link
                href="/battle"
                className={cn(
                  "flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
                  !model && "pointer-events-none opacity-50",
                )}
              >
                Battle Of Blogs
                <Sword size={13} />
              </Link>

              <Link
                href="/company-research"
                className={cn(
                  "flex items-center gap-2 border border-border px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary",
                  !model && "pointer-events-none opacity-50",
                )}
              >
                Company Research
                <Buildings size={13} />
              </Link>
            </div>
            {!model && (
              <span className="font-mono text-[10px] text-muted-foreground">
                Select a model above to continue
              </span>
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="mt-24 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.9 + i * 0.1 }}
              className="flex flex-col gap-2 border border-border p-4"
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                {f.tag}
              </span>
              <h3 className="font-mono text-sm font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}

const FEATURES = [
  {
    tag: "01 · Scrape",
    title: "Intelligent Page Parsing",
    desc: "Extracts headings, meta tags, and body content from any public URL.",
  },
  {
    tag: "02 · Extract",
    title: "Keyword Discovery",
    desc: "Gemini AI identifies short-tail and long-tail keywords with clear search intent.",
  },
  {
    tag: "03 · Recommend",
    title: "Content Strategy",
    desc: "Get 6 ready-to-use blog recommendations with sample intro paragraphs and target keywords.",
  },
  {
    tag: "04 · Verify",
    title: "Relevance Checker",
    desc: "Paste a draft and a target keyword to see if the content truly matches the intended search intent.",
  },
  {
    tag: "05 · Compare",
    title: "Battle of Blogs",
    desc: "Put two blog pages head-to-head and let AI judge who wins on SEO, clarity, and content depth.",
  },
  {
    tag: "06 · Research",
    title: "Company Research",
    desc: "Crawl competitor and partner websites to collect public contacts, company summaries, and outreach fit.",
  },
];
