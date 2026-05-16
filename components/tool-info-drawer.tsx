"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "@phosphor-icons/react";

export interface InfoSection {
  title: string;
  body: string;
}

interface ToolInfoDrawerProps {
  open: boolean;
  onClose: () => void;
  toolName: string;
  tagline: string;
  sections: InfoSection[];
}

export function ToolInfoDrawer({
  open,
  onClose,
  toolName,
  tagline,
  sections,
}: ToolInfoDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-primary" />
                <span className="font-mono text-xs font-semibold uppercase tracking-widest">
                  About this tool
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="mb-5">
                <h2 className="mb-1.5 font-mono text-sm font-bold text-foreground">
                  {toolName}
                </h2>
                <p className="font-mono text-xs leading-relaxed text-muted-foreground">
                  {tagline}
                </p>
              </div>

              <div className="flex flex-col gap-5">
                {sections.map((s, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-[10px] font-semibold text-primary opacity-60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {s.title}
                      </span>
                      <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Small ⓘ trigger button — drop this next to any tool title in a nav bar */
export function InfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="About this tool"
      className="ml-1 text-muted-foreground transition-colors hover:text-primary"
    >
      <Info size={13} />
    </button>
  );
}
