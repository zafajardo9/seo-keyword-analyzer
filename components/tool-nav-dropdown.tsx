"use client";

import Link from "next/link";
import {
  Buildings,
  CaretDown,
  ChartLineUp,
  Notebook,
  Sword,
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
] as const;

export function ToolNavDropdown({
  analyzeHref = "/analyze",
  relevanceHref = "/relevance",
  battleHref = "/battle",
  companyResearchHref = "/company-research",
}: ToolNavDropdownProps) {
  const hrefs = {
    analyze: analyzeHref,
    relevance: relevanceHref,
    battle: battleHref,
    companyResearch: companyResearchHref,
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

