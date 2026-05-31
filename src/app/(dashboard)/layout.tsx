import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import DashboardShell from "@/components/common/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Fetch extra fields from DB
  let managerRole = "";
  let managerId = "";
  try {
    await connectDB();
    const dbUser = await User.findById(session.user.id).select("managerRole staffRole avatar managerId").lean() as any;
    if (dbUser?.managerRole) managerRole = dbUser.managerRole;
    if (dbUser?.managerId) managerId = dbUser.managerId.toString();
    if (dbUser?.avatar) session.user.avatar = dbUser.avatar;
    if (dbUser?.staffRole) (session.user as any).staffRole = dbUser.staffRole;
  } catch (e) {
    // silently fail, not critical
  }

  return (
    <DashboardShell user={{ ...session.user, managerRole, managerId }}>
      {children}
    </DashboardShell>
  );
}
