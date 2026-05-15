"use client";

import { usePathname } from "next/navigation";
import { ToolSidebar } from "@/components/tool-sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasSidebar = pathname !== "/";

  return (
    <>
      {hasSidebar && <ToolSidebar />}
      <div className={hasSidebar ? "pl-14" : ""}>{children}</div>
    </>
  );
}
