"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  User,
  FolderKanban,
  ClipboardList,
  MessageSquare,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ActivityLog {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (filterType !== "all") params.set("entityType", filterType);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/activity-logs?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filterType, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [filterType, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "user": return <User className="w-4 h-4 text-nts-cyan" />;
      case "project": return <FolderKanban className="w-4 h-4 text-nts-yellow" />;
      case "task": return <ClipboardList className="w-4 h-4 text-green-500" />;
      case "chat": return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: any = {
      super_admin: "bg-purple-500/10 text-purple-500",
      manager: "bg-nts-cyan/10 text-nts-cyan",
      staff: "bg-green-500/10 text-green-500",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || colors.staff}`}>
        {role.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">System activity and audit trail</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px] flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs... (press Enter)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" onClick={handleSearch}>
                Search
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-10 rounded-2xl border border-gray-300 dark:border-border/60 bg-white dark:bg-nts-dark-card px-3 text-sm"
              >
                <option value="all">All Types</option>
                <option value="user">Users</option>
                <option value="project">Projects</option>
                <option value="task">Tasks</option>
                <option value="chat">Chat</option>
              </select>
            </div>
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing results for &quot;{searchQuery}&quot; — {total} total
              <button
                className="ml-2 text-nts-cyan underline"
                onClick={() => { setSearchInput(""); setSearchQuery(""); }}
              >
                Clear
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Time</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nts-cyan mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      className="border-b border-gray-100 dark:border-border/40 hover:bg-accent/60 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xs font-bold">
                            {log.userName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{log.userName}</p>
                            {getRoleBadge(log.userRole)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {log.action}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(log.entityType)}
                          <span className="text-sm text-muted-foreground capitalize">{log.entityType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/60">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
