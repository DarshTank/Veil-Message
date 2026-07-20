"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  MessageSquare,
  Search,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Compass,
  Trash2,
  RefreshCcw,
  MoreVertical,
  Pin,
  PinOff,
  User,
  KeyRound,
  Flag,
  Eye,
  EyeOff
} from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import { useE2ee } from "@/context/E2eeContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { AxiosError } from "axios";

dayjs.extend(relativeTime);

interface ChatItem {
  _id: string;
  chatRoomId: string;
  isArchived: boolean;
  partner: {
    _id: string;
    username: string;
    bio: string;
  };
  lastMessage: {
    content: string;
    timestamp: string;
    isMe: boolean;
    senderUsername: string;
  } | null;
  unreadCount: number;
  isOnline: boolean;
  connectedAt: string;
}

const formatMessageSnippet = (content: string) => {
  if (!content) return "";
  try {
    if (content.startsWith('{"type":"reply"')) {
      const parsed = JSON.parse(content);
      return parsed.text || content;
    }
  } catch (e) {
    // ignore
  }
  return content;
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const activeRoomId = params?.roomId as string | undefined;

  const [chats, setChats] = useState<ChatItem[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  
  // Local storage pinned chats state
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([]);
  
  // Active dialog states
  const [deletingChat, setDeletingChat] = useState<ChatItem | null>(null);
  const [reportingUsername, setReportingUsername] = useState<string | null>(null);

  const userStatus = session?.user?.status as
    | "active"
    | "suspended"
    | "banned"
    | undefined;
  const isRestricted = userStatus === "suspended" || userStatus === "banned";

  useEffect(() => {
    if (session?.user?.role === "super-admin") {
      router.replace("/admin");
    }
  }, [session, router]);

  // E2EE hooks and states
  const {
    e2eeStatus,
    setupE2ee,
    unlockE2ee,
    getOrDecryptRoomKey,
    decryptMessageContent,
  } = useE2ee();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [decryptedLastMsgs, setDecryptedLastMsgs] = useState<Record<string, string>>({});

  // Setup / Unlock handlers
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError("PIN must be exactly 6 digits.");
      return;
    }
    setPinError("");
    setIsPinLoading(true);
    const success = await setupE2ee(pin);
    setIsPinLoading(false);
    if (success) {
      setPin("");
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d+$/.test(pin)) {
      setPinError("PIN must be exactly 6 digits.");
      return;
    }
    setPinError("");
    setIsPinLoading(true);
    const success = await unlockE2ee(pin);
    setIsPinLoading(false);
    if (success) {
      setPin("");
    }
  };

  // Decrypt last messages on the fly when chats load
  useEffect(() => {
    const decryptAllLastMessages = async () => {
      const newDecrypted: Record<string, string> = {};
      for (const chat of chats) {
        if (!chat.lastMessage) continue;
        const rawContent = chat.lastMessage.content;

        if (rawContent.startsWith('{"ciphertext":')) {
          try {
            const parsed = JSON.parse(rawContent);
            if (parsed && typeof parsed === "object" && parsed.ciphertext && parsed.iv) {
              const myRoomKey = (chat as any).myRoomKey;
              if (myRoomKey) {
                const aesKey = await getOrDecryptRoomKey(chat.chatRoomId, [
                  { userId: session?.user?._id as string, encryptedKey: myRoomKey },
                ]);
                if (aesKey) {
                  const decrypted = await decryptMessageContent(
                    chat.chatRoomId,
                    parsed.ciphertext,
                    parsed.iv,
                    aesKey
                  );
                  newDecrypted[chat.chatRoomId] = decrypted;
                }
              }
            }
          } catch {
            console.warn("Failed to parse sidebar message payload for chat:", chat.chatRoomId);
          }
        }
      }
      setDecryptedLastMsgs(newDecrypted);
    };

    if (e2eeStatus === "ready" && chats.length > 0) {
      decryptAllLastMessages();
    }
  }, [chats, e2eeStatus, getOrDecryptRoomKey, decryptMessageContent, session?.user?._id]);

  // Load pinned chats
  useEffect(() => {
    const pinned = localStorage.getItem("pinnedChats");
    if (pinned) {
      try {
        setPinnedChatIds(JSON.parse(pinned));
      } catch (e) {
        console.error("Failed to parse pinned chats", e);
      }
    }
  }, []);

  const handleTogglePin = (chatRoomId: string, username: string) => {
    setPinnedChatIds((prev) => {
      const next = prev.includes(chatRoomId)
        ? prev.filter((id) => id !== chatRoomId)
        : [...prev, chatRoomId];
      localStorage.setItem("pinnedChats", JSON.stringify(next));
      
      toast({
        title: prev.includes(chatRoomId) ? "Chat Unpinned" : "Chat Pinned",
        description: `@${username} has been ${prev.includes(chatRoomId) ? "unpinned" : "pinned"} to the top.`,
      });
      
      return next;
    });
  };

  const fetchChats = useCallback(async () => {
    if (isRestricted || status !== "authenticated") return;
    setIsLoading(true);
    setError(false);
    try {
      const res = await axios.get("/api/chat");
      if (res.data.success) {
        setChats(res.data.chats || []);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isRestricted, status]);

  useEffect(() => {
    if (status === "authenticated" && !isRestricted) {
      fetchChats();
    }
  }, [status, isRestricted, fetchChats]);

  // Poll for updates every 8 seconds
  useEffect(() => {
    if (status !== "authenticated" || isRestricted || isLoading || error) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get("/api/chat");
        if (res.data.success) {
          setChats(res.data.chats || []);
        }
      } catch {
        // silent fail on poll
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [status, isRestricted, isLoading, error]);

  // Filter and Sort chats (pinned first, then by last message timestamp)
  useEffect(() => {
    let list = chats;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = chats.filter(
        (chat) =>
          chat.partner.username.toLowerCase().includes(q) ||
          chat.lastMessage?.content.toLowerCase().includes(q)
      );
    }

    // Sort by pinned first, then by last message time
    const sorted = [...list].sort((a, b) => {
      const aPinned = pinnedChatIds.includes(a.chatRoomId);
      const bPinned = pinnedChatIds.includes(b.chatRoomId);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : new Date(a.connectedAt).getTime();
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : new Date(b.connectedAt).getTime();
      return bTime - aTime;
    });

    setFilteredChats(sorted);
  }, [chats, searchQuery, pinnedChatIds]);

  const handleRemoveConnection = async (connectionId: string) => {
    if (removingIds.has(connectionId)) return;
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.add(connectionId);
      return next;
    });

    try {
      const res = await axios.delete(`/api/connections/${connectionId}`);
      if (res.data.success) {
        toast({
          title: "Connection Removed",
          description: "Connection has been removed and chat archived.",
        });
        setChats((prev) => prev.filter((c) => c._id !== connectionId));
        setDeletingChat(null);
        // If the current active chat was deleted, go back to main chat list
        if (activeRoomId) {
          router.push("/chat");
        }
      }
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message =
        axiosError.response?.data?.message || "Failed to remove connection.";
      toast({
        title: "Action Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(connectionId);
        return next;
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = dayjs(timestamp);
    const now = dayjs();
    if (now.diff(date, "day") < 1) {
      return date.format("h:mm A");
    } else if (now.diff(date, "day") < 7) {
      return date.format("ddd");
    } else {
      return date.format("MMM D");
    }
  };

  // Loading Session State
  if (status === "loading") {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4 space-y-6">
        <Skeleton className="h-10 w-48 rounded-lg bg-white/5" />
        <Skeleton className="h-[400px] w-full max-w-4xl rounded-2xl bg-white/5" />
      </div>
    );
  }

  // Restricted account
  if (isRestricted) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-destructive/10 border border-destructive/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-md">
          <div className="p-4 bg-destructive/20 rounded-full text-destructive">
            <ShieldAlert className="w-16 h-16 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Account Restricted
          </h1>
          <p className="text-gray-400 text-lg max-w-md">
            Your account status is currently{" "}
            <span className="font-semibold text-destructive uppercase tracking-wider">
              {userStatus}
            </span>
            . Chat features are restricted.
          </p>
        </div>
      </div>
    );
  }

  // E2EE Setup screen
  if (e2eeStatus === "setup_needed" && status === "authenticated" && !isRestricted) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
        <div className="glass-card p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-6 relative overflow-hidden bg-zinc-950/40 backdrop-blur-xl w-full max-w-md">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="p-4 bg-primary/10 rounded-full text-primary border border-primary/20">
            <ShieldAlert className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Secure Your Chats</h2>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Veil uses End-to-End Encryption. Create a 6-digit Chat PIN to secure your private keys.
            </p>
          </div>
          <form onSubmit={handleSetup} className="w-full space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={6}
                  placeholder="Create 6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-center text-xl tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pinError && <p className="text-destructive text-[10px] text-left px-1">{pinError}</p>}
            </div>
            <Button
              type="submit"
              disabled={isPinLoading || pin.length !== 6}
              className="w-full bg-primary text-black hover:bg-primary/80 py-5 rounded-xl font-bold transition-all flex items-center justify-center"
            >
              {isPinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate E2EE"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // E2EE Unlock screen
  if (e2eeStatus === "unlock_needed" && status === "authenticated" && !isRestricted) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
        <div className="glass-card p-8 rounded-2xl border border-white/5 flex flex-col items-center text-center space-y-6 relative overflow-hidden bg-zinc-950/40 backdrop-blur-xl w-full max-w-md">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
            <KeyRound className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Unlock Private Chats</h2>
            <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
              Enter your 6-digit Chat PIN to load your keys and decrypt your conversations.
            </p>
          </div>
          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div className="space-y-1">
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full text-center text-xl tracking-widest py-3 bg-white/5 border border-white/5 rounded-xl text-white placeholder:text-gray-500 placeholder:tracking-normal focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pinError && <p className="text-destructive text-[10px] text-left px-1">{pinError}</p>}
            </div>
            <Button
              type="submit"
              disabled={isPinLoading || pin.length !== 6}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-500/80 py-5 rounded-xl font-bold transition-all flex items-center justify-center"
            >
              {isPinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Loading E2EE key state
  if (e2eeStatus === "loading" && status === "authenticated" && !isRestricted) {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-zinc-500 text-xs mt-3">Initializing secure connection...</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-3.5rem)] flex border-t border-white/5 bg-zinc-950/40 backdrop-blur-xl relative overflow-hidden">
        {/* Top lighting divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        {/* Left Sidebar: Conversations List */}
        <div
          className={`${
            activeRoomId ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-96 flex-col border-r border-white/5 bg-zinc-950/40 h-full shrink-0`}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between shrink-0 border-b border-white/5">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
                Chats
              </h1>
              <p className="text-gray-500 text-[10px]">
                {chats.length} conversation{chats.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={fetchChats}
                disabled={isLoading}
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white p-2 h-8 w-8"
              >
                <RefreshCcw
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </Button>
              <Link href="/discover">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/10 text-white hover:bg-white/5 gap-1 px-2.5 rounded-lg text-xs"
                >
                  <Compass className="w-3 h-3" />
                  <span>Discover</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/5 rounded-lg text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-white/10 focus:border-white/10 transition-all"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-white/5">
            {isLoading && chats.length === 0 ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/5 shrink-0" />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <Skeleton className="h-3 w-1/3 bg-white/5" />
                    <Skeleton className="h-2.5 w-2/3 bg-white/5" />
                  </div>
                </div>
              ))
            ) : error && chats.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-xs text-gray-400">Failed to load chats.</p>
                <Button
                  onClick={fetchChats}
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/10 text-xs"
                >
                  Retry
                </Button>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="text-center py-16 px-4 flex flex-col items-center justify-center space-y-4">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400 font-medium">
                  {searchQuery ? "No matching chats" : "No chats yet"}
                </p>
                {!searchQuery && (
                  <div className="pt-2">
                    <Link href="/discover">
                      <Button className="h-9 bg-primary text-black hover:bg-primary/90 px-4 rounded-xl text-xs font-semibold shadow-sm transition-all">
                        Discover Strangers
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = chat.chatRoomId === activeRoomId;
                const isPinned = pinnedChatIds.includes(chat.chatRoomId);
                const effectiveUnreadCount = isSelected ? 0 : chat.unreadCount;

                return (
                  <div
                    key={chat._id}
                    className={`group flex items-center justify-between transition-all duration-150 relative ${
                      isSelected
                        ? "bg-white/[0.08]"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <button
                      onClick={() => router.push(`/chat/${chat.chatRoomId}`)}
                      className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
                    >
                      {/* Avatar with online indicator */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            effectiveUnreadCount > 0
                              ? "bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary"
                              : "bg-white/5 text-gray-400"
                          }`}
                        >
                          {chat.partner.username.charAt(0).toUpperCase()}
                        </div>
                        {chat.isOnline && !chat.isArchived && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3
                            className={`font-semibold text-xs truncate flex items-center gap-1.5 ${
                              effectiveUnreadCount > 0
                                ? "text-white"
                                : "text-gray-300"
                            }`}
                          >
                            @{chat.partner.username}
                            {isPinned && (
                              <Pin className="w-2.5 h-2.5 text-primary rotate-45 shrink-0" />
                            )}
                          </h3>
                          {chat.lastMessage && (
                            <span
                              className={`text-[10px] shrink-0 ${
                                effectiveUnreadCount > 0
                                  ? "text-primary font-semibold"
                                  : "text-gray-600"
                              }`}
                            >
                              {formatTime(chat.lastMessage.timestamp)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <p
                            className={`text-[11px] truncate ${
                              effectiveUnreadCount > 0
                                ? "text-gray-300 font-medium"
                                : "text-gray-500"
                            }`}
                          >
                            {chat.isArchived ? (
                              <span className="text-destructive/70 italic text-[10px]">
                                Connection removed
                              </span>
                            ) : chat.lastMessage ? (
                              <>
                                {chat.lastMessage.isMe && (
                                  <span className="text-gray-600">You: </span>
                                )}
                                {decryptedLastMsgs[chat.chatRoomId] ? (
                                  (() => {
                                    const cleanText = formatMessageSnippet(decryptedLastMsgs[chat.chatRoomId]);
                                    return cleanText.length > 45 ? cleanText.substring(0, 45) + "…" : cleanText;
                                  })()
                                ) : chat.lastMessage.content.startsWith('{"ciphertext":') ? (
                                  <span className="text-zinc-500 italic flex items-center gap-1">
                                    <KeyRound className="w-2.5 h-2.5 inline text-zinc-500" /> Encrypted message
                                  </span>
                                ) : (
                                  (() => {
                                    const cleanText = formatMessageSnippet(chat.lastMessage.content);
                                    return cleanText.length > 45 ? cleanText.substring(0, 45) + "…" : cleanText;
                                  })()
                                )}
                              </>
                            ) : (
                              <span className="italic text-gray-600">
                                No messages yet — say hi!
                              </span>
                            )}
                          </p>

                          {/* Unread badge */}
                          {effectiveUnreadCount > 0 && !chat.isArchived && (
                            <span className="shrink-0 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-black">
                              {effectiveUnreadCount > 99
                                ? "99+"
                                : effectiveUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Three dot actions dropdown */}
                    <div className="pr-2 shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="p-1 h-8 w-8 text-gray-400 hover:text-white rounded-lg"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/u/${chat.partner.username}`)
                            }
                            className="hover:bg-white/5 rounded-lg gap-2 cursor-pointer text-xs"
                          >
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>View Profile</span>
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() =>
                              handleTogglePin(chat.chatRoomId, chat.partner.username)
                            }
                            className="hover:bg-white/5 rounded-lg gap-2 cursor-pointer text-xs"
                          >
                            {isPinned ? (
                              <>
                                <PinOff className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Unpin Chat</span>
                              </>
                            ) : (
                              <>
                                <Pin className="w-3.5 h-3.5 text-zinc-400" />
                                <span>Pin Chat</span>
                              </>
                            )}
                          </DropdownMenuItem>

                          {!chat.isArchived && (
                            <DropdownMenuItem
                              onClick={() => setDeletingChat(chat)}
                              className="hover:bg-destructive/10 hover:text-destructive rounded-lg gap-2 cursor-pointer text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Chat</span>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={() => setReportingUsername(chat.partner.username)}
                            className="hover:bg-rose-500/10 hover:text-rose-400 rounded-lg gap-2 cursor-pointer text-xs"
                          >
                            <Flag className="w-3.5 h-3.5 text-rose-400" />
                            <span>Report User</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Content Area */}
        <div
          className={`${
            activeRoomId ? "flex" : "hidden md:flex"
          } flex-1 h-full flex-col min-w-0 bg-zinc-950/20`}
        >
          {children}
        </div>
      </div>

      {/* Report User Modal */}
      <ReportUserModal
        isOpen={reportingUsername !== null}
        onClose={() => setReportingUsername(null)}
        reportedUsername={reportingUsername || ""}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={deletingChat !== null}
        onOpenChange={(open) => !open && setDeletingChat(null)}
      >
        <AlertDialogContent className="bg-zinc-950 border border-white/10 text-white rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">
              Remove Connection?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400 text-sm">
              Are you sure you want to remove @
              {deletingChat?.partner.username}? Your chat history will be
              preserved in read-only mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingChat) {
                  handleRemoveConnection(deletingChat._id);
                }
              }}
              disabled={deletingChat ? removingIds.has(deletingChat._id) : false}
              className="bg-destructive text-white hover:bg-destructive/80 rounded-xl"
            >
              {deletingChat && removingIds.has(deletingChat._id) ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
