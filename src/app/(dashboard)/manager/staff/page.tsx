"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Users,
  Mail,
  Phone,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ConfirmModal, AlertModal } from "@/components/ui/confirm-modal";

export default function ManagerStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Popup states
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string }>({ open: false, id: "" });
  const [alertModal, setAlertModal] = useState<{ open: boolean; title: string; description: string; variant: "success" | "error" | "info" }>({
    open: false, title: "", description: "", variant: "info"
  });

  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    staffRole: "",
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (data.success) {
        setStaff(data.data);
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });

      const data = await res.json();
      if (data.success) {
        // ✅ Email API route (server side) pe send ho chuki hai — yahan kuch nahi karna
        setShowCreateDialog(false);
        setNewStaff({ name: "", email: "", phone: "", department: "", staffRole: "" });
        fetchStaff();
        setAlertModal({
          open: true,
          title: "Staff Member Created!",
          description: `Login credentials have been sent to ${newStaff.email}`,
          variant: "success",
        });
      } else {
        setAlertModal({
          open: true,
          title: "Error",
          description: data.error || "Failed to create staff member",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Error creating staff:", error);
    }
  };

  const updateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedStaff._id,
          name: selectedStaff.name,
          email: selectedStaff.email,
          phone: selectedStaff.phone,
          department: selectedStaff.department,
          staffRole: selectedStaff.staffRole || "",
          isActive: selectedStaff.isActive,
        }),
      });

      if (res.ok) {
        setShowEditDialog(false);
        fetchStaff();
      }
    } catch (error) {
      console.error("Error updating staff:", error);
    }
  };

  const deleteStaff = async (id: string) => {

    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchStaff();
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  };

  const toggleStatus = async (member: any) => {
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          department: member.department,
          staffRole: member.staffRole || "",
          isActive: !member.isActive,
        }),
      });

      if (res.ok) fetchStaff();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">My Team</h1>
          <p className="text-muted-foreground mt-1">Manage your staff members</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-nts-cyan/10">
              <Users className="w-6 h-6 text-nts-cyan" />
            </div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">{staff.length}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">
                {staff.filter((s) => s.isActive).length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <XCircle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-xl sm:text-xl font-bold text-foreground tracking-tight">
                {staff.filter((s) => !s.isActive).length}
              </p>
              <p className="text-sm text-muted-foreground">Inactive</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search staff members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Staff Member</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Role / Position</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan mx-auto" />
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr
                      key={member._id}
                      className="border-b border-gray-100 dark:border-border/40 hover:bg-accent/60 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white font-bold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {member.email}
                          </p>
                          {member.phone && (
                            <p className="text-sm text-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {member.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {member.department || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {member.staffRole ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-nts-cyan/10 text-nts-cyan font-medium">{member.staffRole}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleStatus(member)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            member.isActive
                              ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                              : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                          }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => { setSelectedStaff(member); setShowEditDialog(true); }}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDelete({ open: true, id: member._id })}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Create Staff Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>An email with login credentials will be sent automatically</DialogDescription>
          </DialogHeader>
          <form onSubmit={createStaff} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder="jane@example.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={newStaff.phone}
                onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <Input
                value={newStaff.department}
                onChange={(e) => setNewStaff({ ...newStaff, department: e.target.value })}
                placeholder="Design"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role / Position <span className="text-red-500">*</span></label>
              <Input
                value={(newStaff as any).staffRole || ""}
                onChange={(e) => setNewStaff({ ...newStaff, staffRole: e.target.value } as any)}
                placeholder="e.g. UI Designer, Backend Dev, QA Engineer"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">This will be shown in the sidebar under their name</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Create & Send Email</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <form onSubmit={updateStaff} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <Input
                  value={selectedStaff.name}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={selectedStaff.email}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={selectedStaff.phone || ""}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Department</label>
                <Input
                  value={selectedStaff.department || ""}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, department: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Role / Position</label>
                <Input
                  value={(selectedStaff as any).staffRole || ""}
                  onChange={(e) => setSelectedStaff({ ...selectedStaff, staffRole: e.target.value } as any)}
                  placeholder="e.g. UI Designer, Backend Dev"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Update</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete({ ...confirmDelete, open })}
        title="Delete Staff Member"
        description="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmLabel="Yes, Delete"
        variant="danger"
        onConfirm={() => deleteStaff(confirmDelete.id)}
      />

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal({ ...alertModal, open })}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
      />
    </div>
  );
}