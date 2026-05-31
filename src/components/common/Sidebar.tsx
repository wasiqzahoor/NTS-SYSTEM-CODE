"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ClipboardList,
  MessageSquare,
  Bell,
  Activity,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  UserCheck,
} from "lucide-react";
import { useEffect } from "react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
    managerRole?: string;
    staffRole?: string;
  };
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed: boolean;
  onCollapsedChange: (val: boolean) => void;
}

export default function Sidebar({
  user,
  mobileOpen = false,
  onMobileClose,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (onMobileClose) onMobileClose();
  }, [pathname]);

  const getNavItems = () => {
    const baseItems = [
      { href: "/",              label: "Dashboard",     icon: LayoutDashboard },
      { href: "/projects",      label: "Projects",      icon: FolderKanban },
      { href: "/tasks",         label: "Tasks",         icon: ClipboardList },
      { href: "/chat",          label: "Messages",      icon: MessageSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ];

    if (user.role === "super_admin") {
      return [
        ...baseItems,
        { href: "/admin/managers",   label: "Managers",   icon: Users },
        { href: "/admin/staff",      label: "All Staff",  icon: Shield },
        { href: "/admin/audit-logs", label: "Audit Logs", icon: Activity },
        { href: "/settings",         label: "Settings",   icon: Settings },
      ];
    }
    if (user.role === "manager") {
      return [
        ...baseItems,
        { href: "/manager/staff", label: "My Team", icon: Users },
        { href: "/settings",      label: "Settings", icon: Settings },
      ];
    }
    return [
      ...baseItems,
      { href: "/settings", label: "Settings", icon: Settings },
    ];
  };

  const navItems = getNavItems();

  const getRoleLabel = () => {
    if (user.role === "super_admin") return "Super Admin";
    if (user.role === "manager")     return user.managerRole ?? "Manager";
    if (user.role === "staff")       return (user as any).staffRole ?? "Staff";
    return user.role.replace("_", " ");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/60">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-nts-cyan to-nts-blue-magenta shadow-sm shadow-nts-cyan/20">
            <img
              src="/logo.png"
              alt="NTS"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              onError={(e) => {
                const t = e.target as HTMLImageElement;
                if (!t.src.includes("logo.svg")) {
                  t.src = "/logo.svg";
                } else {
                  t.style.display = "none";
                  const p = t.parentElement;
                  if (p) p.innerHTML = '<span style="color:white;font-weight:700;font-size:16px">N</span>';
                }
              }}
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-sm text-foreground tracking-wide">NTS</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Management</p>
            </div>
          )}
        </Link>

        {/* Desktop collapse */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden lg:flex p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pb-2">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-nts-cyan/10 text-nts-cyan dark:bg-nts-cyan/15 shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-105",
                  isActive ? "text-nts-cyan" : ""
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {/* Active indicator dot */}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-nts-cyan flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User ── */}
      <div className="p-3 border-t border-border/60">
        <div
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-colors cursor-default",
            collapsed && "justify-center"
          )}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 overflow-hidden ring-2 ring-nts-cyan/20">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                <UserCheck className="w-3 h-3 flex-shrink-0" />
                {getRoleLabel()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
          "hidden lg:block",
          "bg-card border-r border-border/60",
          "dark:bg-[#0D1117] dark:border-white/[0.06]",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-72 transition-transform duration-300 ease-in-out lg:hidden",
          "bg-card border-r border-border/60",
          "dark:bg-[#0D1117] dark:border-white/[0.06]",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
