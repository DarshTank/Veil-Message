"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, 
  Inbox, 
  Send,
  RefreshCcw, 
  UserPlus, 
  Check, 
  X, 
  Undo2,
  Loader2, 
  AlertTriangle, 
  ShieldAlert,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import Link from "next/link";

interface Stranger {
  _id: string;
  username: string;
  bio: string;
}

interface InboxRequest {
  _id: string;
  sender: {
    _id: string;
    username: string;
    bio: string;
  };
  createdAt: string;
}

interface SentRequest {
  _id: string;
  receiver: {
    _id: string;
    username: string;
    bio: string;
  };
  createdAt: string;
}

export default function DiscoverPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const { pendingRequests, setPendingRequests } = useNotificationCounts();

  const [activeTab, setActiveTab] = useState<"explore" | "inbox" | "sent">("explore");
  
  // Explore state
  const [strangers, setStrangers] = useState<Stranger[]>([]);
  const [isLoadingStrangers, setIsLoadingStrangers] = useState(false);
  const [strangersError, setStrangersError] = useState(false);
  const [sendingRequestIds, setSendingRequestIds] = useState<Set<string>>(new Set());

  // Inbox state
  const [inboxRequests, setInboxRequests] = useState<InboxRequest[]>([]);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxError, setInboxError] = useState(false);
  const [actingRequestIds, setActingRequestIds] = useState<Set<string>>(new Set());

  // Sent state
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [isLoadingSent, setIsLoadingSent] = useState(false);
  const [sentError, setSentError] = useState(false);
  const [revokingRequestIds, setRevokingRequestIds] = useState<Set<string>>(new Set());

  // Check account setup / status
  const userStatus = session?.user?.status as "active" | "suspended" | "banned" | undefined;
  const isRestricted = userStatus === "suspended" || userStatus === "banned";

  // Fetch strangers
  const fetchStrangers = useCallback(async () => {
    if (isRestricted || status !== "authenticated") return;
    setIsLoadingStrangers(true);
    setStrangersError(false);
    try {
      const res = await axios.get("/api/discover");
      if (res.data.success) {
        setStrangers(res.data.strangers || []);
      } else {
        setStrangersError(true);
      }
    } catch (err) {
      console.error(err);
      setStrangersError(true);
    } finally {
      setIsLoadingStrangers(false);
    }
  }, [isRestricted, status]);

  // Fetch inbox requests
  const fetchInbox = useCallback(async () => {
    if (isRestricted || status !== "authenticated") return;
    setIsLoadingInbox(true);
    setInboxError(false);
    try {
      const res = await axios.get("/api/connections/requests/inbox");
      if (res.data.success) {
        setInboxRequests(res.data.requests || []);
        setPendingRequests(res.data.requests?.length || 0);
      } else {
        setInboxError(true);
      }
    } catch (err) {
      console.error(err);
      setInboxError(true);
    } finally {
      setIsLoadingInbox(false);
    }
  }, [isRestricted, status, setPendingRequests]);

  // Fetch sent requests
  const fetchSent = useCallback(async () => {
    if (isRestricted || status !== "authenticated") return;
    setIsLoadingSent(true);
    setSentError(false);
    try {
      const res = await axios.get("/api/connections/requests/sent");
      if (res.data.success) {
        setSentRequests(res.data.requests || []);
      } else {
        setSentError(true);
      }
    } catch (err) {
      console.error(err);
      setSentError(true);
    } finally {
      setIsLoadingSent(false);
    }
  }, [isRestricted, status]);

  // Load tab data
  useEffect(() => {
    if (status === "authenticated" && !isRestricted) {
      // Fetch counts and initial lists for all tabs
      fetchInbox();
      fetchSent();

      if (activeTab === "explore") {
        fetchStrangers();
      }
    }
  }, [activeTab, status, isRestricted, fetchStrangers, fetchInbox, fetchSent]);

  // Handle send request
  const handleConnect = async (receiverId: string) => {
    if (sendingRequestIds.has(receiverId)) return;
    setSendingRequestIds(prev => {
      const next = new Set(prev);
      next.add(receiverId);
      return next;
    });

    try {
      const res = await axios.post("/api/connections/request", { receiverId });
      if (res.data.success) {
        toast({
          title: "Connection Request Sent",
          description: "Your request is pending their approval.",
        });
        // Remove from list optimistically
        setStrangers(prev => prev.filter(s => s._id !== receiverId));
        fetchSent();
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || "Failed to send request.";
      toast({
        title: "Request Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(receiverId);
        return next;
      });
    }
  };

  // Handle request action (accept/decline)
  const handleRequestAction = async (requestId: string, action: "accept" | "decline") => {
    if (actingRequestIds.has(requestId)) return;
    setActingRequestIds(prev => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      const res = await axios.patch(`/api/connections/request/${requestId}`, { action });
      if (res.data.success) {
        toast({
          title: action === "accept" ? "Connection Established" : "Request Declined",
          description: action === "accept" 
            ? "You are now connected! You can now start chatting."
            : "The connection request has been declined.",
        });

        // Update list
        setInboxRequests(prev => prev.filter(r => r._id !== requestId));
        setPendingRequests(prev => Math.max(0, prev - 1));
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || "Action failed.";
      toast({
        title: "Action Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setActingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Handle revoke sent request
  const handleRevokeRequest = async (requestId: string) => {
    if (revokingRequestIds.has(requestId)) return;
    setRevokingRequestIds(prev => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });

    try {
      const res = await axios.delete(`/api/connections/request/${requestId}`);
      if (res.data.success) {
        toast({
          title: "Request Revoked",
          description: "Your connection request has been withdrawn.",
        });
        setSentRequests(prev => prev.filter(r => r._id !== requestId));
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || "Failed to revoke request.";
      toast({
        title: "Action Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRevokingRequestIds(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  // Loading Session State
  if (status === "loading") {
    return (
      <div className="min-h-screen text-white pt-6 pb-12 px-6 md:px-12 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8">
          <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
          <div className="flex space-x-4 border-b border-white/10 pb-4">
            <div className="h-8 w-24 bg-white/5 rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-white/5 rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-white/5 rounded-md animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 4].map(n => (
              <div key={n} className="border border-white/5 bg-white/5 rounded-2xl p-6 space-y-4">
                <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-full bg-white/10 rounded animate-pulse" />
                <div className="h-10 w-24 bg-white/10 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Suspended or Banned Notice
  if (isRestricted) {
    return (
      <div className="min-h-screen text-white pt-6 pb-12 px-6 md:px-12 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-destructive/10 border border-destructive/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-md">
          <div className="p-4 bg-destructive/20 rounded-full text-destructive">
            <ShieldAlert className="w-16 h-16 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Account Restricted</h1>
          <p className="text-gray-400 text-lg max-w-md">
            Your account status is currently <span className="font-semibold text-destructive uppercase tracking-wider">{userStatus}</span>. Discover browsing and interaction features are restricted.
          </p>
          <div className="pt-4">
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 text-white hover:bg-white/5">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white pt-6 pb-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-gray-600 bg-clip-text text-transparent">
              Stranger Connect
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Find new connections and build a social layer on top of your anonymous profile.
            </p>
          </div>
          
          {activeTab === "explore" && (
            <Button
              onClick={fetchStrangers}
              disabled={isLoadingStrangers}
              size="sm"
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 flex items-center gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoadingStrangers ? "animate-spin" : ""}`} />
              Refresh Feed
            </Button>
          )}
        </div>

        {/* Custom Tab Controls */}
        <div className="flex border-b border-white/10 pb-px overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex items-center gap-2 py-3.5 px-4 sm:px-6 font-medium text-xs sm:text-sm transition-all relative shrink-0 ${
              activeTab === "explore" ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Compass className="w-4 h-4" />
            Explore
            {activeTab === "explore" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex items-center gap-2 py-3.5 px-4 sm:px-6 font-medium text-xs sm:text-sm transition-all relative shrink-0 ${
              activeTab === "inbox" ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Inbox
            {pendingRequests > 0 && (
              <Badge variant="destructive" className="ml-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center font-bold">
                {pendingRequests}
              </Badge>
            )}
            {activeTab === "inbox" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`flex items-center gap-2 py-3.5 px-4 sm:px-6 font-medium text-xs sm:text-sm transition-all relative shrink-0 ${
              activeTab === "sent" ? "text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Send className="w-4 h-4" />
            Sent Requests
            {sentRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px] min-w-[18px] h-[18px] flex items-center justify-center font-bold bg-white/10 text-white border-white/10">
                {sentRequests.length}
              </Badge>
            )}
            {activeTab === "sent" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="min-h-[400px]">
          {/* EXPLORE TAB */}
          {activeTab === "explore" && (
            <motion.div
              key="explore-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
                {isLoadingStrangers ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Card key={i} className="border-white/5 bg-white/5 backdrop-blur-md rounded-2xl p-6 space-y-4">
                        <Skeleton className="h-6 w-1/2 bg-white/10" />
                        <Skeleton className="h-4 w-full bg-white/10" />
                        <Skeleton className="h-4 w-3/4 bg-white/10" />
                        <Skeleton className="h-10 w-full bg-white/10" />
                      </Card>
                    ))}
                  </div>
                ) : strangersError ? (
                  <div className="text-center py-16 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <p className="text-gray-300">Failed to load stranger profiles.</p>
                    <Button onClick={fetchStrangers} size="sm" variant="outline" className="border-white/10">
                      Retry
                    </Button>
                  </div>
                ) : strangers.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <Compass className="w-16 h-16 text-gray-500 mx-auto" />
                    <h3 className="text-lg font-bold">No new strangers found</h3>
                    <p className="text-gray-400 max-w-sm mx-auto text-sm">
                      Check back later, or refresh the feed to find more people.
                    </p>
                    <Button onClick={fetchStrangers} size="sm" className="bg-primary text-black hover:bg-primary/80">
                      Refresh Feed
                    </Button>
                  </div>
                ) : (
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
                    {strangers.map((stranger, idx) => (
                      <motion.div
                        key={stranger._id}
                        layout
                        initial={{ scale: 0.94, opacity: 0, y: 20 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          y: [0, -6 - (idx % 3) * 4, 0],
                        }}
                        exit={{ scale: 0.94, opacity: 0, y: -10 }}
                        transition={{
                          scale: { duration: 0.3, delay: idx * 0.05 },
                          opacity: { duration: 0.3, delay: idx * 0.05 },
                          y: {
                            duration: 3.2 + (idx % 4) * 0.7,
                            repeat: Infinity,
                            repeatType: "reverse",
                            ease: "easeInOut",
                            delay: (idx % 5) * 0.35,
                          },
                        }}
                        whileHover={{ scale: 1.02, y: -8, transition: { duration: 0.2 } }}
                        className="break-inside-avoid mb-6"
                      >
                        <div className="group relative w-full rounded-2xl bg-zinc-950/40 backdrop-blur-xl border border-white/10 hover:border-white/20 p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-white/5 overflow-hidden">
                          {/* Subtle top glare glow */}
                          <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all duration-500" />
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                          <div className="space-y-4 relative z-10">
                            {/* Header row with avatar circle */}
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 flex items-center justify-center font-bold text-white text-sm shadow-inner group-hover:border-white/20 transition-all shrink-0">
                                {stranger.username.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-base font-bold text-white group-hover:text-zinc-100 transition-colors truncate">
                                  @{stranger.username}
                                </h3>
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                                  Anonymous Soul
                                </span>
                              </div>
                            </div>

                            {/* Bio statement */}
                            <div className="relative pt-1">
                              <p className="text-zinc-300 text-sm leading-relaxed font-normal whitespace-pre-line">
                                {stranger.bio ? `"${stranger.bio}"` : "No public bio provided."}
                              </p>
                            </div>
                          </div>

                          {/* Connect Action Button */}
                          <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
                            <Button
                              onClick={() => handleConnect(stranger._id)}
                              disabled={sendingRequestIds.has(stranger._id)}
                              className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:border-white/30 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-2 py-5 rounded-xl font-medium shadow-sm group/btn"
                            >
                              {sendingRequestIds.has(stranger._id) ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                  <span>Sending Request...</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4 text-zinc-300 group-hover/btn:scale-110 transition-transform" />
                                  <span>Connect</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* INBOX TAB */}
            {activeTab === "inbox" && (
              <motion.div
                key="inbox-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {isLoadingInbox ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Card key={i} className="border-white/5 bg-white/5 rounded-2xl p-6 space-y-4">
                        <Skeleton className="h-6 w-1/3 bg-white/10 animate-pulse" />
                        <Skeleton className="h-4 w-2/3 bg-white/10 animate-pulse" />
                      </Card>
                    ))}
                  </div>
                ) : inboxError ? (
                  <div className="text-center py-16 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <p className="text-gray-300">Failed to load connection requests.</p>
                    <Button onClick={fetchInbox} size="sm" variant="outline" className="border-white/10">
                      Retry
                    </Button>
                  </div>
                ) : inboxRequests.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <Inbox className="w-16 h-16 text-gray-500 mx-auto" />
                    <h3 className="text-lg font-bold">Your inbox is empty</h3>
                    <p className="text-gray-400 max-w-sm mx-auto text-sm">
                      When people send you connection requests, they&apos;ll show up here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inboxRequests.map((request) => (
                      <motion.div
                        key={request._id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card className="border border-white/5 bg-white/5 backdrop-blur-md rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-primary to-transparent opacity-50" />
                          
                          <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-white">@{request.sender?.username || "Unknown"}</h3>
                              <Badge className="bg-primary/20 text-primary border-none">Incoming Request</Badge>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed">
                              {request.sender?.bio || "No bio description provided."}
                            </p>
                            <p className="text-gray-600 text-xs">
                              Received on {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex w-full md:w-auto gap-3 shrink-0">
                            <Button
                              onClick={() => handleRequestAction(request._id, "accept")}
                              disabled={actingRequestIds.has(request._id)}
                              className="flex-1 md:flex-initial bg-primary text-black hover:bg-primary/80 disabled:opacity-50 py-5 px-6 rounded-xl flex items-center justify-center gap-2 font-medium"
                            >
                              {actingRequestIds.has(request._id) ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                              Accept
                            </Button>
                            <Button
                              onClick={() => handleRequestAction(request._id, "decline")}
                              disabled={actingRequestIds.has(request._id)}
                              variant="outline"
                              className="flex-1 md:flex-initial border-white/10 text-white hover:bg-white/5 disabled:opacity-50 py-5 px-6 rounded-xl flex items-center justify-center gap-2 font-medium"
                            >
                              <X className="w-4 h-4" />
                              Decline
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* SENT REQUESTS TAB */}
            {activeTab === "sent" && (
              <motion.div
                key="sent-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {isLoadingSent ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <Card key={i} className="border-white/5 bg-white/5 rounded-2xl p-6 space-y-4">
                        <Skeleton className="h-6 w-1/3 bg-white/10 animate-pulse" />
                        <Skeleton className="h-4 w-2/3 bg-white/10 animate-pulse" />
                      </Card>
                    ))}
                  </div>
                ) : sentError ? (
                  <div className="text-center py-16 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
                    <p className="text-gray-300">Failed to load sent connection requests.</p>
                    <Button onClick={fetchSent} size="sm" variant="outline" className="border-white/10">
                      Retry
                    </Button>
                  </div>
                ) : sentRequests.length === 0 ? (
                  <div className="text-center py-20 bg-white/5 border border-white/5 rounded-2xl space-y-4">
                    <Send className="w-16 h-16 text-gray-500 mx-auto" />
                    <h3 className="text-lg font-bold">No outgoing requests</h3>
                    <p className="text-gray-400 max-w-sm mx-auto text-sm">
                      You haven&apos;t sent any pending connection requests yet. Explore profiles and connect!
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden">
                    {sentRequests.map((request) => (
                      <motion.div
                        key={request._id}
                        layout
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 border border-white/10">
                            {(request.receiver?.username || "U").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white truncate">
                                @{request.receiver?.username || "Unknown"}
                              </span>
                              <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                Pending
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {request.receiver?.bio || `Sent on ${new Date(request.createdAt).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeRequest(request._id)}
                          disabled={revokingRequestIds.has(request._id)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {revokingRequestIds.has(request._id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Undo2 className="w-3.5 h-3.5" />
                          )}
                          <span>Revoke</span>
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
        </div>

      </div>
    </div>
  );
}
