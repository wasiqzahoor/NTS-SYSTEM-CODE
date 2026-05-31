"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Plus,
  Calendar,
  Users,
  FolderKanban,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  History,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  CheckCheck,
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import GanttChart from "@/components/gantt/GanttChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ViewMode = "grid" | "gantt";
type ActiveTab = "active" | "history";

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [historyProjects, setHistoryProjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTab, setActiveTab] = useState<ActiveTab>("active");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
  const [confirmComplete, setConfirmComplete] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
  const [confirmRestore, setConfirmRestore] = useState<{ open: boolean; id: string; title: string }>({ open: false, id: "", title: "" });
  const [managers, setManagers] = useState<any[]>([]);
  const [showReassignProjectDialog, setShowReassignProjectDialog] = useState(false);
  const [projectToReassign, setProjectToReassign] = useState<any>(null);
  const [reassignProjectManagerId, setReassignProjectManagerId] = useState("");
  const [isReassigningProject, setIsReassigningProject] = useState(false);

  const isManagerOrAdmin = session?.user.role === "manager" || session?.user.role === "super_admin";

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    staffIds: [] as string[],
  });

  useEffect(() => {
    fetchProjects();
    if (session?.user.role === "manager") fetchStaff();
    if (session?.user.role === "super_admin") {
      fetchStaff();
      fetchManagers();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/projects?archived=true"),
      ]);
      const activeData = activeRes.ok ? await activeRes.json() : { data: [] };
      const historyData = historyRes.ok ? await historyRes.json() : { data: [] };
      if (activeData.success) setActiveProjects(activeData.data);
      if (historyData.success) setHistoryProjects(historyData.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    if (data.success) setStaff(data.data);
  };

  const fetchManagers = async () => {
    const res = await fetch("/api/managers");
    const data = await res.json();
    if (data.success) setManagers(data.data);
  };

  const completeProject = async (id: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "complete" }),
      });
      if (res.ok) fetchProjects();
    } catch (error) {
      console.error("Error completing project:", error);
    }
  };

  const restoreProject = async (id: string) => {
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "restore" }),
      });
      if (res.ok) {
        fetchProjects();
        setActiveTab("active");
      }
    } catch (error) {
      console.error("Error restoring project:", error);
    }
  };

  const toggleProjectStatus = async (project: any) => {
    const newStatus = project.status === "active" ? "inactive" : "active";
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project._id, action: "toggleStatus", newStatus }),
      });
      if (res.ok) fetchProjects();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const reassignProject = async () => {
    if (!projectToReassign || !reassignProjectManagerId) return;
    setIsReassigningProject(true);
    try {
      const res = await fetch("/api/projects/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: projectToReassign._id, newManagerId: reassignProjectManagerId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowReassignProjectDialog(false);
        setProjectToReassign(null);
        setReassignProjectManagerId("");
        fetchProjects();
      } else {
        alert(data.error || "Reassign failed");
      }
    } catch (error) {
      console.error("Error reassigning project:", error);
    } finally {
      setIsReassigningProject(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setNewProject({ title: "", description: "", startDate: "", endDate: "", staffIds: [] });
        fetchProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const updateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedProject._id, ...selectedProject }),
      });
      if (res.ok) {
        setShowEditDialog(false);
        fetchProjects();
      }
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: string; label: string }> = {
      active: { variant: "info", label: "Active" },
      completed: { variant: "success", label: "Completed" },
      on_hold: { variant: "warning", label: "On Hold" },
      inactive: { variant: "default", label: "Inactive" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const toggleStaffSelection = (staffId: string, isEdit = false) => {
    if (isEdit) {
      const currentIds = selectedProject?.staffIds?.map((s: any) => typeof s === "string" ? s : s._id) || [];
      const newIds = currentIds.includes(staffId)
        ? currentIds.filter((id: string) => id !== staffId)
        : [...currentIds, staffId];
      setSelectedProject({ ...selectedProject, staffIds: newIds });
    } else {
      const newIds = newProject.staffIds.includes(staffId)
        ? newProject.staffIds.filter((id) => id !== staffId)
        : [...newProject.staffIds, staffId];
      setNewProject({ ...newProject, staffIds: newIds });
    }
  };

  const projects = activeTab === "active" ? activeProjects : historyProjects;
  const isGantt = viewMode === "gantt";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {isGantt ? "View project timelines" : "Manage all your projects"}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            variant={isGantt ? "outline" : "primary"}
            onClick={() => setViewMode("grid")}
          >
            Grid View
          </Button>
          <Button
            variant={isGantt ? "primary" : "outline"}
            onClick={() => setViewMode("gantt")}
          >
            Gantt View
          </Button>
          {isManagerOrAdmin && (
            <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Project
            </Button>
          )}
        </div>
      </div>

      {/* Gantt View */}
      {isGantt && (
        <GanttChart projects={activeProjects} />
      )}

      {/* Grid View */}
      {!isGantt && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 bg-accent rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "active"
                  ? "bg-white dark:bg-nts-dark-card text-nts-cyan shadow-sm"
                  : "text-muted-foreground hover:text-gray-700"
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              Active Projects
              {activeProjects.length > 0 && (
                <span className="bg-nts-cyan/20 text-nts-cyan text-xs rounded-full px-2 py-0.5">
                  {activeProjects.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "history"
                  ? "bg-white dark:bg-nts-dark-card text-emerald-500 shadow-sm"
                  : "text-muted-foreground hover:text-gray-700"
              }`}
            >
              <History className="w-4 h-4" />
              History
              {historyProjects.length > 0 && (
                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 text-xs rounded-full px-2 py-0.5">
                  {historyProjects.length}
                </span>
              )}
            </button>
          </div>

          {/* Projects Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                {activeTab === "history" ? (
                  <>
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No completed projects yet</h3>
                    <p className="text-muted-foreground">Completed projects will appear here</p>
                  </>
                ) : (
                  <>
                    <FolderKanban className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
                    <p className="text-muted-foreground mb-4">
                      {session?.user.role === "manager" ? "Create your first project to get started" : "No projects assigned yet"}
                    </p>
                    {session?.user.role === "manager" && (
                      <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Create Project
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card
                  key={project._id}
                  className={`hover:shadow-lg transition-shadow ${activeTab === "history" ? "border-emerald-200 dark:border-emerald-900/40" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">{project.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {getStatusBadge(project.status)}
                        {activeTab === "history" && (
                          <Badge variant="success" className="text-xs">
                            <CheckCheck className="w-3 h-3 mr-1" /> Finished
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(project.startDate).toLocaleDateString()} -{" "}
                          {new Date(project.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      {activeTab === "history" && project.completedAt && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            Completed: {new Date(project.completedAt).toLocaleDateString()}
                            {project.completedBy?.name && ` by ${project.completedBy.name}`}
                          </span>
                        </div>
                      )}
                      {activeTab === "history" ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{project.archivedStaffIds?.length || 0} team members</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{project.staffIds?.length || 0} team members</span>
                        </div>
                      )}

                      {/* Staff avatars */}
                      <div className="flex items-center gap-2">
                        {(activeTab === "history" ? [] : project.staffIds)?.slice(0, 3).map((s: any, i: number) => (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold"
                            title={typeof s === "string" ? s : s.name}
                          >
                            {typeof s === "string" ? "?" : s.name?.charAt(0)}
                          </div>
                        ))}
                        {activeTab !== "history" && project.staffIds?.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-muted-foreground">
                            +{project.staffIds.length - 3}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {activeTab === "history" ? (
                          <>
                            <Link href={`/projects/${project._id}`} className="flex-1">
                              <Button variant="outline" className="w-full gap-2">
                                <Eye className="w-4 h-4" /> View
                              </Button>
                            </Link>
                            {isManagerOrAdmin && (
                              <Button
                                variant="outline"
                                className="gap-2 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => setConfirmRestore({ open: true, id: project._id, title: project.title })}
                              >
                                <RotateCcw className="w-4 h-4" /> Restore
                              </Button>
                            )}
                            {isManagerOrAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDelete({ open: true, id: project._id, title: project.title })}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Link href={`/projects/${project._id}`} className="flex-1">
                              <Button variant="primary" className="w-full gap-2">
                                <Eye className="w-4 h-4" /> Details
                              </Button>
                            </Link>
                            <Link href={`/tasks?projectId=${project._id}`} className="flex-1">
                              <Button variant="outline" className="w-full gap-2">
                                <ClipboardList className="w-4 h-4" /> Tasks
                              </Button>
                            </Link>
                            {isManagerOrAdmin && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title={project.status === "active" ? "Set Inactive" : "Set Active"}
                                  onClick={() => toggleProjectStatus(project)}
                                  className={project.status === "active" ? "text-green-500" : "text-muted-foreground"}
                                >
                                  {project.status === "active"
                                    ? <ToggleRight className="w-5 h-5" />
                                    : <ToggleLeft className="w-5 h-5" />
                                  }
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Mark as Complete"
                                  onClick={() => setConfirmComplete({ open: true, id: project._id, title: project.title })}
                                  className="text-emerald-500 hover:text-emerald-600"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                {session?.user.role === "manager" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setSelectedProject(project); setShowEditDialog(true); }}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                )}
                                {session?.user.role === "super_admin" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Reassign project manager"
                                    onClick={() => {
                                      setProjectToReassign(project);
                                      setReassignProjectManagerId("");
                                      setShowReassignProjectDialog(true);
                                    }}
                                  >
                                    <RefreshCw className="w-4 h-4 text-blue-500" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setConfirmDelete({ open: true, id: project._id, title: project.title })}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Set up a new project for your team</DialogDescription>
          </DialogHeader>
          <form onSubmit={createProject} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="Project title"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Project description"
                className="w-full min-h-[100px] rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Assign Team Members</label>
              <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto">
                {staff.map((s) => (
                  <label key={s._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProject.staffIds.includes(s._id)}
                      onChange={() => toggleStaffSelection(s._id)}
                      className="rounded border-gray-300"
                    />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                      {s.name.charAt(0)}
                    </div>
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create Project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] max-w-lg">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          {selectedProject && (
            <form onSubmit={updateProject} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={selectedProject.title}
                  onChange={(e) => setSelectedProject({ ...selectedProject, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                  className="w-full min-h-[100px] rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={selectedProject.startDate?.split("T")[0]}
                    onChange={(e) => setSelectedProject({ ...selectedProject, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={selectedProject.endDate?.split("T")[0]}
                    onChange={(e) => setSelectedProject({ ...selectedProject, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={selectedProject.status}
                  onChange={(e) => setSelectedProject({ ...selectedProject, status: e.target.value })}
                  className="w-full h-10 rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Team Members</label>
                <div className="mt-2 space-y-2 max-h-[150px] overflow-y-auto">
                  {staff.map((s) => (
                    <label key={s._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-accent cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(selectedProject.staffIds || []).some((id: any) =>
                          (typeof id === "string" ? id : id._id) === s._id
                        )}
                        onChange={() => toggleStaffSelection(s._id, true)}
                        className="rounded border-gray-300"
                      />
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                        {s.name.charAt(0)}
                      </div>
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Update Project</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Complete */}
      <ConfirmModal
        open={confirmComplete.open}
        onOpenChange={(open) => setConfirmComplete({ ...confirmComplete, open })}
        title="Complete Project"
        description={`Are you sure you want to mark "${confirmComplete.title}" as complete? It will be moved to History and staff will be notified.`}
        confirmLabel="Yes, Complete"
        variant="success"
        onConfirm={() => completeProject(confirmComplete.id)}
      />

      {/* Confirm Restore */}
      <ConfirmModal
        open={confirmRestore.open}
        onOpenChange={(open) => setConfirmRestore({ ...confirmRestore, open })}
        title="Restore Project"
        description={`Restore "${confirmRestore.title}" from history back to active? Staff members will be re-added to the project.`}
        confirmLabel="Yes, Restore"
        variant="info"
        onConfirm={() => restoreProject(confirmRestore.id)}
      />

      <ConfirmModal
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ ...confirmDelete, open })}
        title="Delete Project"
        description={`Delete project "${confirmDelete.title}"? All associated tasks will also be deleted.`}
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={() => deleteProject(confirmDelete.id)}
      />

      {/* Reassign Project Manager Dialog */}
      <Dialog open={showReassignProjectDialog} onOpenChange={setShowReassignProjectDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Project Manager</DialogTitle>
            <DialogDescription>
              Assign <span className="font-semibold">&quot;{projectToReassign?.title}&quot;</span> to a different manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Current Manager</label>
              <p className="text-sm text-muted-foreground">{projectToReassign?.managerId?.name || "Unknown"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">New Manager</label>
              <Select value={reassignProjectManagerId} onValueChange={setReassignProjectManagerId}>
                <SelectTrigger><SelectValue placeholder="Select a manager" /></SelectTrigger>
                <SelectContent>
                  {managers.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.name} — {m.managerRole || m.department || "Manager"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowReassignProjectDialog(false)}>Cancel</Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={reassignProject}
              disabled={isReassigningProject || !reassignProjectManagerId}
            >
              {isReassigningProject
                ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                : <RefreshCw className="w-4 h-4 mr-2" />
              }
              Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}