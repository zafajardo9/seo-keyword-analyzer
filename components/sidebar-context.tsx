"use client";

import * as React from "react";

interface SidebarContextValue {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue>({
  expanded: false,
  setExpanded: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => React.useContext(SidebarContext);
