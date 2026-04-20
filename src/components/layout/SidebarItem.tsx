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
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
          isActive && !children
            ? "text-white border border-[rgba(197,160,89,0.3)]"
            : locked
            ? "text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)] border border-transparent"
            : "text-[rgba(249,249,249,0.72)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white border border-transparent"
        }`}
        style={
          isActive && !children
            ? {
                background: "linear-gradient(135deg, rgba(197,160,89,0.18), rgba(119,90,25,0.1))",
                boxShadow: "inset 0 1px 0 rgba(249,249,249,0.08), 0 0 24px rgba(197,160,89,0.12)",
              }
            : undefined
        }
      >
        <span className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive && !children ? "text-[#E9CB8B]" : ""}`}>
          {icon}
        </span>
        <span className="flex-1 text-left truncate">{label}</span>
        {locked && <Lock className="w-3 h-3 text-[rgba(249,249,249,0.2)] flex-shrink-0" />}
        {children && (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-[rgba(249,249,249,0.3)] ${open ? "rotate-180" : ""}`} />
        )}
      </button>
      {children && open && (
        <div className="ml-5 mt-0.5 space-y-0.5 border-l border-[rgba(249,249,249,0.08)] pl-3">
          {children.map((child) => {
            const childActive = location.pathname === child.path;
            return (
              <button
                key={child.path}
                onClick={() => navigate(child.path)}
                className={`relative w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] transition-all duration-200 ${
                  childActive
                    ? "bg-[rgba(197,160,89,0.12)] text-[#E9CB8B] font-medium"
                    : child.locked
                    ? "text-[rgba(249,249,249,0.3)] hover:bg-[rgba(249,249,249,0.04)]"
                    : "text-[rgba(249,249,249,0.5)] hover:bg-[rgba(249,249,249,0.04)] hover:text-white"
                }`}
              >
                <span className="w-4 h-4 flex-shrink-0">{child.icon}</span>
                <span className="flex-1 text-left truncate">{child.label}</span>
                {child.locked && <Lock className="w-2.5 h-2.5 text-[rgba(249,249,249,0.2)] flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
