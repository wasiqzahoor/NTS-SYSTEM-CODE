import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(date);
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "medium":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "low":
      return "text-green-500 bg-green-500/10 border-green-500/20";
    default:
      return "text-muted-foreground bg-gray-500/10 border-gray-500/20";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "todo":
      return "text-muted-foreground bg-gray-400/10 border-gray-400/20";
    case "in_progress":
      return "text-nts-cyan bg-nts-cyan/10 border-nts-cyan/20";
    case "completed":
      return "text-green-500 bg-green-500/10 border-green-500/20";
    case "revision_requested":
      return "text-orange-500 bg-orange-500/10 border-orange-500/20";
    default:
      return "text-muted-foreground bg-gray-500/10 border-gray-500/20";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "todo":
      return "To Do";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "revision_requested":
      return "Revision Requested";
    default:
      return status;
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
