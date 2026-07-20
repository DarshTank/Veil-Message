"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useRef, use, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import dayjs from "dayjs";
import { 
  Send, 
  ArrowLeft, 
  Trash2, 
  Loader2, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  RefreshCcw,
  MessageSquare,
  Check,
  MoreVertical,
  Pin,
  PinOff,
  User,
  X,
  Reply,
  KeyRound,
  Flag
} from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import { useE2ee } from "@/context/E2eeContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

const parseMessageContent = (content: string) => {
  try {
    if (content.startsWith('{"type":"reply"')) {
      const parsed = JSON.parse(content);
      return {
        isReply: true,
        replyToSender: parsed.replyToSender as string,
        replyToContent: parsed.replyToContent as string,
        text: parsed.text as string,
      };
    }
  } catch (e) {
    // ignore
  }
  return {
    isReply: false,
    replyToSender: "",
    replyToContent: "",
    text: content,
  };
};

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  tenderized?: string;
  toxicityScore?: number;
  toxicityLevel?: string;
  mood?: string;
  createdAt: string;
  status?: "pending" | "failed" | "sent";
}

interface ChatRoomPageProps {
  params: Promise<{ roomId: string }>;
}

export default function ChatRoomPage({ params }: ChatRoomPageProps) {
  const { roomId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partnerUsername, setPartnerUsername] = useState("Stranger");
  const [isArchived, setIsArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(null);
  const [partnerStatus, setPartnerStatus] = useState("");
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const lastTypingPingRef = useRef<number>(0);

  // E2EE States and hooks
  const {
    getOrDecryptRoomKey,
    decryptMessageContent,
    encryptMessageContent,
    setupRoomKey,
    e2eeStatus,
  } = useE2ee();
  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});

  const decryptMessageList = useCallback(async (msgs: ChatMessage[]) => {
    const isShieldEnabled = session?.user?.isShieldEnabled;
    const newDecrypted = { ...decryptedMessages };
    let changed = false;

    for (const msg of msgs) {
      if (newDecrypted[msg._id]) continue;

      const content = msg.content;
      if (content.startsWith('{"ciphertext":')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed && typeof parsed === "object" && parsed.ciphertext && parsed.iv) {
            let decrypted = await decryptMessageContent(roomId, parsed.ciphertext, parsed.iv);

            // Empathy Shield decryption check
            if (isShieldEnabled && msg.tenderized && msg.tenderized.startsWith('{"ciphertext":')) {
              try {
                const parsedTenderized = JSON.parse(msg.tenderized);
                if (parsedTenderized && typeof parsedTenderized === "object" && parsedTenderized.ciphertext && parsedTenderized.iv) {
                  const decryptedTenderized = await decryptMessageContent(
                    roomId,
                    parsedTenderized.ciphertext,
                    parsedTenderized.iv
                  );
                  if (decryptedTenderized) {
                    decrypted = decryptedTenderized;
                  }
                }
              } catch {
                console.warn("Failed to parse tenderized content for message:", msg._id);
              }
            }

            newDecrypted[msg._id] = decrypted;
            changed = true;
          }
        } catch {
          console.warn("Failed to parse message content for message:", msg._id);
        }
      }
    }

    if (changed) {
      setDecryptedMessages(newDecrypted);
    }
  }, [roomId, decryptedMessages, decryptMessageContent, session?.user?.isShieldEnabled]);

  useEffect(() => {
    if (messages.length > 0 && e2eeStatus === "ready") {
      decryptMessageList(messages);
    }
  }, [messages, e2eeStatus, decryptMessageList]);

  const [isPinned, setIsPinned] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  useEffect(() => {
    const checkPinned = () => {
      const pinned = localStorage.getItem("pinnedChats");
      if (pinned) {
        try {
          const list = JSON.parse(pinned) as string[];
          setIsPinned(list.includes(roomId));
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkPinned();
    
    window.addEventListener("pinnedChatsUpdated", checkPinned);
    return () => window.removeEventListener("pinnedChatsUpdated", checkPinned);
  }, [roomId]);

  const handleTogglePin = () => {
    const pinned = localStorage.getItem("pinnedChats");
    let list: string[] = [];
    if (pinned) {
      try {
        list = JSON.parse(pinned);
      } catch (e) {
        console.error(e);
      }
    }
    
    const nextList = list.includes(roomId)
      ? list.filter((id) => id !== roomId)
      : [...list, roomId];
      
    localStorage.setItem("pinnedChats", JSON.stringify(nextList));
    setIsPinned(nextList.includes(roomId));
    
    toast({
      title: list.includes(roomId) ? "Chat Unpinned" : "Chat Pinned",
      description: `@${partnerUsername} has been ${list.includes(roomId) ? "unpinned" : "pinned"} to the top.`,
    });
    
    window.dispatchEvent(new Event("pinnedChatsUpdated"));
  };

  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: ChatMessage } | null>(null);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("contextmenu", handleClose);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("contextmenu", handleClose);
    };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, message: ChatMessage) => {
    if (isArchived) return; // Prevent actions if connection is removed
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const isMe = message.sender._id === session?.user?._id;
    
    let x = rect.left;
    let y = rect.bottom + 4; // 4px gap below the bubble
    
    if (isMe) {
      x = rect.right - 160; // 160px is context menu width
    }
    
    // Boundary check
    if (x < 10) x = 10;
    if (x + 160 > window.innerWidth) {
      x = window.innerWidth - 170;
    }
    
    const menuHeight = isMe ? 85 : 45;
    if (y + menuHeight > window.innerHeight) {
      y = rect.top - menuHeight - 4; // Position above the bubble
    }

    setContextMenu({ x, y, message });
  };

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent, message: ChatMessage) => {
    if (isArchived) return;
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    
    const currentTarget = e.currentTarget;
    
    touchTimerRef.current = setTimeout(() => {
      const rect = currentTarget.getBoundingClientRect();
      const isMe = message.sender._id === session?.user?._id;
      
      let x = rect.left;
      let y = rect.bottom + 4;
      
      if (isMe) {
        x = rect.right - 160;
      }
      
      if (x < 10) x = 10;
      if (x + 160 > window.innerWidth) {
        x = window.innerWidth - 170;
      }
      
      const menuHeight = isMe ? 85 : 45;
      if (y + menuHeight > window.innerHeight) {
        y = rect.top - menuHeight - 4;
      }
      
      setContextMenu({ x, y, message });
    }, 600);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
  };

  const handleInitiateReply = (message: ChatMessage) => {
    setReplyingToMessage(message);
    setContextMenu(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await axios.delete(`/api/chat/${roomId}/messages?messageId=${messageId}`);
      if (res.data.success) {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
        toast({
          title: "Message Deleted",
          description: "Message has been deleted permanently.",
        });
      }
    } catch {
      toast({
        title: "Delete Failed",
        description: "Failed to delete message.",
        variant: "destructive",
      });
    }
  };

  // Send state
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Refs for polling and scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const oldestTimestampRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const userStatus = session?.user?.status as "active" | "suspended" | "banned" | undefined;
  const isRestricted = userStatus === "suspended" || userStatus === "banned";

  const sendTypingPing = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingPingRef.current > 800) {
      lastTypingPingRef.current = now;
      axios.post(`/api/chat/${roomId}/typing`).catch(() => {});
    }
  }, [roomId]);

  useEffect(() => {
    if (isPartnerTyping && isAtBottomRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [isPartnerTyping]);

  const fetchInitialMessages = useCallback(async () => {
    if (isRestricted || status !== "authenticated") return;
    setIsLoading(true);
    setError(false);
    try {
      const res = await axios.get(`/api/chat/${roomId}/messages?limit=50`);
      if (res.data.success) {
        const initialMsgs = res.data.messages || [];
        setMessages(initialMsgs);
        setIsArchived(res.data.isArchived);
        setPartnerUsername(res.data.partnerUsername || "Stranger");
        setHasMore(res.data.hasMore);
        setPartnerLastReadAt(res.data.partnerLastReadAt || null);
        setPartnerStatus(res.data.partnerStatus || "");
        if (res.data.isPartnerTyping !== undefined) {
          setIsPartnerTyping(Boolean(res.data.isPartnerTyping));
        }

        // Setup E2EE Room Key if not already present
        const keyList = res.data.roomKeys || [];
        const partnerPub = res.data.partnerPublicKey;
        const partnerId = res.data.partnerId;

        let aesKey = await getOrDecryptRoomKey(roomId, keyList);
        if (!aesKey && partnerPub && partnerId) {
          aesKey = await setupRoomKey(roomId, partnerId, partnerPub);
        }

        if (initialMsgs.length > 0) {
          lastTimestampRef.current = initialMsgs[initialMsgs.length - 1].createdAt;
          oldestTimestampRef.current = initialMsgs[0].createdAt;
          
          // Mark room as read
          await axios.post(`/api/chat/${roomId}/read`, {
            lastMessageTimestamp: lastTimestampRef.current,
          });
        }
        
        // Scroll to bottom
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isRestricted, status, roomId, getOrDecryptRoomKey, setupRoomKey]);

  // Track if tab/window is open and active
  const [isTabActive, setIsTabActive] = useState(true);

  useEffect(() => {
    const handleFocus = () => setIsTabActive(true);
    const handleBlur = () => setIsTabActive(false);
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === "visible");
    };

    // Initialize state
    setIsTabActive(document.visibilityState === "visible" && document.hasFocus());

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated" && !isRestricted) {
      fetchInitialMessages();
    }
  }, [status, isRestricted, fetchInitialMessages]);

  // Polling for new messages (every 2 seconds if open & active, else every 10 seconds)
  useEffect(() => {
    if (isRestricted || status !== "authenticated" || isArchived || isLoading || error) return;

    const intervalDuration = isTabActive ? 1000 : 8000;

    const interval = setInterval(async () => {
      try {
        const after = lastTimestampRef.current;
        const url = `/api/chat/${roomId}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`;
        const res = await axios.get(url);

        if (res.data.success) {
          const newMsgs = res.data.messages || [];
          const activeMessageIds = res.data.activeMessageIds || [];
          setIsArchived(res.data.isArchived);
          setPartnerLastReadAt(res.data.partnerLastReadAt || null);
          setPartnerStatus(res.data.partnerStatus || "");
          if (res.data.isPartnerTyping !== undefined) {
            setIsPartnerTyping(Boolean(res.data.isPartnerTyping));
          }

          setMessages((prev) => {
            let updated = prev;
            if (activeMessageIds.length > 0) {
              updated = prev.filter(
                (m) => m.status === "pending" || m.status === "failed" || activeMessageIds.includes(m._id)
              );
            }

            if (newMsgs.length > 0) {
              const existingIds = new Set(updated.map((m) => m._id));
              const filteredNew = newMsgs.filter((m: ChatMessage) => !existingIds.has(m._id));
              
              const cleanedPrev = updated.filter(
                (m) => !(m.status === "pending" && filteredNew.some((fn: ChatMessage) => fn.content === m.content))
              );
              
              return [...cleanedPrev, ...filteredNew];
            }
            return updated;
          });

          if (newMsgs.length > 0) {
            lastTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt;

            // Mark as read
            await axios.post(`/api/chat/${roomId}/read`, {
              lastMessageTimestamp: lastTimestampRef.current,
            });

            // Scroll if near bottom
            if (isAtBottomRef.current && scrollContainerRef.current) {
              setTimeout(() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }
              }, 50);
            }
          }
        }
      } catch (err: unknown) {
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 403) {
          setIsArchived(true);
        }
      }
    }, intervalDuration);

    return () => clearInterval(interval);
  }, [status, isRestricted, isArchived, isLoading, error, roomId, isTabActive]);

  // Handle scroll detection and infinite loading (older messages)
  const handleScroll = async () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    // Check if user is near bottom
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    // Trigger loading older messages when scrolling to top
    if (el.scrollTop === 0 && hasMore && !loadingMoreRef.current && oldestTimestampRef.current) {
      loadingMoreRef.current = true;
      const oldScrollHeight = el.scrollHeight;

      try {
        const res = await axios.get(
          `/api/chat/${roomId}/messages?before=${encodeURIComponent(oldestTimestampRef.current)}&limit=50`
        );
        if (res.data.success) {
          const olderMsgs = res.data.messages || [];
          if (olderMsgs.length > 0) {
            setMessages((prev) => [...olderMsgs, ...prev]);
            oldestTimestampRef.current = olderMsgs[0].createdAt;
            setHasMore(res.data.hasMore);

            // Restore scroll position
            setTimeout(() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop =
                  scrollContainerRef.current.scrollHeight - oldScrollHeight;
              }
            }, 50);
          } else {
            setHasMore(false);
          }
        }
      } catch (err) {
        console.error("Failed to load older messages", err);
      } finally {
        loadingMoreRef.current = false;
      }
    }
  };

  const getCleanQuotedText = (msg: ChatMessage) => {
    const decrypted = decryptedMessages[msg._id];
    let text = "";
    if (decrypted) {
      text = parseMessageContent(decrypted).text;
    } else {
      text = parseMessageContent(msg.content).text;
    }
    if (text.startsWith('{"ciphertext":')) {
      return "Encrypted message";
    }
    return text;
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent, retryMsg?: ChatMessage) => {
    if (e) e.preventDefault();
    
    let plaintextToSend = "";
    if (retryMsg) {
      plaintextToSend = decryptedMessages[retryMsg._id] || retryMsg.content;
    } else {
      if (replyingToMessage) {
        const quotedText = getCleanQuotedText(replyingToMessage);

        plaintextToSend = JSON.stringify({
          type: "reply",
          replyToSender: replyingToMessage.sender.username,
          replyToContent: quotedText.length > 80 ? quotedText.slice(0, 80) + "..." : quotedText,
          text: inputMessage.trim(),
        });
      } else {
        plaintextToSend = inputMessage.trim();
      }
    }
    
    if (!plaintextToSend.trim() || isSending) return;

    const tempId = retryMsg ? retryMsg._id : Math.random().toString();
    const optimisticMsg: ChatMessage = {
      _id: tempId,
      sender: {
        _id: session?.user?._id || "",
        username: session?.user?.username || "",
      },
      content: "[Encrypting message...]",
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    if (retryMsg) {
      setMessages((prev) =>
        prev.map((m) => (m._id === retryMsg._id ? { ...m, status: "pending" } : m))
      );
    } else {
      setDecryptedMessages((prev) => ({ ...prev, [tempId]: plaintextToSend }));
      setMessages((prev) => [...prev, optimisticMsg]);
      setInputMessage("");
      setReplyingToMessage(null);
    }

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 50);

    try {
      setIsSending(true);

      // 1. Moderate original message text transiently
      const textToModerate = replyingToMessage ? inputMessage.trim() : plaintextToSend;
      const modRes = await axios.post("/api/chat/moderate", { content: textToModerate });
      const analysis = modRes.data.analysis || { mood: "curious", toxicityScore: 0, toxicityLevel: "clean", tenderized: "" };

      // 2. Encrypt original content
      const encPayload = await encryptMessageContent(roomId, plaintextToSend);
      const encryptedContentStr = JSON.stringify(encPayload);

      // 3. Encrypt tenderized content if toxic
      let encryptedTenderizedStr = "";
      if (analysis.tenderized) {
        let tenderizedPlaintext = analysis.tenderized;
        if (replyingToMessage) {
          const quotedText = getCleanQuotedText(replyingToMessage);

          tenderizedPlaintext = JSON.stringify({
            type: "reply",
            replyToSender: replyingToMessage.sender.username,
            replyToContent: quotedText.length > 80 ? quotedText.slice(0, 80) + "..." : quotedText,
            text: analysis.tenderized,
          });
        }
        const encTenderizedPayload = await encryptMessageContent(roomId, tenderizedPlaintext);
        encryptedTenderizedStr = JSON.stringify(encTenderizedPayload);
      }

      // 4. Send to server
      const res = await axios.post(`/api/chat/${roomId}/messages`, {
        content: encryptedContentStr,
        tenderized: encryptedTenderizedStr,
        toxicityScore: analysis.toxicityScore,
        toxicityLevel: analysis.toxicityLevel,
        mood: analysis.mood,
      });

      if (res.data.success) {
        const sentMsg = res.data.message;
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...sentMsg, status: "sent" } : m))
        );
        setDecryptedMessages((prev: Record<string, string>) => {
          const next: Record<string, string> = { ...prev, [sentMsg._id]: plaintextToSend };
          delete next[tempId];
          return next;
        });
        lastTimestampRef.current = sentMsg.createdAt;
      }
    } catch (err: unknown) {
      console.error(err);
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        setIsArchived(true);
        toast({
          title: "Connection Removed",
          description: "This connection has been removed. The chat is now read-only.",
          variant: "destructive",
        });
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  // Remove connection action from inside chat room
  const handleRemove = async () => {
    try {
      // We must get my connection ID first. Let's look it up or perform delete directly.
      // Wait, DELETE /api/connections/[id] requires the connection ID.
      // Let's call a DELETE request with the chat room ID instead?
      // Wait, the API spec says DELETE /api/connections/[id] is the connection ID.
      // Can we also find the connection by chat room?
      // Let's check the API: standard is to query GET /api/connections, find the match, then delete.
      // Or we can modify DELETE /api/connections/[id] to accept either connectionId or chatRoomId!
      // Let's check what we implemented in d:\JavaScript\veil\src\app\api\connections\[id]\route.ts:
      // "const myConn = await ConnectionModel.findOne({ _id: connectionId, userId })"
      // Wait, is connectionId an ObjectId of the Connection model, or can we search by chatRoomId?
      // Since it's a specific route `DELETE /api/connections/[id]`, if we pass the chatRoomId, it won't match `_id: connectionId`.
      // Let's fetch the connections list, locate the one with this chatRoomId, and delete it!
      // That's a perfect client-side lookup. Let's do that!
      const connRes = await axios.get("/api/connections");
      const currentConn = connRes.data.connections?.find((c: { chatRoomId: string; _id: string }) => c.chatRoomId === roomId);
      if (currentConn) {
        const res = await axios.delete(`/api/connections/${(currentConn as { _id: string })._id}`);
        if (res.data.success) {
          setIsArchived(true);
          toast({
            title: "Connection Removed",
            description: "Connection has been removed and chat archived.",
          });
        }
      }
    } catch {
      toast({
        title: "Action Failed",
        description: "Failed to remove connection.",
        variant: "destructive",
      });
    }
  };

  // Loading Session State
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black text-white pt-24 px-6 md:px-12 flex flex-col items-center">
        <div className="w-full max-w-4xl space-y-8">
          <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-[400px] bg-white/5 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Suspended or Banned Notice
  if (isRestricted) {
    return (
      <div className="min-h-screen bg-black text-white pt-28 px-6 md:px-12 flex flex-col items-center">
        <div className="w-full max-w-2xl bg-destructive/10 border border-destructive/20 rounded-2xl p-8 flex flex-col items-center text-center space-y-6 backdrop-blur-md">
          <div className="p-4 bg-destructive/20 rounded-full text-destructive">
            <ShieldAlert className="w-16 h-16 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Account Restricted</h1>
          <p className="text-gray-400 text-lg max-w-md">
            Your account status is currently <span className="font-semibold text-destructive uppercase tracking-wider">{userStatus}</span>. Chat features are restricted.
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
    <div className="w-full h-full flex flex-col relative">
        
        {/* Top lighting divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Chat Room Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push("/chat")}
              variant="ghost"
              className="text-gray-400 hover:text-white p-2 rounded-lg md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-white">@{partnerUsername}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 min-h-[1.25rem]">
                {isArchived ? (
                  <span className="text-destructive font-medium uppercase tracking-wider">Archived / Read-Only</span>
                ) : isPartnerTyping ? (
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5 animate-pulse">
                    <span>typing</span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1 h-1 rounded-full bg-zinc-400 animate-bounce" />
                    </span>
                  </span>
                ) : partnerStatus === "online" ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-400 hover:text-white p-2 rounded-lg shrink-0">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-950 border border-white/10 text-white rounded-xl">
                <DropdownMenuItem
                  onClick={() => router.push(`/u/${partnerUsername}`)}
                  className="hover:bg-white/5 rounded-lg gap-2 cursor-pointer text-xs"
                >
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>View Profile</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem
                  onClick={handleTogglePin}
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

                {!isArchived && (
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="hover:bg-destructive/10 hover:text-destructive rounded-lg gap-2 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Chat</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => setIsReportDialogOpen(true)}
                  className="hover:bg-rose-500/10 hover:text-rose-400 rounded-lg gap-2 cursor-pointer text-xs"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>Report User</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Report User Modal */}
            <ReportUserModal
              isOpen={isReportDialogOpen}
              onClose={() => setIsReportDialogOpen(false)}
              reportedUsername={partnerUsername}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogContent className="bg-zinc-950 border border-white/10 text-white rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-bold">Remove Connection?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400 text-sm">
                    Are you sure you want to remove this connection? Your chat history will be preserved in read-only mode, and you will not be able to send new messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      handleRemove();
                      setIsDeleteDialogOpen(false);
                    }}
                    className="bg-destructive text-white hover:bg-destructive/80 rounded-xl"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Message Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-zinc-950/20"
        >
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                  <Skeleton className="h-12 w-1/3 bg-white/5 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 space-y-4">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <p className="text-gray-400">Failed to load chat history.</p>
              <Button onClick={fetchInitialMessages} size="sm" variant="outline" className="border-white/10">
                Retry
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto animate-bounce" />
              <h3 className="text-md font-semibold text-gray-400">Start of conversation</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Send a message to start chatting with your connection partner.
              </p>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="text-center py-2">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin mx-auto" />
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender._id === session?.user?._id;
                const decryptedText = decryptedMessages[msg._id];
                const isEncrypted = msg.content.startsWith('{"ciphertext":');

                const parsed = parseMessageContent(decryptedText || msg.content);
                return (
                  <div
                    key={msg._id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                      onTouchStart={(e) => handleTouchStart(e, msg)}
                      onTouchEnd={handleTouchEnd}
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative cursor-context-menu select-none transition-all duration-150 active:scale-[0.99] ${
                        isMe
                          ? "bg-white text-black rounded-tr-none hover:bg-zinc-100"
                          : "bg-white/10 text-white rounded-tl-none border border-white/5 hover:bg-white/[0.12]"
                      }`}
                    >
                      {parsed.isReply && (
                        <div className={`mb-1.5 p-2 rounded-lg border-l-4 border-primary text-xs ${
                          isMe ? "bg-black/5 text-zinc-700" : "bg-white/5 text-zinc-300"
                        } select-none`}>
                          <div className="font-semibold text-[10px] text-primary">
                            @{parsed.replyToSender}
                          </div>
                          <div className="truncate opacity-80 mt-0.5 max-w-sm">
                            {parsed.replyToContent.startsWith('{"ciphertext":')
                              ? "Encrypted message"
                              : parsed.replyToContent}
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap break-words">
                        {isEncrypted && decryptedText === undefined ? (
                          <span className="text-zinc-500 italic flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5" /> Encrypted message
                          </span>
                        ) : (
                          parsed.text
                        )}
                      </p>
                      
                      {/* Status indicator for sending / failed / pending */}
                      {isMe && msg.status === "pending" && (
                        <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">
                          Sending...
                        </span>
                      )}
                      {isMe && msg.status === "failed" && (
                        <button
                          onClick={() => handleSendMessage(undefined, msg)}
                          className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-destructive hover:underline bg-zinc-900 border border-destructive/20 px-2 py-1 rounded"
                        >
                          <RefreshCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <span className="text-[10px] text-gray-500 mt-1 flex items-center gap-1 px-1">
                      {isMe && (
                        msg.status === "pending" ? (
                          <Clock className="w-2.5 h-2.5 animate-pulse" />
                        ) : msg.status === "failed" ? (
                          <AlertTriangle className="w-2.5 h-2.5 text-destructive" />
                        ) : (
                          <Check 
                            className={`w-3 h-3 ${
                              partnerLastReadAt && new Date(msg.createdAt) <= new Date(partnerLastReadAt)
                                ? "text-emerald-500"
                                : "text-gray-500"
                            }`} 
                          />
                        )
                      )}
                      {dayjs(msg.createdAt).format("MMM DD, hh:mm A")}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/40 shrink-0">
          {isArchived ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-center text-sm text-destructive font-medium">
              This connection has been removed. The chat is read-only.
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-2">
              {replyingToMessage && (
                <div className="flex items-center justify-between bg-white/5 border-l-4 border-primary rounded-r-xl px-3 py-2 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="text-left text-xs min-w-0">
                    <span className="font-semibold text-primary block">
                      Replying to @{replyingToMessage.sender.username}
                    </span>
                    <span className="text-gray-400 truncate block mt-0.5 max-w-xl">
                      {getCleanQuotedText(replyingToMessage)}
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setReplyingToMessage(null)}
                    variant="ghost"
                    className="h-6 w-6 p-0 rounded-full hover:bg-white/10 text-gray-400 hover:text-white shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    if (e.target.value.trim().length > 0) {
                      sendTypingPing();
                    }
                  }}
                  placeholder="Type a message..."
                  maxLength={2000}
                  rows={1}
                  className="flex-1 min-h-[48px] max-h-[140px] bg-white/5 border-white/5 text-white focus-visible:ring-1 focus-visible:ring-white/10 rounded-xl py-3 resize-none scrollbar-thin"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!inputMessage.trim() || inputMessage.length > 2000 || isSending}
                  className="bg-primary text-black hover:bg-primary/80 disabled:opacity-50 h-[48px] w-[48px] rounded-xl shrink-0 p-0 flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>

              {/* Character Counter */}
              <div className="flex justify-between items-center text-[10px] text-gray-500 px-1">
                <span>Press Enter to send, Shift+Enter for new line</span>
                <span className={inputMessage.length > 2000 ? "text-destructive" : ""}>
                  {inputMessage.length} / 2000
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Floating Context Menu */}
        {contextMenu && typeof document !== "undefined" && createPortal(
          <div
            id="chat-message-context-menu"
            className="fixed z-50 bg-zinc-900 border border-white/10 text-white rounded-xl shadow-2xl py-1 w-40 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleInitiateReply(contextMenu.message);
              }}
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reply</span>
            </button>
            {contextMenu.message.sender._id === session?.user?._id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMessage(contextMenu.message._id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-destructive/10 hover:text-destructive text-xs flex items-center gap-2 border-t border-white/5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>,
          document.body
        )}

      </div>
  );
}
