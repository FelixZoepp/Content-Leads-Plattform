import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function DashboardLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const panel = (e.target as HTMLElement).closest(".glass-panel");
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      (panel as HTMLElement).style.setProperty("--mouse-x", (e.clientX - r.left) + "px");
      (panel as HTMLElement).style.setProperty("--mouse-y", (e.clientY - r.top) + "px");
    };
    document.addEventListener("mousemove", handler);
    return () => document.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: "#0A0B0B" }}>
      {/* Aurora background */}
      <div className="aurora" aria-hidden="true">
        <div className="blob3" />
      </div>

      <Sidebar />
      <div className="ml-[240px] flex flex-col min-h-screen relative z-[1]">
        <TopBar />
        <main className="flex-1 p-6 pb-16 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
