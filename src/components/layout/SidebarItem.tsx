import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Lock } from "lucide-react";

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  path?: string;
  locked?: boolean;
  children?: { icon: ReactNode; label: string; path: string; locked?: boolean }[];
}

export function SidebarItem({ icon, label, path, locked, children }: SidebarItemProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = path ? location.pathname === path : children?.some(c => location.pathname === c.path);

  const handleClick = () => {
    if (children) {
      setOpen(!open);
    } else if (locked) {
      navigate(path || "/dashboard");
    } else if (path) {
      navigate(path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group ${
          isActive && !children
            ? "bg-[#0A66C2]/10 text-[#0A66C2]"
            : locked
            ? "text-[#475569] hover:bg-[#111827]"
            : "text-[#94A3B8] hover:bg-[#111827] hover:text-white"
        }`}
      >
        {/* Active indicator bar */}
        {isActive && !children && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0A66C2] rounded-r-full" />
        )}
        <span className={`w-5 h-5 flex-shrink-0 ${isActive && !children ? "text-[#0A66C2]" : ""}`}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="w-3 h-3 text-[#475569]/50 flex-shrink-0" />}
        {children && (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-[#475569] ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {children && open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[#1E293B] pl-3">
          {children.map((child) => {
            const childActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => navigate(child.path)}
                className={`relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-150 ${
                  childActive
                    ? "bg-[#0A66C2]/10 text-[#0A66C2] font-medium"
                    : child.locked
                    ? "text-[#475569] hover:bg-[#111827]"
                    : "text-[#94A3B8] hover:bg-[#111827] hover:text-white"
                }`}
              >
                <span className="w-4 h-4 flex-shrink-0">{child.icon}</span>
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.locked && <Lock className="w-2.5 h-2.5 text-[#475569]/50 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
