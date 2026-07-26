import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ImpersonationBanner } from "./ImpersonationBanner";
import { Menu, X } from "lucide-react";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    const close = () => setSidebarOpen(false);
    window.addEventListener("popstate", close);
    return () => window.removeEventListener("popstate", close);
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: "#0A0B0B" }}>
      {/* Aurora background */}
      <div className="aurora" aria-hidden="true">
        <div className="blob3" />
      </div>

      {/* Impersonation banner */}
      <ImpersonationBanner />

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-white"
        style={{ background: "rgba(10,11,11,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(249,249,249,0.08)" }}
        aria-label="Menü"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[49] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 bottom-0 z-[50] transition-transform duration-300
        lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="lg:ml-[240px] flex flex-col min-h-screen relative z-[1]">
        <TopBar />
        <main className="flex-1 p-4 lg:p-6 pb-16 overflow-auto pt-16 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
