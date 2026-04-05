"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRight, Globe, CircleNotch, Warning } from "@phosphor-icons/react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
}

export function UrlInput({ onSubmit, loading = false }: UrlInputProps) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState("");

  function validate(value: string): boolean {
    try {
      const u = new URL(value);
      return ["http:", "https:"].includes(u.protocol);
    } catch {
      return false;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    if (!validate(trimmed)) {
      setError("Please enter a valid http:// or https:// URL.");
      return;
    }
    setError("");
    onSubmit(trimmed);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="url-input" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Page URL to Analyze
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="url-input"
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError("");
                }}
                placeholder="https://example.com/blog/your-article"
                className="pl-8 font-mono text-xs"
                disabled={loading}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="gap-1.5 font-mono text-xs"
            >
              {loading ? (
                <>
                  <CircleNotch size={13} className="animate-spin" />
                  Scraping…
                </>
              ) : (
                <>
                  Analyze
                  <ArrowRight size={13} />
                </>
              )}
            </Button>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-xs text-destructive"
            >
              <Warning size={12} />
              {error}
            </motion.p>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Paste any publicly accessible URL. We&apos;ll scrape the page content and run two AI passes — one for keyword extraction, one for content recommendations.
        </p>
      </form>
    </motion.div>
  );
}
