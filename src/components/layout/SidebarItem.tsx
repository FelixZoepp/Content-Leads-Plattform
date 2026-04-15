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
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
          isActive && !children
            ? "bg-[#2E86AB]/15 text-[#2E86AB]"
            : locked
            ? "text-[#64748B] hover:bg-[#1A2235]"
            : "text-[#94A3B8] hover:bg-[#1A2235] hover:text-white"
        }`}
      >
        <span className={`w-5 h-5 flex-shrink-0 ${isActive && !children ? "text-[#2E86AB]" : ""}`}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />}
        {children && (
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${locked ? "text-[#64748B]" : "text-[#64748B]"}`} />
        )}
      </button>
      {children && open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-[#1E293B] pl-3">
          {children.map((child) => {
            const childActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => navigate(child.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  childActive
                    ? "bg-[#2E86AB]/15 text-[#2E86AB]"
                    : child.locked
                    ? "text-[#64748B] hover:bg-[#1A2235]"
                    : "text-[#94A3B8] hover:bg-[#1A2235] hover:text-white"
                }`}
              >
                <span className="w-4 h-4 flex-shrink-0">{child.icon}</span>
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.locked && <Lock className="w-3 h-3 text-[#64748B] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
