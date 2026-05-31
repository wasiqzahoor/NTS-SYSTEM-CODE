"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Search, Clock, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import TaskChat from "@/components/chat/TaskChat";

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo: { _id: string; name: string; email: string };
  assignedBy: { _id: string; name: string; email: string };
  projectId?: { _id: string; title: string };
  updatedAt: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "completed": return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    case "in_progress": return <Clock className="w-3.5 h-3.5 text-nts-cyan" />;
    default: return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  }
};

const priorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default: return "bg-green-500/10 text-green-500 border-green-500/20";
  }
};

export default function ChatPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  // Mobile: show chat panel when task selected
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
        // Auto-select first active (non-finished) task
        const firstActive = data.data.find((t: Task) => t.status !== "finished");
        if (firstActive && !selectedTask) {
          setSelectedTask(firstActive);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show active tasks (not finished) in Messages list
  // Finished task chats are still accessible from the task detail page
  const activeTasks = tasks.filter((task) => task.status !== "finished");

  const filteredTasks = activeTasks.filter((task) =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.projectId?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const getOtherUser = (task: Task) => {
    if (!session) return null;
    if (task.assignedTo?._id === session.user.id) return task.assignedBy;
    return task.assignedTo;
  };

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setShowChat(true); // on mobile, slide to chat panel
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-4 sm:-m-6 overflow-hidden rounded-xl border border-border/60">

      {/* Left Panel — Task List */}
      <div className={cn(
        "flex-shrink-0 border-r border-border/60 bg-white dark:bg-nts-dark-card flex flex-col",
        // Mobile: full width, hidden when chat open
        "w-full md:w-80",
        showChat ? "hidden md:flex" : "flex"
      )}>

        {/* Header */}
        <div className="p-4 border-b border-border/60">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-nts-cyan" />
            Messages
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Task-based conversations
          </p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-accent border border-transparent focus:border-nts-cyan focus:outline-none text-foreground placeholder-gray-400 transition-colors"
            />
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-nts-cyan" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2 px-4 text-center">
              <MessageSquare className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                {search ? "No tasks match your search" : "No tasks found"}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const otherUser = getOtherUser(task);
              const isSelected = selectedTask?._id === task._id;

              return (
                <button
                  key={task._id}
                  onClick={() => handleSelectTask(task)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b border-gray-100 dark:border-border/40 transition-colors",
                    isSelected
                      ? "bg-nts-cyan/10 dark:bg-nts-cyan/10"
                      : "hover:bg-accent/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isSelected ? "text-nts-cyan" : "text-foreground"
                    )}>
                      {task.title}
                    </span>
                    <div className="flex-shrink-0 mt-0.5">
                      {statusIcon(task.status)}
                    </div>
                  </div>

                  {task.projectId && (
                    <p className="text-xs text-muted-foreground truncate mb-1.5">
                      {task.projectId.title}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate">
                      {otherUser?.name || "—"}
                    </span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize",
                      priorityColor(task.priority)
                    )}>
                      {task.priority}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div className={cn(
        "flex-1 flex flex-col bg-gray-50 dark:bg-nts-dark-bg overflow-hidden",
        // Mobile: full width, only shown when task selected
        showChat ? "flex" : "hidden md:flex"
      )}>
        {selectedTask ? (
          <>
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-border/60 bg-white dark:bg-nts-dark-card flex items-center gap-3 flex-shrink-0">
              {/* Back button - mobile only */}
              <button
                onClick={() => setShowChat(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-accent text-muted-foreground flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {selectedTask.title.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedTask.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getOtherUser(selectedTask)?.name || "—"}
                  {selectedTask.projectId && ` · ${selectedTask.projectId.title}`}
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-medium capitalize",
                  priorityColor(selectedTask.priority)
                )}>
                  {selectedTask.priority}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <TaskChat taskId={selectedTask._id} isReadOnly={selectedTask.status === "finished"} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <MessageSquare className="w-16 h-16 opacity-20" />
            <p className="text-base font-medium">Select a task to start chatting</p>
            <p className="text-sm opacity-70">Choose a task from the left panel</p>
          </div>
        )}
      </div>
    </div>
  );
}
