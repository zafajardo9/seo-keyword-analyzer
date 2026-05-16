"use client";

import { usePathname } from "next/navigation";
import { ToolSidebar } from "@/components/tool-sidebar";
import { useSidebar } from "@/components/sidebar-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = pathname !== "/";
  const { expanded } = useSidebar();

  return (
    <>
      {hasSidebar && <ToolSidebar />}
      <div
        className={
          hasSidebar
            ? `transition-[padding] duration-200 ease-in-out ${expanded ? "pl-52" : "pl-14"}`
            : ""
        }
      >
        {children}
      </div>
    </>
  );
}
