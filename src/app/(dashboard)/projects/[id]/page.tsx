"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Calendar,
  User,
  Trash2,
  BarChart3,
  Activity,
} from "lucide-react";

export default function ProjectDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectsRes, archivedRes, tasksRes, logsRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/projects?archived=true"),
        fetch(`/api/tasks?projectId=${projectId}`),
        fetch(`/api/activity-logs?entityId=${projectId}`),
      ]);

      const projectsData = await projectsRes.json();
      const archivedData = archivedRes.ok ? await archivedRes.json() : { data: [] };
      const tasksData = await tasksRes.json();
      const logsData = await logsRes.json();

      // Search in both active and archived projects
      const allProjects = [
        ...(projectsData.success ? projectsData.data : []),
        ...(archivedData.success ? archivedData.data : []),
      ];
      const found = allProjects.find((p: any) => p._id === projectId);
      setProject(found || null);

      if (tasksData.success) setTasks(tasksData.data);
      if (logsData.success) setActivityLogs(logsData.data);
    } catch (error) {
      console.error("Error fetching project data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async () => {

    try {
      const res = await fetch(`/api/projects?id=${projectId}`, { method: "DELETE" });
      if (res.ok) router.push("/projects");
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      active: <Badge variant="info">Active</Badge>,
      completed: <Badge variant="success">Completed</Badge>,
      on_hold: <Badge variant="warning">On Hold</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const getTaskStatusBadge = (status: string) => {
    const map: any = {
      todo: <Badge variant="outline">To Do</Badge>,
      in_progress: <Badge variant="info">In Progress</Badge>,
      completed: <Badge variant="success">Completed</Badge>,
      revision_requested: <Badge variant="warning">Revision</Badge>,
      finished: <Badge variant="default">Finished ✓</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: any = {
      high: <Badge variant="destructive">High</Badge>,
      medium: <Badge variant="warning">Medium</Badge>,
      low: <Badge variant="success">Low</Badge>,
    };
    return map[priority] || <Badge>{priority}</Badge>;
  };

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
    revision: tasks.filter((t) => t.status === "revision_requested").length,
    finished: tasks.filter((t) => t.status === "finished").length,
  };

  // finished + completed dono ko "done" count karo progress me
  const doneTasks = taskStats.finished + taskStats.completed;
  const completionPct = taskStats.total > 0
    ? Math.round((doneTasks / taskStats.total) * 100)
    : 0;

  // Unique staff on project
  const uniqueStaff = project?.staffIds || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nts-cyan" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Project not found or you don&apos;t have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/projects")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/projects")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{project.title}</h1>
              {getStatusBadge(project.status)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          </div>
        </div>
        {(session?.user.role === "super_admin" || session?.user.role === "manager") && (
          <Button
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </Button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-foreground tracking-tight">{taskStats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{taskStats.todo}</p>
            <p className="text-xs text-muted-foreground mt-1">To Do</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-nts-cyan">{taskStats.in_progress}</p>
            <p className="text-xs text-muted-foreground mt-1">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{taskStats.completed}</p>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{taskStats.revision}</p>
            <p className="text-xs text-muted-foreground mt-1">Revision</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-500">{taskStats.finished}</p>
            <p className="text-xs text-muted-foreground mt-1">Finished ✓</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar + Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-nts-cyan" />
              Completion Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{doneTasks} of {taskStats.total} tasks done</span>
                <span className="font-bold text-nts-cyan">{completionPct}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-nts-cyan to-nts-blue-magenta rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(project.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(project.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-nts-cyan" />
              Team Members ({uniqueStaff.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {uniqueStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {uniqueStaff.map((member: any) => (
                  <div key={member._id || member} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                      {(member.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="ml-auto text-xs text-muted-foreground">
                      {tasks.filter((t) => t.assignedTo?._id === (member._id || member)).length} tasks
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Tasks in this Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-nts-cyan" />
            All Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Task</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Assigned To</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Priority</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Due Date</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Completed At</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">Finished At</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      No tasks in this project yet.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task._id}
                      className="border-b border-gray-100 dark:border-border/40 hover:bg-accent/60 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-[10px] font-bold">
                            {(task.assignedTo?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-foreground">{task.assignedTo?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">by {task.assignedBy?.name || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                      <td className="px-6 py-4">{getTaskStatusBadge(task.status)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {task.completedAt ? (
                          <span className="text-green-500">
                            {new Date(task.completedAt).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {task.finishedAt ? (
                          <span className="text-purple-500 font-medium">
                            {new Date(task.finishedAt).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      {activityLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-nts-cyan" />
              Activity History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityLogs.map((log) => (
                <div
                  key={log._id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-accent/40"
                >
                  <div className="w-8 h-8 rounded-full bg-nts-cyan/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-nts-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{log.userName}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {log.userRole?.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{log.details || log.action}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Project"
        description={`Delete project "${project?.title}"? All tasks will also be deleted. This cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={deleteProject}
      />
    </div>
  );
}