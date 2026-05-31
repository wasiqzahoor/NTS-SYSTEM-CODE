"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Paperclip,
  Calendar,
  ArrowUp,
  ArrowDown,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
  Send,
} from "lucide-react";
import TaskChat from "@/components/chat/TaskChat";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useSession } from "next-auth/react";

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"priority" | "dueDate" | "status">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: session } = useSession();
  const { socket } = useSocket();

  // File upload state
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Real-time: auto-sync when tasks are assigned/updated
  useEffect(() => {
    if (!socket || !session?.user?.id) return;
    socket.emit("join-room", session.user.id);
    socket.on("task-updated", () => {
      fetchTasks();
    });
    return () => { socket.off("task-updated"); };
  }, [socket, session?.user?.id]);

  // Sync notes and attachments when task selected
  useEffect(() => {
    if (selectedTask) {
      setNotes(selectedTask.notes || "");
      setNewAttachments([]);
    }
  }, [selectedTask?._id]);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
        // If a task is currently selected, refresh it too
        if (selectedTask) {
          const refreshed = data.data.find((t: any) => t._id === selectedTask._id);
          if (refreshed) setSelectedTask(refreshed);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload files to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadingFiles(true);
    const uploaded: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          uploaded.push(data.url);
        }
      } catch (err) {
        console.error("Upload failed for", file.name, err);
      }
    }

    setNewAttachments((prev) => [...prev, ...uploaded]);
    setUploadingFiles(false);
    setUploadProgress("");

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeNewAttachment = (url: string) => {
    setNewAttachments((prev) => prev.filter((u) => u !== url));
  };

  // Save notes + any new attachments
  const saveNotesAndAttachments = async () => {
    if (!selectedTask) return;
    setSavingNotes(true);
    try {
      const allAttachments = [
        ...(selectedTask.attachments || []),
        ...newAttachments,
      ];
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedTask._id,
          notes,
          attachments: allAttachments,
        }),
      });
      if (res.ok) {
        setNewAttachments([]);
        fetchTasks();
      }
    } catch (error) {
      console.error("Error saving notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  // Update task status (start / submit / re-submit after revision)
  const updateTaskStatus = async (taskId: string, status: string) => {
    setUpdatingStatus(true);
    try {
      // Save any pending attachments + notes together with status
      const task = tasks.find((t) => t._id === taskId);
      const allAttachments = [
        ...(task?.attachments || []),
        ...newAttachments,
      ];

      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status,
          notes,
          attachments: allAttachments,
        }),
      });

      if (res.ok) {
        setNewAttachments([]);
        await fetchTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getFileName = (url: string) => {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1].split("?")[0]);
    } catch {
      return "File";
    }
  };

  const isImage = (url: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":   return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":    return "bg-green-500/10 text-green-500 border-green-500/20";
      default:       return "bg-gray-500/10 text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      todo:               { class: "bg-gray-500/10 text-muted-foreground",         label: "To Do" },
      in_progress:        { class: "bg-nts-cyan/10 text-nts-cyan",          label: "In Progress" },
      completed:          { class: "bg-green-500/10 text-green-500",        label: "Submitted" },
      revision_requested: { class: "bg-orange-500/10 text-orange-500",      label: "Revision Needed" },
    };
    const config = variants[status] || variants.todo;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      comparison =
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 0);
    } else if (sortBy === "dueDate") {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      comparison = dateA - dateB;
    } else if (sortBy === "status") {
      const statusOrder = { todo: 1, in_progress: 2, revision_requested: 3, completed: 4 };
      comparison =
        (statusOrder[a.status as keyof typeof statusOrder] || 0) -
        (statusOrder[b.status as keyof typeof statusOrder] || 0);
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {tasks.filter((t: any) => t.status !== "completed").length} pending tasks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 text-sm"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="status">Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-2 rounded-2xl border border-gray-300 dark:border-border/60 hover:bg-accent"
          >
            {sortOrder === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Task Cards */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No tasks assigned</h3>
            <p className="text-muted-foreground">You do not have any tasks yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedTasks.map((task) => (
            <Card
              key={task._id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-foreground mb-2">{task.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {task.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      {task.projectId?.title || "No Project"}
                    </span>
                    {task.attachments?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        {task.attachments.length}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {task.status === "todo" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-nts-cyan border-nts-cyan/30 hover:bg-nts-cyan/10"
                        onClick={() => updateTaskStatus(task._id, "in_progress")}
                      >
                        <Clock className="w-3 h-3 mr-1" /> Start
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Submit
                      </Button>
                    )}
                    {task.status === "revision_requested" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                        onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" /> Re-submit
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {task.revisionNotes && (
                  <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Revision: {task.revisionNotes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={showTaskDetail} onOpenChange={(open) => {
        setShowTaskDetail(open);
        if (!open) setNewAttachments([]);
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>{selectedTask?.projectId?.title}</DialogDescription>
          </DialogHeader>

          {selectedTask && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Task Details */}
              <div className="space-y-4">

                {/* Status + Priority */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  {getStatusBadge(selectedTask.status)}
                </div>

                {/* Revision Notes — highlight if pending revision */}
                {selectedTask.status === "revision_requested" && selectedTask.revisionNotes && (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Manager's Revision Notes
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">{selectedTask.revisionNotes}</p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h4 className="font-medium mb-1 text-foreground text-sm">Description</h4>
                  <p className="text-sm text-foreground">{selectedTask.description}</p>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-accent/40 rounded-lg">
                    <span className="text-muted-foreground text-xs">Assigned By</span>
                    <p className="font-medium text-foreground">{selectedTask.assignedBy?.name}</p>
                  </div>
                  <div className="p-3 bg-accent/40 rounded-lg">
                    <span className="text-muted-foreground text-xs">Due Date</span>
                    <p className="font-medium text-foreground">
                      {selectedTask.dueDate
                        ? new Date(selectedTask.dueDate).toLocaleDateString()
                        : "No deadline"}
                    </p>
                  </div>
                </div>

                {/* Existing Attachments */}
                {selectedTask.attachments?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-foreground text-sm">
                      Attachments ({selectedTask.attachments.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTask.attachments.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-sm text-foreground hover:bg-nts-cyan/10 hover:text-nts-cyan transition-colors"
                        >
                          {isImage(url) ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                          {getFileName(url)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Upload Section */}
                {(selectedTask.status === "in_progress" || selectedTask.status === "revision_requested" || selectedTask.status === "todo") && (
                  <div>
                    <h4 className="font-medium mb-2 text-foreground text-sm">
                      Add Files / Images
                    </h4>

                    {/* Upload Button */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-border/60 rounded-lg p-4 text-center cursor-pointer hover:border-nts-cyan hover:bg-nts-cyan/5 transition-colors"
                    >
                      {uploadingFiles ? (
                        <div className="flex flex-col items-center gap-1">
                          <Loader2 className="w-5 h-5 animate-spin text-nts-cyan" />
                          <p className="text-xs text-muted-foreground">{uploadProgress}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Click to upload files or images</p>
                          <p className="text-[10px] text-muted-foreground">PNG, JPG, PDF, DOC supported</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    {/* Newly uploaded files preview */}
                    {newAttachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground">Ready to save:</p>
                        {newAttachments.map((url, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-nts-cyan/10 rounded-lg">
                            <div className="flex items-center gap-1.5 text-xs text-nts-cyan truncate">
                              {isImage(url) ? <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" /> : <FileText className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="truncate">{getFileName(url)}</span>
                            </div>
                            <button
                              onClick={() => removeNewAttachment(url)}
                              className="ml-2 text-muted-foreground hover:text-red-500 flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {(selectedTask.status === "in_progress" || selectedTask.status === "revision_requested" || selectedTask.status === "todo") && (
                  <div>
                    <h4 className="font-medium mb-2 text-foreground text-sm">Your Notes</h4>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes or comments about this task..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-nts-cyan resize-none"
                    />
                    <div className="flex justify-end mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={saveNotesAndAttachments}
                        disabled={savingNotes}
                        className="text-xs"
                      >
                        {savingNotes ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                        Save Notes & Files
                      </Button>
                    </div>
                  </div>
                )}

                {/* Readonly notes for completed tasks */}
                {selectedTask.status === "completed" && selectedTask.notes && (
                  <div>
                    <h4 className="font-medium mb-1 text-foreground text-sm">Your Notes</h4>
                    <p className="text-sm text-foreground">{selectedTask.notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  {selectedTask.status === "todo" && (
                    <Button
                      variant="primary"
                      disabled={updatingStatus}
                      onClick={() => updateTaskStatus(selectedTask._id, "in_progress")}
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                      Start Working
                    </Button>
                  )}

                  {selectedTask.status === "in_progress" && (
                    <Button
                      variant="primary"
                      disabled={updatingStatus || uploadingFiles}
                      onClick={() => updateTaskStatus(selectedTask._id, "completed")}
                    >
                      {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Submit for Review
                    </Button>
                  )}

                  {/* RE-SUBMIT after revision */}
                  {selectedTask.status === "revision_requested" && (
                    <>
                      <Button
                        variant="outline"
                        className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                        disabled={updatingStatus}
                        onClick={() => updateTaskStatus(selectedTask._id, "in_progress")}
                      >
                        {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Start Revision
                      </Button>
                      <Button
                        variant="primary"
                        disabled={updatingStatus || uploadingFiles}
                        onClick={() => updateTaskStatus(selectedTask._id, "completed")}
                      >
                        {updatingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Re-submit
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Right: Chat */}
              <TaskChat taskId={selectedTask._id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}