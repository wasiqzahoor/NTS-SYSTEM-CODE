"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Plus,
  Calendar,
  Clock,
  Paperclip,
  MessageSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Upload,
  X,
  History,
  UserCheck,
  RefreshCw,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import TaskChat from "@/components/chat/TaskChat";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export default function TasksPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    projectId: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
  });
  const [newTaskAttachments, setNewTaskAttachments] = useState<string[]>([]);
  const [uploadingNewAttachment, setUploadingNewAttachment] = useState(false);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
  const [tabMode, setTabMode] = useState<"active" | "history">("active");
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [reassignTaskId, setReassignTaskId] = useState("");
  const [reassignStaffId, setReassignStaffId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    fetchTasks();
    if (session?.user.role === "manager" || session?.user.role === "super_admin") {
      fetchProjects();
      fetchStaff();
    }
  }, [session]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) setTasks(data.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    if (data.success) setProjects(data.data);
  };

  const fetchStaff = async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    if (data.success) setStaff(data.data);
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTask, attachments: newTaskAttachments }),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewTask({ title: "", description: "", projectId: "", assignedTo: "", priority: "medium", dueDate: "" });
        setNewTaskAttachments([]);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string, revisionNotes?: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status, revisionNotes }),
      });
      if (res.ok) {
        fetchTasks();
        // Refresh selectedTask if it's open
        if (selectedTask?._id === taskId) {
          const updated = await res.json();
          if (updated.data) {
            setSelectedTask(updated.data);
          } else {
            setSelectedTask(null);
            setShowTaskDetail(false);
          }
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (res.ok) {
        fetchTasks();
        if (selectedTask?._id === taskId) {
          setSelectedTask(null);
          setShowTaskDetail(false);
        }
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const reassignFinishedTask = async () => {
    if (!reassignTaskId || !reassignStaffId) return;
    setIsReassigning(true);
    try {
      const res = await fetch("/api/tasks/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: reassignTaskId, assignedTo: reassignStaffId }),
      });
      if (res.ok) {
        fetchTasks();
        setShowReassignDialog(false);
        setReassignTaskId("");
        setReassignStaffId("");
      }
    } catch (error) {
      console.error("Error reassigning task:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const uploadAttachment = async (file: File, taskId: string) => {
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.url) {
        const currentAttachments = selectedTask?.attachments || [];
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: taskId, attachments: [...currentAttachments, uploadData.url] }),
        });
        if (res.ok) {
          const updated = await res.json();
          setSelectedTask(updated.data);
          fetchTasks();
        }
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
    } finally {
      setUploadingAttachment(false);
    }
  };

  const uploadNewTaskAttachment = async (file: File) => {
    setUploadingNewAttachment(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (uploadData.url) setNewTaskAttachments((prev) => [...prev, uploadData.url]);
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setUploadingNewAttachment(false);
    }
  };

  const removeAttachment = async (taskId: string, urlToRemove: string) => {
    try {
      const currentAttachments = selectedTask?.attachments || [];
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, attachments: currentAttachments.filter((u: string) => u !== urlToRemove) }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTask(updated.data);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error removing attachment:", error);
    }
  };

  const activeTasks = tasks.filter((t: any) => t.status !== "finished");
  const historyTasks = tasks.filter((t: any) => t.status === "finished");
  const sourceList = tabMode === "history" ? historyTasks : activeTasks;
  const filteredTasks = sourceList.filter((task) => {
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: any = {
      todo: { variant: "outline", label: "To Do" },
      in_progress: { variant: "info", label: "In Progress" },
      completed: { variant: "success", label: "Completed" },
      revision_requested: { variant: "warning", label: "Revision" },
      finished: { variant: "default", label: "Finished ✓" },
    };
    const config = variants[status] || variants.todo;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: any = {
      low: { variant: "success", label: "Low" },
      medium: { variant: "warning", label: "Medium" },
      high: { variant: "destructive", label: "High" },
    };
    return <Badge variant={variants[priority]?.variant || "outline"}>{priority}</Badge>;
  };

  const isManagerOrAdmin = session?.user.role === "manager" || session?.user.role === "super_admin";

  if (viewMode === "kanban" && tabMode === "active") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">Manage and track all tasks</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setViewMode("list")}>List View</Button>
            <Button variant="primary" onClick={() => setViewMode("kanban")}>Kanban View</Button>
            {isManagerOrAdmin && (
              <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />New Task
              </Button>
            )}
          </div>
        </div>
        <KanbanBoard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage and track all tasks</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant={tabMode === "active" ? "primary" : "outline"}
            onClick={() => setTabMode("active")}
            className="gap-2"
          >
            <ClipboardList className="w-4 h-4" />
            Active Tasks
            {activeTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{activeTasks.length}</span>
            )}
          </Button>
          <Button
            variant={tabMode === "history" ? "primary" : "outline"}
            onClick={() => setTabMode("history")}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            History
            {historyTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{historyTasks.length}</span>
            )}
          </Button>
          {tabMode === "active" && (
            <>
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
              >
                {viewMode === "list" ? "Kanban View" : "List View"}
              </Button>
              {isManagerOrAdmin && (
                <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />New Task
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="revision_requested">Revision</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Task</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Project</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Assigned To</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Priority</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan mx-auto" />
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {tabMode === "history" ? "No finished tasks in history" : "No tasks found"}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task._id}
                      className="border-b border-gray-100 dark:border-border/40 hover:bg-accent/60 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {task.projectId?.title || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                            {task.assignedTo?.name?.charAt(0) || "?"}
                          </div>
                          <span className="text-sm text-foreground">{task.assignedTo?.name || "Unassigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(task.priority)}</td>
                      <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No deadline"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {/* Single details button — opens popup */}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Details"
                            onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                          >
                            <MessageSquare className="w-4 h-4 text-nts-cyan" />
                          </Button>

                          {/* Staff actions */}
                          {session?.user.role === "staff" && task.status === "todo" && (
                            <Button variant="ghost" size="sm" title="Start Task" onClick={() => updateTaskStatus(task._id, "in_progress")}>
                              <Clock className="w-4 h-4 text-nts-cyan" />
                            </Button>
                          )}
                          {session?.user.role === "staff" && task.status === "in_progress" && (
                            <Button variant="ghost" size="sm" title="Mark Complete" onClick={() => updateTaskStatus(task._id, "completed")}>
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            </Button>
                          )}

                          {/* Manager / Admin actions */}
                          {isManagerOrAdmin && (
                            <>
                              {task.status === "completed" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Request Revision"
                                    onClick={() => updateTaskStatus(task._id, "revision_requested", "Needs revision")}
                                  >
                                    <RotateCcw className="w-4 h-4 text-orange-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Approve & Mark Finished"
                                    onClick={() => updateTaskStatus(task._id, "finished")}
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-purple-500" />
                                  </Button>
                                </>
                              )}
                              {task.status === "finished" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Move back to To Do"
                                    onClick={() => updateTaskStatus(task._id, "todo")}
                                  >
                                    <RotateCcw className="w-4 h-4 text-yellow-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Reassign to another staff"
                                    onClick={() => { setReassignTaskId(task._id); setShowReassignDialog(true); }}
                                  >
                                    <UserCheck className="w-4 h-4 text-nts-cyan" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete Task"
                                onClick={() => setConfirmDeleteTask({ open: true, id: task._id, title: task.title })}
                              >
                                <XCircle className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Assign a task to your team member</DialogDescription>
          </DialogHeader>
          <form onSubmit={createTask} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Task title" required />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description"
                  className="w-full min-h-[100px] rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Project</label>
                <Select value={newTask.projectId} onValueChange={(v) => setNewTask({ ...newTask, projectId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p._id} value={p._id}>{p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Assign To</label>
                <Select value={newTask.assignedTo} onValueChange={(v) => setNewTask({ ...newTask, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Priority</label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Due Date</label>
                  <Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Paperclip className="w-4 h-4" />Attachments (optional)
                </label>
                {newTaskAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {newTaskAttachments.map((url, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="cursor-pointer text-xs hover:bg-nts-cyan/10">
                            <Paperclip className="w-3 h-3 mr-1" />File {i + 1}
                          </Badge>
                        </a>
                        <button type="button" onClick={() => setNewTaskAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-3 hover:border-nts-cyan transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploadingNewAttachment ? "Uploading..." : "Click to upload file or image"}</span>
                  <input type="file" className="hidden" disabled={uploadingNewAttachment} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadNewTaskAttachment(f); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 shrink-0 border-t border-gray-100 dark:border-border/40 mt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create Task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task Detail Popup */}
      <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>{selectedTask?.projectId?.title}</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Status + Priority */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask.status)}
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-1">Description</h4>
                  <p className="text-sm text-foreground">{selectedTask.description}</p>
                </div>

                {/* Assigned To + Due Date */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Assigned To:</span>
                    <p className="font-medium">{selectedTask.assignedTo?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>
                    <p className="font-medium">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No deadline"}</p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedTask.attachments?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Attachments</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.attachments.map((url: string, i: number) => (
                        <div key={i} className="flex items-center gap-1 group">
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Badge variant="outline" className="cursor-pointer hover:bg-nts-cyan/10">
                              <Paperclip className="w-3 h-3 mr-1" />File {i + 1}
                            </Badge>
                          </a>
                          <button onClick={() => removeAttachment(selectedTask._id, url)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3 text-red-400 hover:text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Attachment */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    {selectedTask.attachments?.length > 0 ? "Add More Attachments" : "Add Attachment"}
                  </h4>
                  <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-3 hover:border-nts-cyan transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploadingAttachment ? "Uploading..." : "Click to upload file"}</span>
                    <input type="file" className="hidden" disabled={uploadingAttachment} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f, selectedTask._id); e.target.value = ""; }} />
                  </label>
                </div>

                {/* Revision Notes */}
                {selectedTask.revisionNotes && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <h4 className="font-medium text-orange-600 mb-1">Revision Notes</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-400">{selectedTask.revisionNotes}</p>
                  </div>
                )}

                {/* ===== ACTION BUTTONS ===== */}
                <div className="flex gap-2 pt-2 flex-wrap border-t border-gray-100 dark:border-border/40">
                  {/* Staff: Start */}
                  {session?.user.role === "staff" && selectedTask.status === "todo" && (
                    <Button variant="primary" onClick={() => updateTaskStatus(selectedTask._id, "in_progress")}>
                      <Clock className="w-4 h-4 mr-2" />Start Task
                    </Button>
                  )}
                  {/* Staff: Complete */}
                  {session?.user.role === "staff" && selectedTask.status === "in_progress" && (
                    <Button variant="primary" onClick={() => updateTaskStatus(selectedTask._id, "completed")}>
                      <CheckCircle2 className="w-4 h-4 mr-2" />Mark Complete
                    </Button>
                  )}
                  {/* Manager/Admin: completed → approve or request revision */}
                  {isManagerOrAdmin && selectedTask.status === "completed" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => updateTaskStatus(selectedTask._id, "revision_requested", "Needs revision")}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />Request Revision
                      </Button>
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => updateTaskStatus(selectedTask._id, "finished")}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />Approve & Finish
                      </Button>
                    </>
                  )}
                  {/* Manager/Admin: finished → move to pending OR reassign */}
                  {isManagerOrAdmin && selectedTask.status === "finished" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => updateTaskStatus(selectedTask._id, "todo")}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />Move to Pending
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setReassignTaskId(selectedTask._id);
                          setShowTaskDetail(false);
                          setShowReassignDialog(true);
                        }}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />Reassign Task
                      </Button>
                    </>
                  )}
                  {/* Delete */}
                  {isManagerOrAdmin && (
                    <Button
                      className="ml-auto bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => setConfirmDeleteTask({ open: true, id: selectedTask._id, title: selectedTask.title })}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />Delete Task
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat */}
              <TaskChat taskId={selectedTask._id} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmModal
        open={confirmDeleteTask.open}
        onOpenChange={(open) => setConfirmDeleteTask({ ...confirmDeleteTask, open })}
        title="Delete Task"
        description={`Are you sure you want to delete task "${confirmDeleteTask.title}"?`}
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={() => deleteTask(confirmDeleteTask.id)}
      />

      {/* Reassign Finished Task Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-nts-cyan" />Reassign Task to Staff
            </DialogTitle>
            <DialogDescription>
              This finished task will be moved back to "To Do" and assigned to the selected staff member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Select Staff Member</label>
              <Select value={reassignStaffId} onValueChange={setReassignStaffId}>
                <SelectTrigger><SelectValue placeholder="Choose a staff member..." /></SelectTrigger>
                <SelectContent>
                  {staff.length > 0
                    ? staff.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>{s.name} ({s.email})</SelectItem>
                      ))
                    : tasks
                        .flatMap((t: any) => (t.assignedTo ? [t.assignedTo] : []))
                        .filter((s: any, i: number, arr: any[]) => arr.findIndex((x: any) => x._id === s._id) === i)
                        .map((s: any) => (
                          <SelectItem key={s._id} value={s._id}>{s.name} ({s.email})</SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReassignDialog(false)}>Cancel</Button>
              <Button variant="primary" disabled={!reassignStaffId || isReassigning} onClick={reassignFinishedTask}>
                {isReassigning ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Reassigning...</>
                ) : (
                  <><UserCheck className="w-4 h-4 mr-2" />Reassign Task</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
