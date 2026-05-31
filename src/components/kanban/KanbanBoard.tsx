"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Paperclip,
  MessageSquare,
  MoreHorizontal,
  Plus,
  GripVertical,
} from "lucide-react";
import Link from "next/link";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "completed" | "revision_requested";
  priority: "low" | "medium" | "high";
  assignedTo?: { name: string; avatar?: string };
  dueDate?: string;
  attachments?: string[];
  projectId?: { title: string };
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export default function KanbanBoard({ projectId }: { projectId?: string }) {
  const [columns, setColumns] = useState<Column[]>([
    { id: "todo", title: "To Do", tasks: [] },
    { id: "in_progress", title: "In Progress", tasks: [] },
    { id: "completed", title: "Completed", tasks: [] },
    { id: "revision_requested", title: "Revision", tasks: [] },
  ]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const url = projectId ? `/api/tasks?projectId=${projectId}` : "/api/tasks";
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        const newColumns = [
          { id: "todo", title: "To Do", tasks: data.data.filter((t: Task) => t.status === "todo") },
          { id: "in_progress", title: "In Progress", tasks: data.data.filter((t: Task) => t.status === "in_progress") },
          { id: "completed", title: "Completed", tasks: data.data.filter((t: Task) => t.status === "completed") },
          { id: "revision_requested", title: "Revision", tasks: data.data.filter((t: Task) => t.status === "revision_requested") },
        ];
        setColumns(newColumns);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId as Task["status"];

    // Optimistic update
    const newColumns = [...columns];
    const sourceColumn = newColumns.find((c) => c.id === source.droppableId);
    const destColumn = newColumns.find((c) => c.id === destination.droppableId);

    if (sourceColumn && destColumn) {
      const [movedTask] = sourceColumn.tasks.splice(source.index, 1);
      movedTask.status = newStatus;
      destColumn.tasks.splice(destination.index, 0, movedTask);
      setColumns(newColumns);
    }

    // API call to update status
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draggableId, status: newStatus }),
      });
    } catch (error) {
      console.error("Error updating task status:", error);
      fetchTasks(); // Revert on error
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan" />
      </div>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
          {columns.map((column) => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  {column.title}
                  <span className="text-xs bg-accent text-muted-foreground px-2 py-0.5 rounded-full">
                    {column.tasks.length}
                  </span>
                </h3>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[400px] rounded-xl p-2 space-y-2 transition-colors",
                      snapshot.isDraggingOver
                        ? "bg-nts-cyan/5 border-2 border-dashed border-nts-cyan/30"
                        : "bg-gray-50/50 dark:bg-accent/30"
                    )}
                  >
                    {column.tasks.map((task, index) => (
                      <Draggable key={task._id} draggableId={task._id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                            onClick={() => setSelectedTask(task)}
                            className={cn(
                              "cursor-pointer",
                              snapshot.isDragging && "rotate-2 scale-105"
                            )}
                          >
                            <Card className="hover:shadow-md transition-shadow border-0 shadow-sm">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                                    {task.priority}
                                  </Badge>
                                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>

                                <h4 className="font-medium text-foreground text-sm mb-1">
                                  {task.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                  {task.description}
                                </p>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-2">
                                    {task.assignedTo && (
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                                        {task.assignedTo.name.charAt(0)}
                                      </div>
                                    )}
                                    {task.dueDate && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(task.dueDate).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {task.attachments && task.attachments.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Paperclip className="w-3 h-3" />
                                        {task.attachments.length}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="w-[95vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTask?.title}</DialogTitle>
            <DialogDescription>
              {selectedTask?.projectId?.title || "No Project"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(getPriorityColor(selectedTask?.priority || ""))}>
                {selectedTask?.priority}
              </Badge>
              <Badge variant="outline">
                {selectedTask?.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-foreground">
              {selectedTask?.description}
            </p>
            {selectedTask?.dueDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Due: {new Date(selectedTask.dueDate).toLocaleDateString()}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Link href={`/tasks/${selectedTask?._id}`}>
                <Button variant="primary">View Full Details</Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
