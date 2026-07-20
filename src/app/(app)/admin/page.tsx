"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Shield,
  Check,
  X,
  Play,
  Pause,
  UserX,
  Clock,
  ShieldAlert,
  Users,
  AlertTriangle,
  Ban,
  Trash2,
  Search,
  Filter,
  Flag,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Loader2
} from "lucide-react";
import { ApiResponse } from "@/types/ApiResponse";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

dayjs.extend(relativeTime);

interface UserItem {
  _id: string;
  username: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "banned";
  isFlagged: boolean;
  flagReason: string;
  toxicCount: number;
  suspensionCount: number;
  suspendedUntil?: string | null;
  authProvider: string;
  createdAt: string;
}

interface ReportedMessage {
  userId: string;
  username: string;
  messageId: string;
  content: string;
  toxicityLevel: string;
  toxicityScore: number;
  reportReason: string;
  createdAt: string;
}

interface PendingMessage {
  recipientId: string;
  recipientUsername: string;
  messageId: string;
  content: string;
  toxicityLevel: string;
  toxicityScore: number;
  audioUrl?: string;
  senderId?: string;
  senderUsername?: string;
  flaggedReason: string;
  createdAt: string;
}

interface UserReportItem {
  _id: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  category: string;
  reason: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt: string;
}

