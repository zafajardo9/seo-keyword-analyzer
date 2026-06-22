"use client";

import Link from "next/link";
import {
  Brain,
  Buildings,
  CaretDown,
  ChartLineUp,
  Lightning,
  ListBullets,
  ListChecks,
  MagnifyingGlass,
  Notebook,
  Robot,
  Sword,
  TextAlignLeft,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ToolNavDropdownProps {
  analyzeHref?: string;
  relevanceHref?: string;
  battleHref?: string;
  companyResearchHref?: string;
  marketResearchHref?: string;
  indexNowHref?: string;
  geoAeoHref?: string;
  promptAnalyzerHref?: string;
  crawlMonitorHref?: string;
  contentOutlineHref?: string;
  seoValidationHref?: string;
}

const TOOL_LINKS = [
  {
    key: "analyze",
    label: "SEO Analyzer",
    description: "Audit a page and extract keywords",
    icon: ChartLineUp,
  },
  {
    key: "relevance",
    label: "Relevance Checker",
    description: "Check keyword and draft fit",
    icon: Notebook,
  },
  {
    key: "battle",
    label: "Battle of Blogs",
    description: "Compare two content pages",
    icon: Sword,
  },
  {
    key: "companyResearch",
    label: "Company Research",
    description: "Crawl public contacts and fit",
    icon: Buildings,
  },
  {
    key: "marketResearch",
    label: "Market Research",
    description: "Market trends, competitors, and news",
    icon: MagnifyingGlass,
  },
  {
    key: "indexNow",
    label: "IndexNow Submit",
    description: "Push URLs to search engines",
    icon: Lightning,
  },
  {
    key: "geoAeo",
    label: "GEO & AEO Analyzer",
    description: "Score AI discoverability and answer-engine fit",
    icon: Brain,
  },
  {
    key: "promptAnalyzer",
    label: "Prompt Analyzer",
    description: "Find AI search prompts that surface your page",
    icon: TextAlignLeft,
  },
  {
    key: "crawlMonitor",
    label: "AI Crawl Monitor",
    description: "See which AI bots are crawling your site",
    icon: Robot,
  },
  {
    key: "contentOutline",
    label: "Content Outline",
    description: "SERP-informed H2/H3 outlines with word counts",
    icon: ListBullets,
  },
  {
    key: "seoValidation",
    label: "SEO Validation",
    description:
      "Pass/fail checklist for titles, headings, links, OG, and schema",
    icon: ListChecks,
  },
] as const;

export function ToolNavDropdown({
  analyzeHref = "/analyze",
  relevanceHref = "/relevance",
  battleHref = "/battle",
  companyResearchHref = "/company-research",
  marketResearchHref = "/market-research",
  indexNowHref = "/indexnow",
  geoAeoHref = "/geo-aeo",
  promptAnalyzerHref = "/prompt-analyzer",
  crawlMonitorHref = "/crawl-monitor",
}: ToolNavDropdownProps) {
  const hrefs = {
    analyze: analyzeHref,
    relevance: relevanceHref,
    battle: battleHref,
    companyResearch: companyResearchHref,
    marketResearch: marketResearchHref,
    indexNow: indexNowHref,
    geoAeo: geoAeoHref,
    promptAnalyzer: promptAnalyzerHref,
    crawlMonitor: crawlMonitorHref,
    contentOutline: "/content-outline",
    seoValidation: "/seo-validation",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="font-mono text-xs uppercase tracking-widest"
        >
          Tools
          <CaretDown size={12} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-1 p-1.5">
        {TOOL_LINKS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.key}
              href={hrefs[tool.key]}
              className="flex items-start gap-3 border border-transparent p-2.5 transition-colors hover:border-border hover:bg-muted/60"
            >
              <Icon size={14} className="mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block font-mono text-xs font-semibold text-foreground">
                  {tool.label}
                </span>
                <span className="mt-1 block font-mono text-[10px] leading-relaxed text-muted-foreground">
                  {tool.description}
                </span>
              </span>
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
