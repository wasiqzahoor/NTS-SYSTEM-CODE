"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSocket } from "@/hooks/useSocket";

interface DashboardShellProps {
  user: {
    id?: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    managerRole?: string;
    managerId?: string;
  };
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed]   = useState(false);
  const { socket, isConnected }     = useSocket();
  const { data: session, status }   = useSession();
  const router                      = useRouter();
  const intervalRef                 = useRef<NodeJS.Timeout | null>(null);

  // ── Socket join/leave ──
  useEffect(() => {
    if (!socket || !isConnected || !user.id) return;
    socket.emit("join-room", {
      userId: user.id, name: user.name, role: user.role,
      managerRole: user.managerRole || "", managerId: user.managerId || null,
    });
    return () => { socket.emit("leave-room", user.id); };
  }, [socket, isConnected, user.id]);

  // ── Force logout detection ──
  // Poll /api/auth/session every 15s — if session becomes null (user deleted/deactivated),
  // sign out immediately and redirect to login.
  useEffect(() => {
    // If NextAuth already says unauthenticated, sign out right away
    if (status === "unauthenticated") {
      signOut({ callbackUrl: "/login" });
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        // Session returns null/empty when JWT callback marks token.deleted = true
        if (!data || !data.user) {
          signOut({ callbackUrl: "/login" });
        }
      } catch {
        // Network error — don't sign out
      }
    };

    // Check every 15 seconds
    intervalRef.current = setInterval(checkSession, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Sidebar
        user={user}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      <div className={[
        "min-h-screen transition-all duration-300 ease-in-out",
        collapsed ? "lg:ml-[68px]" : "lg:ml-60",
      ].join(" ")}>
        <Header user={user} onMenuClick={() => setMobileOpen(true)} collapsed={collapsed} />
        <main className="p-4 sm:p-6 pt-[4.5rem] sm:pt-20 animate-fade-slide-up">
          {children}
        </main>
      </div>
    </div>
  );
}