export default function AdminConsole() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"pending" | "reported" | "reported-users" | "users">("pending");

  // Users States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [flaggedUsersCount, setFlaggedUsersCount] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [flaggedFilter, setFlaggedFilter] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Reported Messages States
  const [reportedMessages, setReportedMessages] = useState<ReportedMessage[]>([]);
  const [loadingReported, setLoadingReported] = useState(true);

  // User Reports States
  const [userReports, setUserReports] = useState<UserReportItem[]>([]);
  const [loadingUserReports, setLoadingUserReports] = useState(true);

  // Pending Messages States
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  // Action Dialog States
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [actionType, setActionType] = useState<"suspend" | "ban" | "unsuspend" | "unflag" | "delete" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Audio Playback States
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Table Row Expansion States
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
  const [expandedReportedId, setExpandedReportedId] = useState<string | null>(null);
  const [expandedUserReportId, setExpandedUserReportId] = useState<string | null>(null);

  // System Inspect Protection State
  const [inspectProtectionEnabled, setInspectProtectionEnabled] = useState(false);
  const [togglingInspect, setTogglingInspect] = useState(false);

  const fetchInspectSetting = useCallback(async () => {
    try {
      const res = await axios.get("/api/admin/settings/inspect");
      if (res.data.success) {
        setInspectProtectionEnabled(Boolean(res.data.inspectProtectionEnabled));
      }
    } catch (err) {
      console.error("Failed to fetch inspect setting:", err);
    }
  }, []);

  const handleToggleInspectProtection = async () => {
    setTogglingInspect(true);
    try {
      const nextState = !inspectProtectionEnabled;
      const res = await axios.post("/api/admin/settings/inspect", { enabled: nextState });
      if (res.data.success) {
        setInspectProtectionEnabled(nextState);

        // Instant event dispatch for current window (0ms delay, no reload needed)
        window.dispatchEvent(
          new CustomEvent("inspect_setting_changed", { detail: { enabled: nextState } })
        );

        // Broadcast to all open tabs instantly
        if (typeof window !== "undefined" && "BroadcastChannel" in window) {
          const bc = new BroadcastChannel("veil_inspect_protection");
          bc.postMessage({ enabled: nextState });
          bc.close();
        }

        toast({
          title: nextState ? "Inspect Protection Enabled 🔒" : "Inspect Protection Disabled 🔓",
          description: res.data.message,
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update inspect protection setting.",
        variant: "destructive",
      });
    } finally {
      setTogglingInspect(false);
    }
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
      const flaggedParam = flaggedFilter ? `&flagged=true` : "";
      const res = await axios.get(
        `/api/admin/users?page=${usersPage}&search=${encodeURIComponent(searchQuery)}${statusParam}${flaggedParam}`
      );
      if (res.data.success) {
        setUsers(res.data.users || []);
        setTotalUsers(res.data.total || 0);
        if (res.data.flaggedCount !== undefined) {
          setFlaggedUsersCount(res.data.flaggedCount);
        } else {
          setFlaggedUsersCount(res.data.users?.filter((u: UserItem) => u.isFlagged).length || 0);
        }
        setUsersPages(res.data.pages || 1);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, searchQuery, statusFilter, flaggedFilter, toast]);

  // Fetch Reported Messages
  const fetchReported = useCallback(async () => {
    setLoadingReported(true);
    try {
      const res = await axios.get("/api/admin/reported");
      if (res.data.success) {
        setReportedMessages(res.data.reported || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch reported messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingReported(false);
    }
  }, [toast]);

  // Fetch User Reports
  const fetchUserReports = useCallback(async () => {
    setLoadingUserReports(true);
    try {
      const res = await axios.get("/api/admin/user-reports");
      if (res.data.success) {
        setUserReports(res.data.reports || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch user reports.",
        variant: "destructive",
      });
    } finally {
      setLoadingUserReports(false);
    }
  }, [toast]);

  // Fetch Pending Messages
  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const res = await axios.get("/api/admin/pending");
      if (res.data.success) {
        setPendingMessages(res.data.pending || []);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch pending messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingPending(false);
    }
  }, [toast]);

  // Initial load: Fetch all system metrics and active tab data
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "super-admin") {
      fetchInspectSetting();
      fetchUsers();
      fetchPending();
      fetchReported();
      fetchUserReports();
    }
  }, [status, session, fetchInspectSetting, fetchUsers, fetchPending, fetchReported, fetchUserReports]);

  // Re-fetch active tab data when activeTab changes
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "super-admin") {
      if (activeTab === "users") {
        fetchUsers();
      } else if (activeTab === "reported") {
        fetchReported();
      } else if (activeTab === "reported-users") {
        fetchUserReports();
      } else if (activeTab === "pending") {
        fetchPending();
      }
    }
  }, [activeTab, status, session, fetchUsers, fetchReported, fetchUserReports, fetchPending]);

  // User Report Action Handler (Dismiss/Resolve)
  const handleUserReportAction = async (reportId: string, action: "resolve" | "dismiss") => {
    try {
      const res = await axios.post(`/api/admin/user-reports/${reportId}`, { action });
      toast({
        title: `Report ${action === "resolve" ? "Resolved" : "Dismissed"}`,
        description: res.data.message,
      });
      setUserReports((prev) =>
        prev.map((r) =>
          r._id === reportId ? { ...r, status: action === "resolve" ? "resolved" : "dismissed" } : r
        )
      );
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    }
  };

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUsersPage(1);
    fetchUsers();
  };

  // Perform User Actions
  const handleUserActionSubmit = async () => {
    if (!selectedUser || !actionType) return;

    setSubmittingAction(true);
    try {
      if (actionType === "delete") {
        const res = await axios.delete(`/api/admin/users/${selectedUser._id}`);
        toast({ title: "Account Deleted", description: res.data.message });
        setUsers((prev) => prev.filter((u) => u._id !== selectedUser._id));
      } else if (actionType === "suspend") {
        const res = await axios.post("/api/admin/suspend", {
          userId: selectedUser._id,
          reason: actionReason,
        });
        toast({ title: "Account Suspended", description: res.data.message });
        fetchUsers();
      } else if (actionType === "ban") {
        const res = await axios.post("/api/admin/ban", {
          userId: selectedUser._id,
          reason: actionReason,
        });
        toast({ title: "Account Banned", description: res.data.message });
        fetchUsers();
      } else {
        // unsuspend or unflag
        const res = await axios.post(`/api/admin/users/${selectedUser._id}`, {
          action: actionType,
          reason: actionReason,
        });
        toast({ title: "Action Applied", description: res.data.message });
        fetchUsers();
      }
      setSelectedUser(null);
      setActionType(null);
      setActionReason("");
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description: axiosError.response?.data?.message || "Action failed.",
        variant: "destructive",
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  // Moderation Review Actions
  const handleReviewMessage = async (recipientId: string, messageId: string, action: "approve" | "reject") => {
    try {
      const res = await axios.post("/api/admin/review", {
        recipientId,
        messageId,
        action,
      });
      toast({ title: `Message ${action === "approve" ? "Approved" : "Rejected"}`, description: res.data.message });
      setPendingMessages((prev) => prev.filter((m) => m.messageId !== messageId));
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description: axiosError.response?.data?.message || "Action failed.",
        variant: "destructive",
      });
    }
  };

  // Delete reported message
  const handleDeleteReportedMessage = async (messageId: string) => {
    try {
      const res = await axios.delete(`/api/admin/messages/${messageId}`);
      toast({ title: "Message Deleted", description: res.data.message });
      setReportedMessages((prev) => prev.filter((m) => m.messageId !== messageId));
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    }
  };

  // Audio Playback Handler
  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      try {
        audioElement?.pause();
      } catch (err) {
        console.warn("Failed to pause audio:", err);
      }
      setPlayingAudioId(null);
    } else {
      if (audioElement) {
        try {
          audioElement.pause();
        } catch (err) {
          console.warn("Failed to pause audio:", err);
        }
      }
      const audio = new Audio(url);
      audio.play().catch((err) => {
        console.warn("Audio playback interrupted:", err);
      });
      audio.onended = () => setPlayingAudioId(null);
      setAudioElement(audio);
      setPlayingAudioId(id);
    }
  };

  useEffect(() => {
    return () => {
      if (audioElement) {
        try {
          audioElement.pause();
        } catch (err) {
          console.warn("Failed to pause audio on cleanup:", err);
        }
      }
    };
  }, [audioElement]);

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="glass-card p-8 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 rounded-lg" />
                <Skeleton className="h-4 w-96 rounded" />
              </div>
            </div>
          </div>

          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card bg-card/25 border border-white/5 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-8 w-12 rounded" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-lg" />
                </div>
              </div>
            ))}
          </div>

          {/* Tabs skeleton */}
          <Skeleton className="h-12 w-full rounded" />

          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card bg-card/20 border border-white/5 rounded-xl overflow-hidden">
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-white/5 flex gap-2">
                  <Skeleton className="h-9 w-24 rounded-lg" />
                  <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || session?.user?.role !== "super-admin") {
    return (
      <div className="container mx-auto py-24 text-center">
        <ShieldAlert className="h-16 w-16 mx-auto text-rose-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-black tracking-tight">Access Denied</h1>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
          This panel is restricted to the Super Administrator. Please verify your credentials and sign in again.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-screen">
      <div className="space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-rose-400">
              Super Admin Panel
            </h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              App governance: view abusive/harsh content quarantine, reported flags, and manage system accounts.
            </p>
          </div>

          {/* Inspect & Shortcut Protection Control */}
          <div className="flex items-center gap-3.5 bg-zinc-900/80 border border-white/10 p-3 px-4 rounded-xl shadow-lg shrink-0">
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-primary" /> Inspect & Right-Click Protection
              </span>
              <span className="text-[10px] mt-0.5">
                {inspectProtectionEnabled ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Protected (Blocked F12, Inspect & Right-Click)
                  </span>
                ) : (
                  <span className="text-zinc-400 font-medium">Disabled (Inspect Allowed)</span>
                )}
              </span>
            </div>

            <Button
              onClick={handleToggleInspectProtection}
              disabled={togglingInspect}
              size="sm"
              className={
                inspectProtectionEnabled
                  ? "bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-3"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-3"
              }
            >
              {togglingInspect ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : inspectProtectionEnabled ? (
                "Disable Protection"
              ) : (
                "Enable Protection"
              )}
            </Button>
          </div>
        </div>

        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card bg-card/25 border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-300" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Total Users</span>
                <h3 className="text-3xl font-black text-foreground">{totalUsers}</h3>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-card/25 border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Quarantined Messages</span>
                <h3 className="text-3xl font-black text-amber-400">{pendingMessages.length}</h3>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-card/25 border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-all duration-300" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Active Reports</span>
                <h3 className="text-3xl font-black text-rose-400">{reportedMessages.length}</h3>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card bg-card/25 border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-300" />
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Flagged Users</span>
                <h3 className="text-3xl font-black text-red-400">
                  {flaggedUsersCount}
                </h3>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 scrollbar-none overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-6 py-3.5 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "pending"
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Clock className="h-4 w-4" />
            Quarantine Queue ({pendingMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("reported")}
            className={`px-6 py-3.5 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "reported"
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Reported Messages ({reportedMessages.length})
          </button>
          <button
            onClick={() => setActiveTab("reported-users")}
            className={`px-6 py-3.5 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "reported-users"
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Flag className="h-4 w-4" />
            Reported Users ({userReports.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3.5 font-bold text-sm transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "users"
                ? "text-primary border-primary bg-primary/5"
                : "text-muted-foreground border-transparent hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Users className="h-4 w-4" />
            User Management ({totalUsers})
          </button>
        </div>

        {/* Dynamic Tab View Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "pending" && (
              /* Moderation / Quarantine Queue Table */
              <div className="space-y-6">
                {loadingPending ? (
                  <div className="glass-card bg-card/20 border border-white/5 rounded-2xl p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : pendingMessages.length > 0 ? (
                  <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                            <th className="py-3.5 px-4 font-bold">Recipient</th>
                            <th className="py-3.5 px-4 font-bold">Message Preview</th>
                            <th className="py-3.5 px-4 font-bold">Trigger / AI Score</th>
                            <th className="py-3.5 px-4 font-bold">Sender</th>
                            <th className="py-3.5 px-4 font-bold">Time</th>
                            <th className="py-3.5 px-4 font-bold text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {pendingMessages.map((msg) => {
                            const isExpanded = expandedPendingId === msg.messageId;
                            return (
                              <React.Fragment key={msg.messageId}>
                                <tr
                                  onClick={() => setExpandedPendingId(isExpanded ? null : msg.messageId)}
                                  className={`cursor-pointer transition-colors ${
                                    isExpanded ? "bg-white/10" : "hover:bg-white/5"
                                  }`}
                                >
                                  <td className="py-3.5 px-4 font-bold text-foreground">
                                    @{msg.recipientUsername}
                                  </td>
                                  <td className="py-3.5 px-4 max-w-xs truncate font-medium text-foreground/80">
                                    {msg.content ? (
                                      <span>&ldquo;{msg.content}&rdquo;</span>
                                    ) : (
                                      <span className="text-amber-400 italic">🎵 Voice Note</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                      <AlertTriangle className="h-3 w-3" />
                                      {msg.toxicityLevel || "Quarantined"} ({Math.round((msg.toxicityScore || 0) * 100)}%)
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-medium">
                                    {msg.senderUsername ? (
                                      <span className="text-primary font-bold">@{msg.senderUsername}</span>
                                    ) : (
                                      <span className="text-muted-foreground/60 italic">Anonymous Guest</span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-muted-foreground font-mono text-[10px]">
                                    {dayjs(msg.createdAt).fromNow()}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                                      {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-black/40">
                                    <td colSpan={6} className="p-4 sm:p-6 border-t border-b border-white/10">
                                      <div className="space-y-4 max-w-4xl">
                                        <div className="p-4 bg-background/80 border border-white/10 rounded-xl space-y-2">
                                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block font-bold">
                                            Quarantined Content
                                          </span>
                                          {msg.content ? (
                                            <p className="text-sm font-semibold leading-relaxed break-words text-foreground">
                                              &ldquo;{msg.content}&rdquo;
                                            </p>
                                          ) : (
                                            <div className="flex items-center gap-3 py-2">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  togglePlayAudio(msg.messageId, msg.audioUrl || "");
                                                }}
                                                className="h-9 w-9 bg-primary/20 text-primary hover:bg-primary/30 rounded-full"
                                              >
                                                {playingAudioId === msg.messageId ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                                              </Button>
                                              <span className="text-xs text-muted-foreground font-semibold">Anonymous Voice Message</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs space-y-1.5">
                                          <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                                            <AlertTriangle className="h-4 w-4" />
                                            Quarantine Trigger:
                                          </div>
                                          <p className="text-[11px] text-muted-foreground italic">
                                            &ldquo;{msg.flaggedReason}&rdquo;
                                          </p>
                                          {msg.toxicityLevel && (
                                            <div className="flex justify-between border-t border-white/5 pt-2 text-[10px] text-muted-foreground uppercase font-mono">
                                              <span>AI level: {msg.toxicityLevel}</span>
                                              <span>Score: {Math.round((msg.toxicityScore || 0) * 100)}%</span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex items-center justify-between pt-2 gap-4 flex-wrap">
                                          {msg.senderId ? (
                                            <div className="flex gap-2">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedUser({
                                                    _id: msg.senderId!,
                                                    username: msg.senderUsername!,
                                                    email: "",
                                                    role: "user",
                                                    status: "active",
                                                    isFlagged: true,
                                                    flagReason: "Abusive content in quarantined message queue",
                                                    toxicCount: 1,
                                                    suspensionCount: 0,
                                                    authProvider: "",
                                                    createdAt: "",
                                                  });
                                                  setActionType("suspend");
                                                }}
                                                className="h-8 text-xs text-amber-500 hover:bg-amber-500/15 border border-amber-500/20 rounded-lg"
                                              >
                                                <Ban className="h-3.5 w-3.5 mr-1" />
                                                Suspend Sender
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedUser({
                                                    _id: msg.senderId!,
                                                    username: msg.senderUsername!,
                                                    email: "",
                                                    role: "user",
                                                    status: "active",
                                                    isFlagged: true,
                                                    flagReason: "Abusive content in quarantined message queue",
                                                    toxicCount: 1,
                                                    suspensionCount: 0,
                                                    authProvider: "",
                                                    createdAt: "",
                                                  });
                                                  setActionType("ban");
                                                }}
                                                className="h-8 text-xs text-red-500 hover:bg-red-500/15 border border-red-500/20 rounded-lg"
                                              >
                                                <UserX className="h-3.5 w-3.5 mr-1" />
                                                Ban Sender
                                              </Button>
                                            </div>
                                          ) : <div />}

                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleReviewMessage(msg.recipientId, msg.messageId, "reject");
                                              }}
                                              className="border-white/10 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg px-4"
                                            >
                                              <X className="h-3.5 w-3.5 mr-1" />
                                              Reject
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleReviewMessage(msg.recipientId, msg.messageId, "approve");
                                              }}
                                              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 shadow-lg shadow-emerald-600/20"
                                            >
                                              <Check className="h-3.5 w-3.5 mr-1" />
                                              Approve Delivery
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 glass-card rounded-xl border border-white/5">
                    <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400/80 mb-3" />
                    <h3 className="text-lg font-bold">Quarantine clean</h3>
                    <p className="text-xs text-muted-foreground mt-1">Excellent! No messages are blocked pending moderation review.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reported" && (
              /* Reported Messages Queue Table */
              <div className="space-y-6">
                {loadingReported ? (
                  <div className="glass-card bg-card/20 border border-white/5 rounded-2xl p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : reportedMessages.length > 0 ? (
                  <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                            <th className="py-3.5 px-4 font-bold">Recipient</th>
                            <th className="py-3.5 px-4 font-bold">Message Preview</th>
                            <th className="py-3.5 px-4 font-bold">Report Reason</th>
                            <th className="py-3.5 px-4 font-bold">AI Score</th>
                            <th className="py-3.5 px-4 font-bold">Reported Time</th>
                            <th className="py-3.5 px-4 font-bold text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {reportedMessages.map((msg) => {
                            const isExpanded = expandedReportedId === msg.messageId;
                            return (
                              <React.Fragment key={msg.messageId}>
                                <tr
                                  onClick={() => setExpandedReportedId(isExpanded ? null : msg.messageId)}
                                  className={`cursor-pointer transition-colors ${
                                    isExpanded ? "bg-white/10" : "hover:bg-white/5"
                                  }`}
                                >
                                  <td className="py-3.5 px-4 font-bold text-foreground">
                                    @{msg.username}
                                  </td>
                                  <td className="py-3.5 px-4 max-w-xs truncate font-medium text-foreground/80">
                                    &ldquo;{msg.content}&rdquo;
                                  </td>
                                  <td className="py-3.5 px-4 text-rose-400 font-semibold max-w-xs truncate">
                                    {msg.reportReason}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[10px]">
                                    {msg.toxicityLevel || "TOXIC"} ({Math.round((msg.toxicityScore ?? 0) * 100)}%)
                                  </td>
                                  <td className="py-3.5 px-4 text-muted-foreground font-mono text-[10px]">
                                    {dayjs(msg.createdAt).format("MMM D, YYYY • h:mm A")}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                                      {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-black/40">
                                    <td colSpan={6} className="p-4 sm:p-6 border-t border-b border-white/10">
                                      <div className="space-y-4 max-w-4xl">
                                        <div className="p-4 bg-background/80 border border-white/10 rounded-xl space-y-2">
                                          <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block font-bold">
                                            Reported Message Content
                                          </span>
                                          <p className="text-sm font-semibold leading-relaxed break-words text-foreground">
                                            &ldquo;{msg.content}&rdquo;
                                          </p>
                                        </div>

                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-1.5">
                                          <div className="font-semibold text-rose-400">
                                            Report Reason:
                                          </div>
                                          <p className="text-[11px] text-muted-foreground italic">
                                            &ldquo;{msg.reportReason}&rdquo;
                                          </p>
                                          <div className="flex justify-between border-t border-white/5 pt-2 text-[10px] text-muted-foreground uppercase font-mono">
                                            <span>AI level: {msg.toxicityLevel}</span>
                                            <span>Score: {Math.round((msg.toxicityScore ?? 0) * 100)}%</span>
                                          </div>
                                        </div>

                                        <div className="flex justify-end pt-2">
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteReportedMessage(msg.messageId);
                                            }}
                                            className="bg-rose-600 hover:bg-rose-500 text-white px-4 rounded-lg"
                                          >
                                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                            Delete Message
                                          </Button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 glass-card rounded-xl border border-white/5">
                    <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400/80 mb-3" />
                    <h3 className="text-lg font-bold">No reported messages</h3>
                    <p className="text-xs text-muted-foreground mt-1">Excellent! The safety queues are completely clean.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reported-users" && (
              /* Reported Users Queue Table */
              <div className="space-y-6">
                {loadingUserReports ? (
                  <div className="glass-card bg-card/20 border border-white/5 rounded-2xl p-6 space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                ) : userReports.length > 0 ? (
                  <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5 text-muted-foreground uppercase text-[10px] font-mono tracking-wider">
                            <th className="py-3.5 px-4 font-bold">Reported User</th>
                            <th className="py-3.5 px-4 font-bold">Category</th>
                            <th className="py-3.5 px-4 font-bold">Reason Preview</th>
                            <th className="py-3.5 px-4 font-bold">Reported By</th>
                            <th className="py-3.5 px-4 font-bold">Status</th>
                            <th className="py-3.5 px-4 font-bold text-right">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {userReports.map((report) => {
                            const isExpanded = expandedUserReportId === report._id;
                            return (
                              <React.Fragment key={report._id}>
                                <tr
                                  onClick={() => setExpandedUserReportId(isExpanded ? null : report._id)}
                                  className={`cursor-pointer transition-colors ${
                                    isExpanded ? "bg-white/10" : "hover:bg-white/5"
                                  }`}
                                >
                                  <td className="py-3.5 px-4 font-bold text-rose-400">
                                    @{report.reportedUsername}
                                  </td>
                                  <td className="py-3.5 px-4 uppercase text-[10px] font-mono text-muted-foreground font-bold">
                                    {report.category}
                                  </td>
                                  <td className="py-3.5 px-4 max-w-xs truncate font-medium text-foreground/80">
                                    &ldquo;{report.reason}&rdquo;
                                  </td>
                                  <td className="py-3.5 px-4 font-medium text-foreground">
                                    @{report.reporterUsername}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      report.status === "pending"
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        : report.status === "resolved"
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                                    }`}>
                                      {report.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full">
                                      {isExpanded ? <ChevronUp className="h-4 w-4 text-primary" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </Button>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-black/40">
                                    <td colSpan={6} className="p-4 sm:p-6 border-t border-b border-white/10">
                                      <div className="space-y-4 max-w-4xl">
                                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="font-semibold text-rose-400 uppercase text-[10px] tracking-wider font-mono">
                                              Category: {report.category}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                              {dayjs(report.createdAt).format("MMM D, YYYY • h:mm A")}
                                            </span>
                                          </div>
                                          <p className="text-[12px] text-foreground/90 italic leading-relaxed pt-1">
                                            &ldquo;{report.reason}&rdquo;
                                          </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 gap-2 flex-wrap">
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUser({
                                                  _id: report.reportedUserId,
                                                  username: report.reportedUsername,
                                                  email: "",
                                                  role: "user",
                                                  status: "active",
                                                  isFlagged: true,
                                                  flagReason: `Reported for ${report.category}: ${report.reason}`,
                                                  toxicCount: 1,
                                                  suspensionCount: 0,
                                                  authProvider: "",
                                                  createdAt: "",
                                                });
                                                setActionType("suspend");
                                              }}
                                              className="h-8 text-xs text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 rounded-lg px-3"
                                            >
                                              <Ban className="h-3.5 w-3.5 mr-1" />
                                              Suspend
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUser({
                                                  _id: report.reportedUserId,
                                                  username: report.reportedUsername,
                                                  email: "",
                                                  role: "user",
                                                  status: "active",
                                                  isFlagged: true,
                                                  flagReason: `Reported for ${report.category}: ${report.reason}`,
                                                  toxicCount: 1,
                                                  suspensionCount: 0,
                                                  authProvider: "",
                                                  createdAt: "",
                                                });
                                                setActionType("ban");
                                              }}
                                              className="h-8 text-xs text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 rounded-lg px-3"
                                            >
                                              <UserX className="h-3.5 w-3.5 mr-1" />
                                              Ban
                                            </Button>
                                          </div>

                                          <div className="flex gap-2">
                                            {report.status === "pending" && (
                                              <>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUserReportAction(report._id, "dismiss");
                                                  }}
                                                  className="h-8 border-white/10 hover:bg-white/5 text-gray-400 text-xs px-3 rounded-lg"
                                                >
                                                  <X className="h-3.5 w-3.5 mr-1" />
                                                  Dismiss
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUserReportAction(report._id, "resolve");
                                                  }}
                                                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 rounded-lg"
                                                >
                                                  <UserCheck className="h-3.5 w-3.5 mr-1" />
                                                  Resolve
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 glass-card rounded-xl border border-white/5">
                    <ShieldCheck className="h-12 w-12 mx-auto text-emerald-400/80 mb-3" />
                    <h3 className="text-lg font-bold">No reported users</h3>
                    <p className="text-xs text-muted-foreground mt-1">Excellent! No user reports require admin review.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "users" && (
              /* User Accounts Management */
              <div className="space-y-6">
                {/* Search/Filters bar */}
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-center bg-white/[0.02] border border-white/5 p-4 rounded-2xl shadow-xl backdrop-blur-md">
                  <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                    <Input
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-4 bg-white/[0.03] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-sm h-10 rounded-xl transition-all duration-300"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/75 pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-10 pr-9 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-foreground focus:ring-1 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all duration-300 appearance-none h-10 cursor-pointer min-w-[160px]"
                    >
                      <option value="all" className="bg-neutral-950 text-foreground">All Statuses</option>
                      <option value="active" className="bg-neutral-950 text-foreground">Active Only</option>
                      <option value="suspended" className="bg-neutral-950 text-foreground">Suspended Only</option>
                      <option value="banned" className="bg-neutral-950 text-foreground">Banned Only</option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground/75">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 px-4 h-10 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer select-none text-xs text-muted-foreground/80 hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={flaggedFilter}
                      onChange={(e) => setFlaggedFilter(e.target.checked)}
                      className="accent-primary h-4 w-4 cursor-pointer rounded border-white/20 bg-neutral-950 checked:bg-primary focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Flagged Accounts Only</span>
                  </label>

                  <Button type="submit" className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-black font-semibold shadow-md active:scale-95 transition-all duration-200">
                    Apply Filters
                  </Button>
                </form>

                {loadingUsers ? (
                  <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          {["User", "Provider", "Status", "Toxicity", "Suspensions", "Flags", "Actions"].map((h) => (
                            <th key={h} className="p-4"><Skeleton className="h-3 w-16 rounded" /></th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="p-4"><Skeleton className="h-4 w-28 rounded" /></td>
                            <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                            <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                            <td className="p-4 text-center"><Skeleton className="h-4 w-6 rounded mx-auto" /></td>
                            <td className="p-4 text-center"><Skeleton className="h-4 w-6 rounded mx-auto" /></td>
                            <td className="p-4"><Skeleton className="h-4 w-10 rounded" /></td>
                            <td className="p-4 text-right"><div className="flex gap-1 justify-end"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-8 w-8 rounded-full" /></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto glass-card rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse text-sm min-w-[640px]">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 font-semibold text-muted-foreground">
                          <th className="p-4">User</th>
                          <th className="p-4">Provider</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Toxicity Count</th>
                          <th className="p-4 text-center">Suspensions</th>
                          <th className="p-4">Flags</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.length > 0 ? (
                          users.map((u) => (
                            <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <div className="font-semibold text-foreground">@{u.username}</div>
                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                <div className="text-[10px] text-muted-foreground/60 mt-0.5">Joined {dayjs(u.createdAt).format("MMM D, YYYY")}</div>
                              </td>
                              <td className="p-4 capitalize text-xs text-muted-foreground font-mono">
                                {u.authProvider || "Local"}
                              </td>
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                    u.status === "active" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                                    u.status === "suspended" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                    "bg-red-500/10 text-red-400 border border-red-500/20"
                                  }`}>
                                    {u.status}
                                  </span>
                                  {u.status === "suspended" && u.suspendedUntil && (
                                    <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 font-mono">
                                      <Clock className="h-3 w-3" />
                                      Ends {dayjs(u.suspendedUntil).fromNow()}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 font-mono font-bold text-center">
                                {u.toxicCount || 0}
                              </td>
                              <td className="p-4 font-mono font-bold text-center text-amber-500">
                                {u.suspensionCount || 0}
                              </td>
                              <td className="p-4">
                                {u.isFlagged ? (
                                  <div className="text-xs text-amber-400 flex flex-col gap-0.5 max-w-[150px] truncate" title={u.flagReason}>
                                    <span className="font-bold flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Flagged
                                    </span>
                                    <span className="text-[10px] text-muted-foreground italic truncate">{u.flagReason}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground/50">None</span>
                                )}
                              </td>
                              <td className="p-4 text-right space-x-1 whitespace-nowrap">
                                {/* Suspend/Ban/Unsuspend action triggers */}
                                {u.status !== "active" ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setSelectedUser(u); setActionType("unsuspend"); }}
                                    className="h-8 w-8 text-green-400 hover:bg-green-500/10 rounded-full"
                                    title="Unsuspend / Activate Account"
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <>
                                    {u.suspensionCount < 3 ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setSelectedUser(u); setActionType("suspend"); }}
                                        className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 rounded-full"
                                        title={`Suspend Account (${u.suspensionCount}/3 suspensions)`}
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="h-8 w-8 text-gray-500 opacity-40 cursor-not-allowed rounded-full"
                                        title="Maximum 3 suspensions reached (3/3). This user can only be permanently banned."
                                      >
                                        <Ban className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => { setSelectedUser(u); setActionType("ban"); }}
                                      className="h-8 w-8 text-red-500 hover:bg-red-500/10 rounded-full"
                                      title="Ban Account"
                                    >
                                      <UserX className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}

                                {u.isFlagged && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => { setSelectedUser(u); setActionType("unflag"); }}
                                    className="h-8 w-8 text-blue-400 hover:bg-blue-500/10 rounded-full"
                                    title="Clear Account Flag"
                                  >
                                    <ShieldCheck className="h-4 w-4" />
                                  </Button>
                                )}

                                {/* Hard Delete */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => { setSelectedUser(u); setActionType("delete"); }}
                                  className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-full"
                                  title="Delete User permanently"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No users match the search filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination Controls */}
                {usersPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                      className="border-white/10"
                    >
                      Prev
                    </Button>
                    <span className="text-xs text-muted-foreground flex items-center px-3 font-mono">
                      Page {usersPage} of {usersPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUsersPage(p => Math.min(usersPages, p + 1))}
                      disabled={usersPage === usersPages}
                      className="border-white/10"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Dialog (Suspension, Ban, Delete) */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="glass-card border-white/10 max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize text-lg font-bold">
              {actionType === "delete" ? "Delete Account" : `${actionType} Account`}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {actionType === "delete"
                ? `Are you sure you want to permanently delete @${selectedUser?.username}? This action is irreversible.`
                : actionType === "suspend"
                ? `Confirm suspending @${selectedUser?.username}. Escalation schedule: 1st time = 1 week, 2nd time = 1 month, 3rd time = 2 months. (Current count: ${selectedUser?.suspensionCount || 0}/3)`
                : actionType === "ban"
                ? `Confirm banning @${selectedUser?.username} permanently from the system.`
                : `Confirm the "${actionType}" action for @${selectedUser?.username}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Reason field (only for Suspend or Ban actions) */}
          {(actionType === "suspend" || actionType === "ban") && (
            <div className="space-y-1.5 py-2">
              <label className="text-xs text-muted-foreground font-semibold">Moderation Reason:</label>
              <Input
                placeholder="Specify why you are moderating this account..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="bg-background/50 border-white/10 text-xs"
              />
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedUser(null); setActionType(null); setActionReason(""); }}
              className="border-white/10 text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUserActionSubmit}
              disabled={submittingAction || ((actionType === "suspend" || actionType === "ban") && !actionReason.trim())}
              size="sm"
              className={actionType === "delete" || actionType === "ban" || actionType === "suspend" ? "bg-red-600 hover:bg-red-500 text-white text-xs" : "bg-primary text-black text-xs"}
            >
              {submittingAction ? "Applying..." : "Confirm Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
