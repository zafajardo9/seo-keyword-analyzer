"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Step {
  id: number;
  label: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Enter URL" },
  { id: 2, label: "Analyzing" },
  { id: 3, label: "Results" },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{
                scale: currentStep === step.id ? 1 : 0.9,
                opacity: currentStep >= step.id ? 1 : 0.35,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex h-7 w-7 items-center justify-center border text-xs font-mono font-semibold transition-colors",
                currentStep === step.id &&
                  "border-primary bg-primary text-primary-foreground",
                currentStep > step.id &&
                  "border-muted-foreground/50 bg-muted text-muted-foreground",
                currentStep < step.id && "border-border text-muted-foreground/50"
              )}
            >
              {currentStep > step.id ? "✓" : step.id}
            </motion.div>
            <span
              className={cn(
                "text-[10px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors",
                currentStep === step.id
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mx-2 mb-5 h-px w-12 transition-colors",
                currentStep > step.id ? "bg-muted-foreground/50" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
