import type { ReactNode } from "react";

interface AppLayoutProps {
  topBar: ReactNode;
  children: ReactNode;
  statusBar: ReactNode;
}

export function AppLayout({ topBar, children, statusBar }: AppLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-surface-base">
      {topBar}
      <main className="flex-1 overflow-hidden">{children}</main>
      {/* {statusBar} */}
    </div>
  );
}
