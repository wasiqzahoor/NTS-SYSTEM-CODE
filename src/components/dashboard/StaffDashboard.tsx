"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FolderKanban,
  FolderCheck,
  History,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";

export default function StaffDashboard() {
  const [stats, setStats] = useState({
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [tasksRes, projectsRes, historyRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/projects"),
        fetch("/api/projects?archived=true"),
      ]);
      const tasksData = tasksRes.ok ? await tasksRes.json() : { data: [] };
      const projectsData = projectsRes.ok ? await projectsRes.json() : { data: [] };
      const historyData = historyRes.ok ? await historyRes.json() : { data: [] };

      setStats({
        totalTasks: tasksData.data?.length || 0,
        todoTasks: tasksData.data?.filter((t: any) => t.status === "todo").length || 0,
        inProgressTasks: tasksData.data?.filter((t: any) => t.status === "in_progress").length || 0,
        completedTasks: tasksData.data?.filter((t: any) => t.status === "completed").length || 0,
        highPriorityTasks: tasksData.data?.filter((t: any) =>
          t.priority === "high" &&
          t.status !== "completed" &&
          t.status !== "finished" &&
          t.project?.status !== "completed" &&
          t.project?.status !== "archived"
        ).length || 0,
      });

      const sortedTasks = tasksData.data?.sort((a: any, b: any) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
          return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
        }
        return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
      }) || [];

      setTasks(sortedTasks.slice(0, 6));
      setActiveProjects(projectsData.data || []);
      setHistoryProjects(historyData.data || []);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">Your tasks and priorities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Tasks", value: stats.totalTasks, icon: ClipboardList, color: "text-nts-cyan", bg: "bg-nts-cyan/10" },
          { title: "To Do", value: stats.todoTasks, icon: Clock, color: "text-gray-500", bg: "bg-gray-500/10" },
          { title: "In Progress", value: stats.inProgressTasks, icon: AlertTriangle, color: "text-nts-yellow", bg: "bg-nts-yellow/10" },
          { title: "Completed", value: stats.completedTasks, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                      {isLoading ? "-" : stat.value}
                    </p>
                  </div>
                  <div className={cn("p-2 rounded-lg", stat.bg)}>
                    <Icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* High Priority Alert */}
      {stats.highPriorityTasks > 0 && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              {stats.highPriorityTasks} high priority task{stats.highPriorityTasks > 1 ? "s" : ""} pending
            </p>
            <p className="text-xs text-red-500/80">Please prioritize these tasks</p>
          </div>
        </div>
      )}

      {/* Projects Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Projects I'm In */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-nts-cyan" />
              <CardTitle className="text-base">My Active Projects</CardTitle>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-nts-cyan/10 text-nts-cyan text-xs font-bold">
                {activeProjects.length}
              </span>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nts-cyan" />
              </div>
            ) : activeProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active projects
              </p>
            ) : (
              <div className="space-y-2">
                {activeProjects.slice(0, 4).map((project: any) => (
                  <Link key={project._id} href={`/projects/${project._id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-nts-cyan flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Manager: {project.managerId?.name || "—"} • Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={project.status === "active" ? "info" : project.status === "inactive" ? "default" : "warning"} className="ml-2 flex-shrink-0">
                        {project.status === "inactive" ? "Inactive" : project.status === "on_hold" ? "On Hold" : "Active"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {activeProjects.length > 4 && (
                  <Link href="/projects">
                    <p className="text-xs text-nts-cyan text-center pt-1 hover:underline">
                      +{activeProjects.length - 4} more projects
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed Projects History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-500" />
              <CardTitle className="text-base">Completed Projects</CardTitle>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs font-bold">
                {historyProjects.length}
              </span>
            </div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                History <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nts-cyan" />
              </div>
            ) : historyProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No completed projects yet
              </p>
            ) : (
              <div className="space-y-2">
                {historyProjects.slice(0, 4).map((project: any) => (
                  <div key={project._id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.completedAt
                            ? `Completed: ${new Date(project.completedAt).toLocaleDateString()}`
                            : `Ended: ${project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" className="ml-2 flex-shrink-0 gap-1">
                      <CheckCheck className="w-3 h-3" /> Done
                    </Badge>
                  </div>
                ))}
                {historyProjects.length > 4 && (
                  <Link href="/projects">
                    <p className="text-xs text-emerald-500 text-center pt-1 hover:underline">
                      +{historyProjects.length - 4} more completed
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Tasks</CardTitle>
            <CardDescription>Sorted by priority</CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="ghost" size="sm" className="gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks assigned yet
              </p>
            ) : (
              tasks.map((task: any) => (
                <Link key={task._id} href={`/tasks/${task._id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.status === "completed" ? "bg-green-500" :
                        task.status === "in_progress" ? "bg-nts-cyan" :
                        task.status === "revision_requested" ? "bg-orange-500" : "bg-gray-400"
                      )} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.projectId?.title || "No Project"} • Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      task.priority === "high" ? "destructive" :
                      task.priority === "medium" ? "warning" : "success"
                    }>
                      {task.priority}
                    </Badge>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
