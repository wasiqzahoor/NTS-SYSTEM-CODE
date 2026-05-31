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
  Paperclip,
  Upload,
  X,
  User,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Clock,
  Trash2,
  Activity,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import TaskChat from "@/components/chat/TaskChat";

export default function TaskDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<any>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  useEffect(() => {
    if (taskId) fetchTaskData();
  }, [taskId]);

  const fetchTaskData = async () => {
    try {
      const [tasksRes, logsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch(`/api/activity-logs?entityId=${taskId}&limit=50`),
      ]);
      const tasksData = await tasksRes.json();
      const logsData = await logsRes.json();
      if (tasksData.success) {
        const found = tasksData.data.find((t: any) => t._id === taskId);
        setTask(found || null);
      }
      if (logsData.success) setActivityLogs(logsData.data);
    } catch (error) {
      console.error("Error fetching task data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string, notes?: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status, revisionNotes: notes }),
      });
      if (res.ok) {
        setShowRevisionInput(false);
        setRevisionNote("");
        fetchTaskData();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async () => {
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (res.ok) router.push("/tasks");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const uploadAttachment = async (file: File) => {
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.url) {
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, attachments: [...(task?.attachments || []), uploadData.url] }),
        });
        if (res.ok) fetchTaskData();
      }
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const removeAttachment = async (urlToRemove: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, attachments: task.attachments.filter((u: string) => u !== urlToRemove) }),
      });
      if (res.ok) fetchTaskData();
    } catch (error) {
      console.error("Error removing attachment:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: any = {
      todo: <Badge variant="outline">To Do</Badge>,
      in_progress: <Badge variant="info">In Progress</Badge>,
      completed: <Badge variant="success">Completed</Badge>,
      revision_requested: <Badge variant="warning">Revision Requested</Badge>,
      finished: <Badge variant="default">Finished ✓</Badge>,
    };
    return map[status] || <Badge>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const map: any = {
      high: <Badge variant="destructive">High Priority</Badge>,
      medium: <Badge variant="warning">Medium Priority</Badge>,
      low: <Badge variant="success">Low Priority</Badge>,
    };
    return map[priority] || <Badge>{priority}</Badge>;
  };

  const isManagerOrAdmin = session?.user.role === "manager" || session?.user.role === "super_admin";
  const canUpload = session?.user.role === "staff" || isManagerOrAdmin;
  const canDelete = isManagerOrAdmin;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-nts-cyan" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Task not found or you don&apos;t have access.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/tasks")}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push("/tasks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{task.title}</h1>
              {getStatusBadge(task.status)}
              {getPriorityBadge(task.priority)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Project: {task.projectId?.title || "N/A"}</p>
          </div>
        </div>
        {canDelete && (
          <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="w-4 h-4 mr-2" />Delete Task
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Task Info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Task Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{task.description}</p>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Assigned To</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                      {(task.assignedTo?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.assignedTo?.name}</p>
                      <p className="text-xs text-muted-foreground">{task.assignedTo?.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Assigned By</p>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-nts-cyan/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-nts-cyan" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.assignedBy?.name}</p>
                      <p className="text-xs text-muted-foreground">{task.assignedBy?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Due Date</p>
                  <div className="flex items-center gap-1 text-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Created</p>
                  <div className="flex items-center gap-1 text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {new Date(task.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {task.completedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Completed At</p>
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="w-4 h-4" />
                      {new Date(task.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {task.approvedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Approved At</p>
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {new Date(task.approvedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {task.finishedAt && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Finished At</p>
                    <div className="flex items-center gap-1 text-purple-500">
                      <CheckCircle2 className="w-4 h-4" />
                      {new Date(task.finishedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>

              {task.notes && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Notes</p>
                  <p className="text-sm text-foreground bg-accent/40 rounded-lg p-3">{task.notes}</p>
                </div>
              )}

              {task.revisionNotes && (
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <p className="text-xs font-medium text-orange-600 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />Revision Notes
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">{task.revisionNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-nts-cyan" />
                Attachments ({task.attachments?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.attachments?.length > 0 ? (
                <div className="space-y-2">
                  {task.attachments.map((url: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-2xl border border-border/60 hover:bg-accent/60 group">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-nts-cyan hover:underline flex-1 truncate">
                        <Paperclip className="w-4 h-4 flex-shrink-0" />Attachment {i + 1}
                      </a>
                      {canUpload && (
                        <button onClick={() => removeAttachment(url)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No attachments yet.</p>
              )}
              {canUpload && (
                <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-border rounded-lg p-3 hover:border-nts-cyan hover:bg-nts-cyan/5 transition-all">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingAttachment ? "Uploading..." : "Click to upload a file"}</span>
                  <input type="file" className="hidden" disabled={uploadingAttachment} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                </label>
              )}
            </CardContent>
          </Card>

          {/* ===== ACTIONS CARD ===== */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">

              {/* Staff: Start Task */}
              {session?.user.role === "staff" && task.status === "todo" && (
                <Button variant="primary" className="w-full" onClick={() => updateStatus("in_progress")}>
                  <Clock className="w-4 h-4 mr-2" />Start Task
                </Button>
              )}

              {/* Staff: Mark Complete */}
              {session?.user.role === "staff" && task.status === "in_progress" && (
                <Button variant="primary" className="w-full" onClick={() => updateStatus("completed")}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Mark as Complete
                </Button>
              )}

              {/* Staff: revision was requested — work on it again */}
              {session?.user.role === "staff" && task.status === "revision_requested" && (
                <Button variant="primary" className="w-full" onClick={() => updateStatus("in_progress")}>
                  <Clock className="w-4 h-4 mr-2" />Resume & Revise
                </Button>
              )}

              {/* Manager/Admin: completed → Approve (Finish) or Request Revision */}
              {isManagerOrAdmin && task.status === "completed" && (
                <>
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => updateStatus("finished")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />Approve & Mark Finished
                  </Button>

                  {!showRevisionInput ? (
                    <Button variant="outline" className="w-full" onClick={() => setShowRevisionInput(true)}>
                      <RotateCcw className="w-4 h-4 mr-2" />Request Revision
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        placeholder="Describe what needs to be revised..."
                        className="w-full rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 py-2 text-sm min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => { setShowRevisionInput(false); setRevisionNote(""); }}>
                          Cancel
                        </Button>
                        <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={() => updateStatus("revision_requested", revisionNote)}>
                          Send Revision
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Manager/Admin: move revision back to in progress */}
              {isManagerOrAdmin && task.status === "revision_requested" && (
                <Button variant="primary" className="w-full" onClick={() => updateStatus("in_progress")}>
                  <Clock className="w-4 h-4 mr-2" />Move Back to In Progress
                </Button>
              )}

              {/* Manager/Admin: finished → Move to Pending OR Reassign */}
              {isManagerOrAdmin && task.status === "finished" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-1">This task is finished and in history.</p>
                  <Button variant="outline" className="w-full" onClick={() => updateStatus("todo")}>
                    <RotateCcw className="w-4 h-4 mr-2" />Move to Pending (To Do)
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-nts-cyan text-nts-cyan hover:bg-nts-cyan/10"
                    onClick={() => router.push("/tasks?reassign=" + taskId)}
                  >
                    <UserCheck className="w-4 h-4 mr-2" />Reassign to Another Staff
                  </Button>
                </div>
              )}

              {/* No actions available */}
              {task.status === "todo" && session?.user.role !== "staff" && (
                <p className="text-sm text-muted-foreground text-center py-2">Waiting for staff to start this task.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Chat + Activity */}
        <div className="space-y-6">
          <div style={{ height: "520px" }} className="flex flex-col overflow-hidden rounded-xl border border-border/60">
            <TaskChat taskId={taskId} isReadOnly={task?.status === "finished"} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-nts-cyan" />
                Activity History ({activityLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div key={log._id} className="flex items-start gap-3 p-3 rounded-lg bg-accent/40">
                      <div className="w-7 h-7 rounded-full bg-nts-cyan/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-nts-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-foreground">{log.userName}</span>
                          <Badge variant="outline" className="text-[10px] capitalize py-0">
                            {log.userRole?.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{log.details || log.action}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Task"
        description={`Are you sure you want to delete task "${task?.title}"?`}
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={deleteTask}
      />
    </div>
  );
}
