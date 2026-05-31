"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(requiredRole?: string[]) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/login");
      return;
    }

    if (requiredRole && !requiredRole.includes(session.user.role)) {
      router.push("/");
    }
  }, [session, status, router, requiredRole]);

  return {
    session,
    status,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    user: session?.user,
  };
}
