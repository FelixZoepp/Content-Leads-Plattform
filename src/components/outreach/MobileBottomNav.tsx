import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Megaphone, 
  Briefcase, 
  Video, 
  Settings,
  MoreHorizontal
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { path: "/startseite", label: "Home", icon: Home },
  { path: "/campaigns", label: "Kampagnen", icon: Megaphone },
  { path: "/pipeline", label: "Pipeline", icon: Briefcase },
  { path: "/video-note", label: "Videos", icon: Video },
];

const moreNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/today", label: "Heute", icon: Home },
  { path: "/contacts", label: "Kontakte", icon: Home },
  { path: "/import-leads", label: "Leads importieren", icon: Home },
  { path: "/sequences", label: "Sequenzen", icon: Home },
  { path: "/profile", label: "Profil", icon: Settings },
  { path: "/integrations", label: "Integrationen", icon: Settings },
  { path: "/billing", label: "Abrechnung", icon: Settings },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/startseite" && location.pathname === "/") return true;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-white/10" />
      
      {/* Safe area padding for iOS */}
      <div className="relative flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom,8px)]">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center min-w-[64px] py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                active 
                  ? 'bg-primary/20 text-primary' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-primary' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        
        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center justify-center min-w-[64px] py-1.5 px-3 rounded-2xl transition-all duration-200 text-muted-foreground"
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">Mehr</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl bg-background/95 backdrop-blur-2xl border-t border-white/10">
            <div className="pt-2 pb-4">
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-4 px-2">Weitere Funktionen</h3>
              <ScrollArea className="h-[50vh]">
                <div className="grid grid-cols-3 gap-3 px-2">
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMoreOpen(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-200 ${
                          active 
                            ? 'bg-primary/20 text-primary border border-primary/30' 
                            : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-6 h-6 mb-2" />
                        <span className="text-xs font-medium text-center">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
