"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Buildings,
  CaretDoubleLeft,
  CaretDoubleRight,
  ChartLineUp,
  GoogleLogo,
  Lightning,
  MagnifyingGlass,
  Notebook,
  Sparkle,
  Sword,
} from "@phosphor-icons/react";

const TOOLS = [
  {
    key: "analyze",
    label: "SEO Analyzer",
    href: "/analyze",
    icon: ChartLineUp,
  },
  {
    key: "relevance",
    label: "Relevance Checker",
    href: "/relevance",
    icon: Notebook,
  },
  {
    key: "battle",
    label: "Battle of Blogs",
    href: "/battle",
    icon: Sword,
  },
  {
    key: "company-research",
    label: "Company Research",
    href: "/company-research",
    icon: Buildings,
  },
  {
    key: "market-research",
    label: "Market Research",
    href: "/market-research",
    icon: MagnifyingGlass,
  },
  {
    key: "indexnow",
    label: "IndexNow Submit",
    href: "/indexnow",
    icon: Lightning,
  },
  {
    key: "geo-aeo",
    label: "GEO & AEO",
    href: "/geo-aeo",
    icon: Brain,
  },
  {
    key: "google-indexing",
    label: "Google Indexing",
    href: "/google-indexing",
    icon: GoogleLogo,
  },
] as const;

export function ToolSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-expanded");
    if (stored === "true") setExpanded(true);
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-expanded", String(next));
      return next;
    });
  }

  // Avoid layout shift on SSR
  if (!mounted) {
    return <aside className="fixed left-0 top-0 z-40 h-screen w-14 border-r border-border bg-background" />;
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-[width] duration-200 ease-in-out ${
        expanded ? "w-52" : "w-14"
      }`}
    >
      {/* Home / logo */}
      <Link
        href="/"
        title={!expanded ? "Home" : undefined}
        className="flex h-14 shrink-0 items-center gap-2.5 overflow-hidden border-b border-border px-4 transition-colors hover:bg-muted/40"
      >
        <Sparkle size={15} weight="fill" className="shrink-0 text-primary" />
        {expanded && (
          <span className="truncate font-mono text-xs font-semibold tracking-tight">
            SEO Analyzer
          </span>
        )}
      </Link>

      {/* Tool links */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-3 px-1.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active =
            pathname === tool.href || pathname.startsWith(tool.href + "/");

          return (
            <Link
              key={tool.key}
              href={tool.href}
              title={!expanded ? tool.label : undefined}
              className={`group relative flex items-center gap-3 px-2.5 py-2.5 font-mono text-xs transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {/* Active indicator */}
              {active && (
                <span className="absolute left-0 top-1 h-[calc(100%-8px)] w-0.5 bg-primary" />
              )}

              <Icon size={15} className="shrink-0" />

              {expanded ? (
                <span className="truncate tracking-wide">{tool.label}</span>
              ) : (
                /* Floating label tooltip when collapsed */
                <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap border border-border bg-background px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-foreground opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100">
                  {tool.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        type="button"
        onClick={toggle}
        className="flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden border-t border-border font-mono text-[10px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {expanded ? (
          <>
            <CaretDoubleLeft size={12} />
            <span className="tracking-widest uppercase">Collapse</span>
          </>
        ) : (
          <CaretDoubleRight size={12} />
        )}
      </button>
    </aside>
  );
}
