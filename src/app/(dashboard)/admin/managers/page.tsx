"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmModal, AlertModal } from "@/components/ui/confirm-modal";
import {
  Plus,
  Users,
  Mail,
  Phone,
  Building2,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  XCircle,
  Briefcase,
  RefreshCw,
} from "lucide-react";

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [reassignTargetId, setReassignTargetId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isReassigning, setIsReassigning] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: "", name: "" });
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; description: string; variant: "success" | "error" | "info" }>({
    open: false, title: "", description: "", variant: "info"
  });

  const [newManager, setNewManager] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    managerRole: "",
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/managers");
      const data = await res.json();
      if (data.success) setManagers(data.data);
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newManager),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateDialog(false);
        setNewManager({ name: "", email: "", phone: "", department: "", managerRole: "" });
        fetchManagers();
        setAlertModal({ open: true, title: "Manager Created!", description: `Login credentials have been sent to ${newManager.email}`, variant: "success" });
      } else {
        setAlertModal({ open: true, title: "Error", description: data.error || "Failed to create manager", variant: "error" });
      }
    } catch (error) {
      console.error("Error creating manager:", error);
    }
  };

  const updateManager = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/managers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedManager._id,
          name: selectedManager.name,
          email: selectedManager.email,
          phone: selectedManager.phone,
          department: selectedManager.department,
          managerRole: selectedManager.managerRole,
          isActive: selectedManager.isActive,
        }),
      });
      if (res.ok) { setShowEditDialog(false); fetchManagers(); }
    } catch (error) {
      console.error("Error updating manager:", error);
    }
  };

  const deleteManager = async (id: string) => {
    try {
      const res = await fetch(`/api/managers?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchManagers();
        setAlertModal({ open: true, title: "Manager Deleted", description: "Manager and their orphaned staff have been updated.", variant: "info" });
      }
    } catch (error) {
      console.error("Error deleting manager:", error);
    }
  };

  // Opens reassign dialog BEFORE deleting
  const handleDeleteWithReassign = (manager: any) => {
    setSelectedManager(manager);
    setReassignTargetId("");
    setShowReassignDialog(true);
  };

  const handleReassignAndDelete = async () => {
    if (!selectedManager) return;
    setIsReassigning(true);
    try {
      // Reassign first if a target was selected
      if (reassignTargetId) {
        const rRes = await fetch("/api/managers/reassign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromManagerId: selectedManager._id, toManagerId: reassignTargetId }),
        });
        const rData = await rRes.json();
        if (!rData.success) {
          setAlertModal({ open: true, title: "Reassign Failed", description: rData.error, variant: "error" });
          setIsReassigning(false);
          return;
        }
      }
      // Then delete manager
      await deleteManager(selectedManager._id);
      setShowReassignDialog(false);
      setAlertModal({
        open: true,
        title: "Done!",
        description: reassignTargetId ? "Staff, projects, and tasks reassigned. Manager deleted." : "Manager deleted. Orphaned staff deactivated.",
        variant: "success",
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const toggleStatus = async (manager: any) => {
    try {
      const res = await fetch("/api/managers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: manager._id, name: manager.name, email: manager.email, phone: manager.phone, department: manager.department, managerRole: manager.managerRole, isActive: !manager.isActive }),
      });
      if (res.ok) fetchManagers();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const filteredManagers = managers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.managerRole?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Team Managers</h1>
          <p className="text-muted-foreground mt-1">Manage all team managers</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manager
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-nts-cyan/10"><Users className="w-6 h-6 text-nts-cyan" /></div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">{managers.length}</p>
              <p className="text-sm text-muted-foreground">Total Managers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10"><CheckCircle2 className="w-6 h-6 text-green-500" /></div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">{managers.filter((m) => m.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10"><XCircle className="w-6 h-6 text-red-500" /></div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">{managers.filter((m) => !m.isActive).length}</p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search managers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      {/* Managers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Manager</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Role/Position</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan mx-auto" /></td></tr>
                ) : filteredManagers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No managers found</td></tr>
                ) : (
                  filteredManagers.map((manager) => (
                    <tr key={manager._id} className="border-b border-gray-100 dark:border-border/40 hover:bg-accent/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white font-bold overflow-hidden">
                            {manager.avatar ? <img src={manager.avatar} alt={manager.name} className="w-full h-full object-cover" /> : manager.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{manager.name}</p>
                            <p className="text-xs text-muted-foreground">{manager.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> {manager.email}</p>
                          {manager.phone && <p className="text-sm text-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> {manager.phone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{manager.department || "N/A"}</td>
                      <td className="px-6 py-4">
                        {manager.managerRole ? (
                          <Badge variant="outline" className="text-xs capitalize flex items-center gap-1 w-fit"><Briefcase className="w-3 h-3" />{manager.managerRole}</Badge>
                        ) : <span className="text-sm text-muted-foreground">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleStatus(manager)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${manager.isActive ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"}`}>
                          {manager.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{new Date(manager.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedManager(manager); setShowEditDialog(true); }}><Edit3 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteWithReassign(manager)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
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

      {/* Create Manager Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Manager</DialogTitle>
            <DialogDescription>An email with login credentials will be sent automatically</DialogDescription>
          </DialogHeader>
          <form onSubmit={createManager} className="space-y-4">
            <div><label className="text-sm font-medium">Full Name</label><Input value={newManager.name} onChange={(e) => setNewManager({ ...newManager, name: e.target.value })} placeholder="John Doe" required /></div>
            <div><label className="text-sm font-medium">Email</label><Input type="email" value={newManager.email} onChange={(e) => setNewManager({ ...newManager, email: e.target.value })} placeholder="john@example.com" required /></div>
            <div><label className="text-sm font-medium">Phone</label><Input value={newManager.phone} onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })} placeholder="+1 234 567 890" /></div>
            <div><label className="text-sm font-medium">Department</label><Input value={newManager.department} onChange={(e) => setNewManager({ ...newManager, department: e.target.value })} placeholder="Engineering" /></div>
            <div>
              <label className="text-sm font-medium">Role / Position <span className="text-red-500">*</span></label>
              <Input value={newManager.managerRole} onChange={(e) => setNewManager({ ...newManager, managerRole: e.target.value })} placeholder="e.g. Project Manager, Team Lead, Operations Head" required />
              <p className="text-xs text-muted-foreground mt-1">This will be displayed on their profile card</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create & Send Email</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Manager Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader><DialogTitle>Edit Manager</DialogTitle></DialogHeader>
          {selectedManager && (
            <form onSubmit={updateManager} className="space-y-4">
              <div><label className="text-sm font-medium">Full Name</label><Input value={selectedManager.name} onChange={(e) => setSelectedManager({ ...selectedManager, name: e.target.value })} required /></div>
              <div><label className="text-sm font-medium">Email</label><Input type="email" value={selectedManager.email} onChange={(e) => setSelectedManager({ ...selectedManager, email: e.target.value })} required /></div>
              <div><label className="text-sm font-medium">Phone</label><Input value={selectedManager.phone || ""} onChange={(e) => setSelectedManager({ ...selectedManager, phone: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Department</label><Input value={selectedManager.department || ""} onChange={(e) => setSelectedManager({ ...selectedManager, department: e.target.value })} /></div>
              <div><label className="text-sm font-medium">Role / Position</label><Input value={selectedManager.managerRole || ""} onChange={(e) => setSelectedManager({ ...selectedManager, managerRole: e.target.value })} placeholder="e.g. Project Manager, Team Lead" /></div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Update</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reassign Before Delete Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500"><Trash2 className="w-5 h-5" /> Delete Manager</DialogTitle>
            <DialogDescription>
              You are about to delete <strong>{selectedManager?.name}</strong>. Their staff, projects, and tasks can be reassigned to another manager first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">Reassign resources to (optional)</label>
              <Select value={reassignTargetId} onValueChange={setReassignTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="— Delete without reassigning —" />
                </SelectTrigger>
                <SelectContent>
                  {managers
                    .filter((m) => m._id !== selectedManager?._id && m.isActive)
                    .map((m) => (
                      <SelectItem key={m._id} value={m._id}>
                        {m.name} {m.managerRole ? `(${m.managerRole})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {reassignTargetId
                  ? "Staff, projects, and tasks will be moved to the selected manager."
                  : "Without reassignment, staff members will be deactivated and unassigned."}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowReassignDialog(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleReassignAndDelete}
                disabled={isReassigning}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {isReassigning ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" /> {reassignTargetId ? "Reassign & Delete" : "Delete"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Modal */}
      <AlertModal open={alertModal.open} onOpenChange={(open) => setAlertModal({ ...alertModal, open })} title={alertModal.title} description={alertModal.description} variant={alertModal.variant} />
    </div>
  );
}
