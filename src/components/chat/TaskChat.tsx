"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare, Image as ImageIcon, Video, Trash2, X } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | null;
  createdAt: string;
}

export default function TaskChat({ taskId, isReadOnly = false }: { taskId: string; isReadOnly?: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();

  useEffect(() => { setIsMounted(true); }, []);
  useEffect(() => { fetchMessages(); }, [taskId]);

  useEffect(() => {
    if (!socket || !session?.user?.id) return;
    socket.emit("join-room", session.user.id);

    // Listen for real-time messages
    socket.on(`task-chat-${taskId}`, (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    // Listen for real-time deletions
    socket.on(`message-deleted-${taskId}`, ({ messageId, deleteFor }: { messageId: string; deleteFor: string }) => {
      if (deleteFor === "everyone") {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    });

    // Fallback: refresh on new-message notification
    socket.on("new-message", (data: { taskId: string }) => {
      if (data.taskId === taskId) fetchMessages();
    });

    return () => {
      socket.off(`task-chat-${taskId}`);
      socket.off(`message-deleted-${taskId}`);
      socket.off("new-message");
    };
  }, [socket, session?.user?.id, taskId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat?taskId=${taskId}`);
      const data = await res.json();
      if (data.success) setMessages(data.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !previewMedia) || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          message: newMessage,
          mediaUrl: previewMedia?.url || null,
          mediaType: previewMedia?.type || null,
        }),
      });
      if (res.ok) {
        setNewMessage("");
        setPreviewMedia(null);
        fetchMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("Only images and videos are supported");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be under 50MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setPreviewMedia({ url: data.url, type: isImage ? "image" : "video" });
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteMessage = async (messageId: string, deleteFor: "everyone" | "me") => {
    try {
      const res = await fetch(`/api/chat?messageId=${messageId}&deleteFor=${deleteFor}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (deleteFor === "me") {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== messageId));
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const isCurrentUser = (senderId: string) => session?.user?.id === senderId;
  const canDeleteForEveryone = (senderId: string) =>
    session?.user?.id === senderId || ["super_admin", "manager"].includes(session?.user?.role || "");

  return (
    <div className="h-full flex flex-col bg-white dark:bg-nts-dark-card">
      {/* Header */}
      <div className="border-b border-border/60 py-3 px-4 flex-shrink-0">
        <div className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <MessageSquare className="w-4 h-4 text-nts-cyan" />
          Task Discussion
          {isReadOnly && (
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 font-medium border border-yellow-500/20">
              Archived — Read Only
            </span>
          )}
          {isMounted && (
            <span
              className={cn("ml-auto w-2 h-2 rounded-full", isReadOnly ? "bg-gray-400" : isConnected ? "bg-green-500" : "bg-gray-400")}
              title={isReadOnly ? "Chat archived" : isConnected ? "Connected" : "Disconnected"}
            />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nts-cyan" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <span className="text-sm">No messages yet. Start the conversation!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = isCurrentUser(msg.senderId);
            return (
              <div key={msg._id} className={cn("flex gap-2 items-end group", isMine ? "flex-row-reverse" : "flex-row")}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {msg.senderName.charAt(0).toUpperCase()}
                </div>
                <div className={cn(
                  "max-w-[70%] rounded-2xl px-4 py-2.5",
                  isMine
                    ? "bg-nts-cyan/10 text-nts-cyan dark:bg-nts-cyan/20 rounded-br-none"
                    : "bg-accent text-foreground rounded-bl-none"
                )}>
                  <div className={cn("flex items-center gap-2 mb-1.5", isMine && "flex-row-reverse")}>
                    <span className="text-xs font-semibold">{msg.senderName}</span>
                    {msg.senderRole && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 capitalize">
                        {msg.senderRole.replace("_", " ")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                  </div>

                  {/* Media */}
                  {msg.mediaUrl && msg.mediaType === "image" && (
                    <img
                      src={msg.mediaUrl}
                      alt="Shared image"
                      className="rounded-lg max-w-full max-h-48 object-cover mb-1 cursor-pointer"
                      onClick={() => window.open(msg.mediaUrl, "_blank")}
                    />
                  )}
                  {msg.mediaUrl && msg.mediaType === "video" && (
                    <video
                      src={msg.mediaUrl}
                      controls
                      className="rounded-lg max-w-full max-h-48 mb-1"
                    />
                  )}

                  {msg.message && (
                    <p className="text-sm break-words leading-relaxed">{msg.message}</p>
                  )}
                </div>

                {/* Delete button - shown on hover */}
                <div className={cn(
                  "opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1",
                  isMine ? "mr-1" : "ml-1"
                )}>
                  {canDeleteForEveryone(msg.senderId) && (
                    <button
                      onClick={() => deleteMessage(msg._id, "everyone")}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      title="Delete for everyone"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Media preview */}
      {previewMedia && (
        <div className="px-3 pt-2 flex-shrink-0">
          <div className="relative inline-block">
            {previewMedia.type === "image" ? (
              <img src={previewMedia.url} alt="Preview" className="h-20 w-20 object-cover rounded-lg border" />
            ) : (
              <video src={previewMedia.url} className="h-20 w-20 object-cover rounded-lg border" />
            )}
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input — hidden when read-only */}
      {isReadOnly ? (
        <div className="p-3 border-t border-border/60 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
            <MessageSquare className="w-3.5 h-3.5" />
            This task is finished — chat is archived and read-only
          </div>
        </div>
      ) : (
        <form
          onSubmit={sendMessage}
          className="p-3 border-t border-border/60 flex gap-2 flex-shrink-0"
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Media upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-shrink-0 p-2 rounded-lg text-muted-foreground hover:text-nts-cyan hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Send image or video"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-nts-cyan" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
          </button>

          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="flex-shrink-0 bg-nts-cyan hover:bg-nts-cyan/80 text-white"
            disabled={isSending || (!newMessage.trim() && !previewMedia)}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}
