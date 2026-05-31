"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Mail,
  Phone,
  Building2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  UserX,
  UserCheck,
  RefreshCw,
} from "lucide-react";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<any>(null);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [staffToToggle, setStaffToToggle] = useState<any>(null);

  // Reassign individual staff
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [staffToReassign, setStaffToReassign] = useState<any>(null);
  const [reassignManagerId, setReassignManagerId] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchManagers();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/staff");
      const data = await res.json();
      if (data.success) setStaff(data.data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/managers");
      const data = await res.json();
      if (data.success) setManagers(data.data);
    } catch (error) {
      console.error("Error fetching managers:", error);
    }
  };

  const deleteStaff = async () => {
    if (!staffToDelete) return;
    try {
      const res = await fetch(`/api/staff?id=${staffToDelete._id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDeleteDialog(false);
        setStaffToDelete(null);
        fetchStaff();
      }
    } catch (error) {
      console.error("Error deleting staff:", error);
    }
  };

  const toggleStatus = async () => {
    if (!staffToToggle) return;
    try {
      const res = await fetch("/api/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: staffToToggle._id,
          name: staffToToggle.name,
          email: staffToToggle.email,
          phone: staffToToggle.phone,
          department: staffToToggle.department,
          isActive: !staffToToggle.isActive,
        }),
      });
      if (res.ok) {
        setShowDeactivateDialog(false);
        setStaffToToggle(null);
        fetchStaff();
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const reassignStaff = async () => {
    if (!staffToReassign || !reassignManagerId) return;
    setIsReassigning(true);
    try {
      const res = await fetch("/api/staff/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staffToReassign._id, newManagerId: reassignManagerId }),
      });
      const data = await res.json();
      if (data.success) {
        setShowReassignDialog(false);
        setStaffToReassign(null);
        setReassignManagerId("");
        fetchStaff();
      } else {
        alert(data.error || "Reassign failed");
      }
    } catch (error) {
      console.error("Error reassigning staff:", error);
    } finally {
      setIsReassigning(false);
    }
  };

  const getManagerName = (managerId: string) => {
    const m = managers.find((m) => m._id === managerId);
    return m ? m.name : managerId ? "Unknown Manager" : "—";
  };

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">All Staff</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all staff members across all teams
          </p>
        </div>
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
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search staff by name, email, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Staff Member</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Manager</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Joined</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan mx-auto" />
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
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
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {member.department || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {getManagerName(member.managerId)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {member.phone || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reassign to another manager"
                            onClick={() => {
                              setStaffToReassign(member);
                              setReassignManagerId(member.managerId || "");
                              setShowReassignDialog(true);
                            }}
                          >
                            <RefreshCw className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={member.isActive ? "Deactivate" : "Activate"}
                            onClick={() => { setStaffToToggle(member); setShowDeactivateDialog(true); }}
                          >
                            {member.isActive ? (
                              <UserX className="w-4 h-4 text-orange-500" />
                            ) : (
                              <UserCheck className="w-4 h-4 text-green-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => { setStaffToDelete(member); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Reassign Staff Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Reassign Staff Member</DialogTitle>
            <DialogDescription>
              Move {staffToReassign?.name} to a different manager.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Current Manager
              </label>
              <p className="text-sm text-muted-foreground">
                {getManagerName(staffToReassign?.managerId)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Assign to Manager
              </label>
              <Select value={reassignManagerId} onValueChange={setReassignManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
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
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={reassignStaff}
              disabled={isReassigning || !reassignManagerId}
            >
              {isReassigning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete{" "}
            <span className="font-semibold text-foreground">{staffToDelete?.name}</span>?
            Their account and all associated data will be removed.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button className="bg-red-500 hover:bg-red-600 text-white" onClick={deleteStaff}>
              <Trash2 className="w-4 h-4 mr-2" />Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Dialog */}
      <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {staffToToggle?.isActive ? "Deactivate Staff Member" : "Activate Staff Member"}
            </DialogTitle>
            <DialogDescription>
              {staffToToggle?.isActive
                ? "The staff member will lose access to the system."
                : "The staff member will regain access to the system."}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to{" "}
            <span className="font-semibold">
              {staffToToggle?.isActive ? "deactivate" : "activate"}
            </span>{" "}
            <span className="font-semibold text-foreground">{staffToToggle?.name}</span>?
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>Cancel</Button>
            <Button
              className={staffToToggle?.isActive ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}
              onClick={toggleStatus}
            >
              {staffToToggle?.isActive ? (
                <><UserX className="w-4 h-4 mr-2" />Deactivate</>
              ) : (
                <><UserCheck className="w-4 h-4 mr-2" />Activate</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
