"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Sun, Moon, Bell, LogOut, Search, CheckCheck, Trash2,
  ClipboardList, CheckCircle2, AlertTriangle, Clock,
  MessageSquare, Settings, Menu,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeaderProps {
  collapsed?: boolean;
  user: { name: string; email: string; role: string; avatar?: string };
  onMenuClick?: () => void;
}

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export default function Header({ user, onMenuClick, collapsed = false }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [liveAvatar, setLiveAvatar] = useState(user.avatar || "");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetch("/api/profile").then(r => r.json()).then(data => {
      if (data.success && data.data?.avatar) setLiveAvatar(data.data.avatar);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      setNotifLoading(true);
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) { setNotifications(data.data); setUnreadCount(data.unreadCount); }
    } catch { } finally { setNotifLoading(false); }
  };

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchNotifications();
  };
  const markAllAsRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAll: true }) });
    fetchNotifications();
  };
  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    fetchNotifications();
  };
  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) markAsRead(notif._id);
    if (notif.link) router.push(notif.link);
    setShowNotifications(false);
  };

  const getNotifIcon = (type: string) => {
    const base = "w-3.5 h-3.5";
    switch (type) {
      case "task_assigned":     return <ClipboardList  className={`${base} text-nts-cyan`} />;
      case "task_updated":
      case "task_approved":     return <CheckCircle2   className={`${base} text-emerald-500`} />;
      case "task_revision":     return <AlertTriangle  className={`${base} text-amber-500`} />;
      case "deadline_reminder": return <Clock          className={`${base} text-yellow-500`} />;
      case "chat_message":      return <MessageSquare  className={`${base} text-blue-400`} />;
      default:                  return <Bell           className={`${base} text-muted-foreground`} />;
    }
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60)    return "Just now";
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  const iconBtn = "p-2 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nts-cyan/40";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 right-0 left-0 z-30 h-14",
          collapsed ? "lg:left-[68px]" : "lg:left-60",
          "bg-card/80 backdrop-blur-xl border-b border-border/60 transition-all duration-300",
          "dark:bg-[#0D1117]/80 dark:border-white/[0.06]"
        )}
      >
        <div className="flex items-center justify-between h-full px-3 sm:px-5 gap-3">

          {/* Left */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={onMenuClick} className={cn(iconBtn, "lg:hidden")} aria-label="Menu">
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop search */}
            <div className="hidden sm:flex items-center flex-1 max-w-xs">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search…"
                  className={cn(
                    "w-full pl-9 pr-4 py-2 h-9 rounded-xl text-sm",
                    "bg-accent/60 border-0 text-foreground placeholder:text-muted-foreground",
                    "focus:ring-2 focus:ring-nts-cyan/30 focus:bg-accent outline-none",
                    "transition-all duration-150"
                  )}
                />
              </div>
            </div>

            {/* Mobile search trigger */}
            <button onClick={() => setShowSearch(!showSearch)} className={cn(iconBtn, "sm:hidden")} aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className={iconBtn} aria-label="Toggle theme">
              {isMounted
                ? theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />
                : <div className="w-4 h-4" />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className={cn(iconBtn, "relative")}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className={cn(
                  "fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0",
                  "top-[3.75rem] sm:top-full sm:mt-2",
                  "w-auto sm:w-80",
                  "bg-card rounded-2xl shadow-xl border border-border/60",
                  "dark:bg-[#111827] dark:border-white/[0.08]",
                  "overflow-hidden z-50 animate-scale-in"
                )}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Notifications</h3>
                      {unreadCount > 0 && <p className="text-[10px] text-muted-foreground">{unreadCount} unread</p>}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="flex items-center gap-1 text-[11px] text-nts-cyan hover:text-nts-cyan/80 font-medium transition-colors">
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-nts-cyan border-t-transparent" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <Bell className="w-7 h-7 opacity-30" />
                        <p className="text-xs">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={cn(
                            "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                            "border-b border-border/40 last:border-0 group",
                            !notif.read
                              ? "bg-nts-cyan/[0.04] hover:bg-nts-cyan/[0.08]"
                              : "hover:bg-accent/50"
                          )}
                        >
                          <div className="p-1.5 rounded-lg bg-accent flex-shrink-0 mt-0.5">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-xs font-medium truncate", !notif.read ? "text-foreground" : "text-muted-foreground")}>
                                {notif.title}
                                {!notif.read && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-nts-cyan align-middle" />}
                              </p>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          </div>
                          <button
                            onClick={(e) => deleteNotification(e, notif._id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-red-500 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="border-t border-border/60 px-4 py-2.5">
                      <Link
                        href="/notifications"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs text-nts-cyan hover:text-nts-cyan/80 font-medium transition-colors"
                      >
                        View all →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-border/60 mx-0.5" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-accent transition-colors group"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-semibold overflow-hidden ring-2 ring-nts-cyan/20 group-hover:ring-nts-cyan/40 transition-all">
                  {liveAvatar
                    ? <img src={liveAvatar} alt={user.name} className="w-full h-full object-cover" />
                    : user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-xs font-medium text-foreground max-w-[100px] truncate">
                  {user.name.split(" ")[0]}
                </span>
              </button>

              {showProfile && (
                <div className={cn(
                  "fixed sm:absolute right-2 sm:right-0 top-[3.75rem] sm:top-full sm:mt-2",
                  "w-52 bg-card rounded-2xl shadow-lg border border-border/60",
                  "dark:bg-[#111827] dark:border-white/[0.08]",
                  "py-1.5 z-50 animate-scale-in overflow-hidden"
                )}>
                  <div className="px-4 py-3 border-b border-border/60">
                    <p className="font-semibold text-foreground text-sm truncate">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                    <span className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded-full bg-nts-cyan/10 text-nts-cyan font-semibold capitalize border border-nts-cyan/20">
                      {user.role.replace("_", " ")}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setShowProfile(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      Profile Settings
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-red-500 hover:bg-red-500/5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile search bar */}
      {showSearch && (
        <div className="fixed top-14 left-0 right-0 z-20 sm:hidden px-4 py-2.5 bg-card border-b border-border/60 shadow-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects, tasks…"
              autoFocus
              className="w-full pl-9 pr-4 py-2 h-9 rounded-xl bg-accent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-nts-cyan/30"
              onBlur={() => setShowSearch(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
