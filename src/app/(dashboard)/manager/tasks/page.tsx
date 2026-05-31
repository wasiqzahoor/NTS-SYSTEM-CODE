"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  CheckCircle2,
  RotateCcw,
  Eye,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import TaskChat from "@/components/chat/TaskChat";

export default function ManagerTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
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
        if (selectedTask?._id === taskId) {
          setSelectedTask(null);
          setShowTaskDetail(false);
        }
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      todo: { class: "bg-gray-500/10 text-muted-foreground", label: "To Do" },
      in_progress: { class: "bg-nts-cyan/10 text-nts-cyan", label: "In Progress" },
      completed: { class: "bg-green-500/10 text-green-500", label: "Completed" },
      revision_requested: { class: "bg-orange-500/10 text-orange-500", label: "Revision Needed" },
    };
    const config = variants[status] || variants.todo;
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Task Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve completed tasks</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No tasks yet</h3>
            <p className="text-muted-foreground">Create tasks to see them here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {getStatusBadge(task.status)}
                      {task.status === "completed" && !task.approvedAt && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                          Pending Approval
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground">{task.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>Assigned to: {task.assignedTo?.name}</span>
                      <span>Project: {task.projectId?.title}</span>
                      {task.completedAt && (
                        <span>Completed: {new Date(task.completedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setSelectedTask(task); setShowTaskDetail(true); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {task.status === "completed" && !task.approvedAt && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                          onClick={() => updateTaskStatus(task._id, "revision_requested", "Needs improvement")}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Revision
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateTaskStatus(task._id, "completed")}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showTaskDetail} onOpenChange={setShowTaskDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                  {getStatusBadge(selectedTask.status)}
                </div>
                <p className="text-sm text-foreground">{selectedTask.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-accent/40 rounded-lg">
                    <span className="text-muted-foreground">Assigned To:</span>
                    <p className="font-medium text-foreground">{selectedTask.assignedTo?.name}</p>
                  </div>
                  <div className="p-3 bg-accent/40 rounded-lg">
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium text-foreground">{selectedTask.status}</p>
                  </div>
                </div>
                {selectedTask.status === "completed" && !selectedTask.approvedAt && (
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10"
                      onClick={() => updateTaskStatus(selectedTask._id, "revision_requested", "Needs improvement")}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Request Revision
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => updateTaskStatus(selectedTask._id, "completed")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Task
                    </Button>
                  </div>
                )}
              </div>
              <TaskChat taskId={selectedTask._id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
