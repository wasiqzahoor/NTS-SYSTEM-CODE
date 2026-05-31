export type UserRole = "super_admin" | "manager" | "staff";

export type TaskStatus = "todo" | "in_progress" | "completed" | "revision_requested" | "finished";

export type TaskPriority = "low" | "medium" | "high";

export type ProjectStatus = "active" | "completed" | "on_hold" | "inactive";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  department?: string;
  managerId?: string;
  managerRole?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  managerId: string;
  staffIds: string[];
  completedAt?: Date;
  completedBy?: string;
  isArchived: boolean;
  archivedStaffIds?: string[];
  previousStatus?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  projectId: string;
  assignedTo: string;
  assignedBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  attachments: string[];
  notes: string;
  dueDate?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  revisionNotes?: string;
  finishedAt?: Date;
  finishedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// FIX BUG #11: Added missing fields that exist in ChatMessage model
export interface IChatMessage {
  _id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  deletedFor: string[];
  deletedForEveryone: boolean;
  createdAt: Date;
}

export interface INotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "task_assigned" | "task_updated" | "task_approved" | "task_revision" | "deadline_reminder" | "chat_message";
  read: boolean;
  link?: string;
  createdAt: Date;
}

export interface IActivityLog {
  _id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: "user" | "project" | "task" | "chat";
  entityId: string;
  details: string;
  ipAddress?: string;
  createdAt: Date;
}
