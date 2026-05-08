import { useEffect, useRef, type ReactNode } from "react";
import { Panel, PanelGroup, PanelResizeHandle, type ImperativePanelHandle } from "react-resizable-panels";
import { useUIStore } from "@/stores/ui-store";

interface MainContentProps {
  sidebar: ReactNode;
  center: ReactNode;
  rightPanel?: ReactNode;
}

export function MainContent({ sidebar, center, rightPanel }: MainContentProps) {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const historyPanelOpen = useUIStore((s) => s.historyPanelOpen);
  const sidebarRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    if (sidebarCollapsed) {
      sidebarRef.current?.collapse();
    } else {
      sidebarRef.current?.expand();
    }
  }, [sidebarCollapsed]);

  return (
    <PanelGroup direction="horizontal" className="h-full">
      <Panel
        id="sidebar"
        order={1}
        ref={sidebarRef}
        defaultSize={18}
        minSize={12}
        maxSize={30}
        collapsible
        collapsedSize={0}
        className="bg-surface-raised"
      >
        {sidebar}
      </Panel>

      <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent-purple/50 transition-colors data-[resize-handle-active]:bg-accent-purple" />

      <Panel id="center" order={2} minSize={35} className="bg-surface-base">
        {center}
      </Panel>

      {historyPanelOpen && rightPanel && (
        <>
          <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent-purple/50 transition-colors data-[resize-handle-active]:bg-accent-purple" />
          <Panel
            id="history"
            order={3}
            defaultSize={22}
            minSize={15}
            maxSize={35}
            collapsible
            className="bg-surface-raised"
          >
            {rightPanel}
          </Panel>
        </>
      )}
    </PanelGroup>
  );
}
