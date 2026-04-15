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
            ? "bg-[#4A9FD9]/15 text-[#4A9FD9]"
            : locked
            ? "text-[#555566] hover:bg-[#1A1A25]"
            : "text-[#8888AA] hover:bg-[#1A1A25] hover:text-white"
        }`}
      >
        <span className={`w-5 h-5 flex-shrink-0 ${isActive && !children ? "text-[#4A9FD9]" : ""}`}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="w-3.5 h-3.5 text-[#555566] flex-shrink-0" />}
        {children && (
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${locked ? "text-[#555566]" : "text-[#555566]"}`} />
        )}
      </button>
      {children && open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-[#2A2A35] pl-3">
          {children.map((child) => {
            const childActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => navigate(child.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                  childActive
                    ? "bg-[#4A9FD9]/15 text-[#4A9FD9]"
                    : child.locked
                    ? "text-[#555566] hover:bg-[#1A1A25]"
                    : "text-[#8888AA] hover:bg-[#1A1A25] hover:text-white"
                }`}
              >
                <span className="w-4 h-4 flex-shrink-0">{child.icon}</span>
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.locked && <Lock className="w-3 h-3 text-[#555566] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
