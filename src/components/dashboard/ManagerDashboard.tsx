"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, FolderKanban, ClipboardList, Clock, AlertTriangle, CheckCircle2, Plus, Wifi, UserCheck, History,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { useSocket } from "@/hooks/useSocket";

interface OnlineUser {
  userId: string;
  name: string;
  role: string;
  managerRole?: string;
  managerId?: string | null;
}

const COLORS = ["#06b6d4", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    totalStaff: 0, totalProjects: 0, completedProjects: 0, totalTasks: 0,
    pendingApprovals: 0, overdueTasks: 0, finishedTasks: 0, inProgressTasks: 0, todoTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { socket } = useSocket();

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on("online-users-updated", (users: OnlineUser[]) => setOnlineUsers(users));
    return () => { socket.off("online-users-updated"); };
  }, [socket]);

  const fetchStats = async () => {
    try {
      const [staffRes, projectsRes, historyRes, tasksRes] = await Promise.all([
        fetch("/api/staff"),
        fetch("/api/projects"),
        fetch("/api/projects?archived=true"),
        fetch("/api/tasks"),
      ]);

      const staffData = staffRes.ok ? await staffRes.json() : { data: [] };
      const projects = projectsRes.ok ? await projectsRes.json() : { data: [] };
      const historyProjects = historyRes.ok ? await historyRes.json() : { data: [] };
      const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] };
      const allTasks = tasksData.data || [];

      const now = new Date();
      const overdue = allTasks.filter((t: any) => t.dueDate && new Date(t.dueDate) < now && !["completed", "finished"].includes(t.status));
      const pending = allTasks.filter((t: any) => t.status === "completed");

      setStaff(staffData.data || []);
      setTasks(allTasks);

      setStats({
        totalStaff: staffData.data?.length || 0,
        totalProjects: projects.data?.length || 0,
        completedProjects: historyProjects.data?.length || 0,
        totalTasks: allTasks.length,
        pendingApprovals: pending.length,
        overdueTasks: overdue.length,
        finishedTasks: allTasks.filter((t: any) => t.status === "finished").length,
        inProgressTasks: allTasks.filter((t: any) => t.status === "in_progress").length,
        todoTasks: allTasks.filter((t: any) => t.status === "todo").length,
      });

      setRecentTasks(allTasks.slice(0, 5));
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const taskStatusData = [
    { name: "To Do", value: stats.todoTasks },
    { name: "In Progress", value: stats.inProgressTasks },
    { name: "Completed", value: stats.pendingApprovals },
    { name: "Finished", value: stats.finishedTasks },
  ].filter((d) => d.value > 0);

  const staffTaskData = staff.map((s: any) => ({
    name: s.name.split(" ")[0],
    fullName: s.name,
    tasks: tasks.filter((t: any) => t.assignedTo?._id === s._id || t.assignedTo === s._id).length,
  }));

  const onlineStaff = onlineUsers.filter((u) => u.role === "staff");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your team and projects</p>
        </div>
        <div className="flex gap-3">
          <Link href="/manager/staff">
            <Button variant="outline" className="gap-2"><Plus className="w-4 h-4" />Add Staff</Button>
          </Link>
          <Link href="/projects">
            <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" />New Project</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid — now includes Completed Projects */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "My Team", value: stats.totalStaff, icon: Users, color: "text-nts-cyan", bg: "bg-nts-cyan/10" },
          { title: "Active Projects", value: stats.totalProjects, icon: FolderKanban, color: "text-nts-yellow", bg: "bg-nts-yellow/10" },
          { title: "Completed Projects", value: stats.completedProjects, icon: History, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { title: "Tasks", value: stats.totalTasks, icon: ClipboardList, color: "text-purple-500", bg: "bg-purple-500/10" },
          { title: "Pending Approval", value: stats.pendingApprovals, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
          { title: "Overdue", value: stats.overdueTasks, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{isLoading ? "-" : stat.value}</p>
                    <div className={`p-2 rounded-lg ${stat.bg}`}><Icon className={`w-4 h-4 ${stat.color}`} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-nts-cyan" />Task Status</CardTitle>
            <CardDescription>All task statuses in your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {taskStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {taskStatusData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-nts-cyan" />Tasks Per Staff</CardTitle>
            <CardDescription>How many tasks each staff member has</CardDescription>
          </CardHeader>
          <CardContent>
            {staffTaskData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No staff yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={staffTaskData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border border-border/60 text-sm">
                          <p className="font-semibold text-foreground">{d.fullName}</p>
                          <p className="text-nts-cyan">Tasks: {d.tasks}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="tasks" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Online Staff + Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-green-500" />
              Online Staff
              <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-bold">{onlineStaff.length}</span>
            </CardTitle>
            <CardDescription>Staff members currently active</CardDescription>
          </CardHeader>
          <CardContent>
            {onlineStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No staff online right now</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {onlineStaff.map((u) => (
                  <div key={u.userId} className="flex items-center gap-3 p-2 rounded-lg bg-accent/50">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-nts-cyan flex items-center justify-center text-white font-semibold text-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="w-3 h-3" /> Staff</p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Latest tasks in your projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
              ) : (
                recentTasks.map((task: any) => (
                  <div key={task._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        task.status === "finished" ? "bg-blue-500" :
                        task.status === "completed" ? "bg-green-500" :
                        task.status === "in_progress" ? "bg-nts-cyan" :
                        task.status === "revision_requested" ? "bg-orange-500" : "bg-gray-400"
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">Assigned to: {task.assignedTo?.name || "Unknown"}</p>
                      </div>
                    </div>
                    <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "warning" : "success"}>
                      {task.priority}
                    </Badge>
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
