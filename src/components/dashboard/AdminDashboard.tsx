"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FolderKanban,
  ClipboardList,
  Activity,
  Plus,
  Wifi,
  Shield,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useSocket } from "@/hooks/useSocket";

interface Stats {
  totalManagers: number;
  totalStaff: number;
  totalProjects: number;
  totalTasks: number;
  activeProjects: number;
  completedProjects: number;
  completedTasks: number;
  finishedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
}

interface OnlineUser {
  userId: string;
  name: string;
  role: string;
  managerRole?: string;
}

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalManagers: 0, totalStaff: 0, totalProjects: 0, totalTasks: 0,
    activeProjects: 0, completedProjects: 0, completedTasks: 0, finishedTasks: 0, inProgressTasks: 0, todoTasks: 0,
  });
  const [managers, setManagers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("online-users-updated", (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });
    return () => { socket.off("online-users-updated"); };
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [managersRes, staffRes, projectsRes, tasksRes, logsRes, historyRes] = await Promise.all([
        fetch("/api/managers"),
        fetch("/api/staff"),
        fetch("/api/projects"),
        fetch("/api/tasks"),
        fetch("/api/activity-logs?limit=5"),
        fetch("/api/projects?archived=true"),
      ]);

      const managersData = managersRes.ok ? await managersRes.json() : { data: [] };
      const staffData = staffRes.ok ? await staffRes.json() : { data: [] };
      const projectsData = projectsRes.ok ? await projectsRes.json() : { data: [] };
      const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] };
      const logsData = logsRes.ok ? await logsRes.json() : { data: [] };
      const historyData = historyRes && historyRes.ok ? await historyRes.json() : { data: [] };

      const allTasks = tasksData.data || [];

      setManagers(managersData.data || []);
      setTasks(allTasks);

      setStats({
        totalManagers: managersData.data?.length || 0,
        totalStaff: staffData.data?.length || 0,
        totalProjects: projectsData.data?.length || 0,
        totalTasks: allTasks.length,
        activeProjects: projectsData.data?.filter((p: any) => p.status === "active").length || 0,
          completedProjects: historyData.data?.length || 0,
        completedTasks: allTasks.filter((t: any) => t.status === "completed").length,
        finishedTasks: allTasks.filter((t: any) => t.status === "finished").length,
        inProgressTasks: allTasks.filter((t: any) => t.status === "in_progress").length,
        todoTasks: allTasks.filter((t: any) => t.status === "todo").length,
      });

      setRecentActivity(logsData.data || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Task status pie chart data
  const taskStatusData = [
    { name: "To Do", value: stats.todoTasks },
    { name: "In Progress", value: stats.inProgressTasks },
    { name: "Completed", value: stats.completedTasks },
    { name: "Finished", value: stats.finishedTasks },
  ].filter((d) => d.value > 0);

  // Managers bar chart: tasks per manager
  const managerTaskData = managers.map((mgr) => ({
    name: mgr.name.split(" ")[0],
    fullName: mgr.name,
    role: mgr.managerRole || "Manager",
    tasks: tasks.filter((t: any) => t.assignedBy?._id === mgr._id || t.assignedBy === mgr._id).length,
    staff: 0, // could be enriched with staff count
  }));

  const statCards = [
    { title: "Total Managers", value: stats.totalManagers, icon: Users, color: "text-nts-cyan", bgColor: "bg-nts-cyan/10", link: "/admin/managers" },
    { title: "Total Staff", value: stats.totalStaff, icon: Users, color: "text-purple-500", bgColor: "bg-purple-500/10", link: "/admin/staff" },
    { title: "Active Projects", value: stats.totalProjects, icon: FolderKanban, color: "text-nts-yellow", bgColor: "bg-nts-yellow/10", link: "/projects" },
      { title: "Completed Projects", value: stats.completedProjects, icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10", link: "/projects" },
    { title: "Total Tasks", value: stats.totalTasks, icon: ClipboardList, color: "text-green-500", bgColor: "bg-green-500/10", link: "/tasks" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of the entire organization</p>
        </div>
        <Link href="/admin/managers">
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" />Add Manager</Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.link}>
              <Card className="cursor-pointer group overflow-hidden">
                <div className={`stat-accent-bar ${stat.color.replace("text-","bg-")}`} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-muted-foreground leading-none truncate">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">{isLoading ? <span className="skeleton inline-block w-8 h-6" /> : stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-xl ${stat.bgColor} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-nts-cyan" />Task Status Overview</CardTitle>
            <CardDescription>Distribution of all tasks by status</CardDescription>
          </CardHeader>
          <CardContent>
            {taskStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {taskStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Manager Tasks Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-nts-cyan" />Tasks Per Manager</CardTitle>
            <CardDescription>Tasks assigned by each manager</CardDescription>
          </CardHeader>
          <CardContent>
            {managerTaskData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No managers yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={managerTaskData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-card border border-border/60 p-3 rounded-xl shadow-lg text-xs">
                            <p className="font-semibold text-foreground">{d.fullName}</p>
                            <p className="text-muted-foreground capitalize">{d.role}</p>
                            <p className="text-nts-cyan">Tasks: {d.tasks}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="tasks" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Online Users + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Online Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-500" />
              Online Now
              <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">{onlineUsers.length}</span>
            </CardTitle>
            <CardDescription>Currently active users on the system</CardDescription>
          </CardHeader>
          <CardContent>
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No users online</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {onlineUsers.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3 p-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white font-semibold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                        {u.role === "super_admin" ? <Shield className="w-3 h-3" /> : u.role === "manager" ? <UserCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {u.role === "manager" && u.managerRole ? u.managerRole : u.role.replace("_", " ")}
                      </p>
                    </div>
                    <Badge variant={u.role === "super_admin" ? "info" : u.role === "manager" ? "warning" : "success"} className="text-xs capitalize">
                      {u.role === "super_admin" ? "Admin" : u.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-nts-cyan" />Recent Activity</CardTitle>
            <CardDescription>Latest actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                recentActivity.map((log: any) => (
                  <div key={log._id} className="flex items-start gap-3 p-3 rounded-xl bg-accent/30 hover:bg-accent/50 transition-colors">
                    <div className="w-2 h-2 mt-2 rounded-full bg-nts-cyan" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-semibold">{log.userName}</span>{" "}
                        <span className="text-muted-foreground">{log.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
