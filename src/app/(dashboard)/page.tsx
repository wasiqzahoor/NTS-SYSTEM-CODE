"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-nts-cyan" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  const { role } = session.user;

  if (role === "super_admin") {
    return <AdminDashboard />;
  }

  if (role === "manager") {
    return <ManagerDashboard />;
  }

  return <StaffDashboard />;
}
