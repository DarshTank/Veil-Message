"use client";

import MessageCard from "@/components/MessageCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/model/User.model";
import { acceptMessageSchema } from "@/schemas/acceptMessageSchema";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2, RefreshCcw, Copy, Shield, Send, Trash2, Ghost, QrCode } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import { ShareQRModal } from "@/components/ShareQRModal";

import { useRouter } from "next/navigation";

const Page = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const isInitialLoad = useRef(true);
  const router = useRouter();
  useNotificationCounts();

  // New settings states
  const [isShieldEnabled, setIsShieldEnabled] = useState(true);
  const [isShieldLoading, setIsShieldLoading] = useState(false);

  // Ghost replies states
  const [ghostReplies, setGhostReplies] = useState<string[]>([]);
  const [newGhostReply, setNewGhostReply] = useState("");
  const [isGhostSubmitLoading, setIsGhostSubmitLoading] = useState(false);

  // Share QR modal state
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  const { toast } = useToast();
  const { data: session, status, update: updateSession } = useSession();

  useEffect(() => {
    if (session?.user?.role === "super-admin") {
      router.replace("/admin");
    }
  }, [session, router]);
  const form = useForm({
    resolver: zodResolver(acceptMessageSchema),
    defaultValues: {
      acceptMessages: false,
    },
  });
  const { watch, setValue } = form;

  const acceptMessage = watch("acceptMessages");

  const fetchData = useCallback(async (refresh = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const [messagesResponse, acceptResponse] = await Promise.all([
        axios.get<ApiResponse>("/api/get-messages"),
        axios.get<ApiResponse>("/api/accept-messages"),
      ]);

      setMessages(messagesResponse.data.messages || []);
      
      // Support both singular and plural fields to prevent crashes
      const acceptStatus = acceptResponse.data.isAcceptingMessage ?? 
                           (acceptResponse.data as { isAcceptingMessages?: boolean }).isAcceptingMessages ?? 
                           true;
      setValue("acceptMessages", acceptStatus);

      if (refresh) {
        toast({
          title: "Refreshed Messages",
          description: "Showing latest Messages",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [setValue, toast, isLoading]);

  useEffect(() => {
    if (status === "authenticated" && isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchData();
    }
  }, [status, fetchData]);

  // Auto-poll for new public messages/voice notes every 5 seconds
  useEffect(() => {
    if (status !== "authenticated") return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get<ApiResponse>("/api/get-messages");
        if (res.data.messages) {
          setMessages(res.data.messages);
        }
      } catch {
        // silent background poll failure
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  // Load public profile configuration (board status + ghost replies)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.username) {
      setIsShieldEnabled(session.user.isShieldEnabled ?? true);
      
      axios.get(`/api/get-public-profile?username=${session.user.username}`)
        .then((res) => {
          if (res.data.success && res.data.user) {
            setGhostReplies(res.data.user.ghostReplies ?? []);
          }
        })
        .catch((err) => console.error("Error loading profile settings:", err));
    }
  }, [status, session]);

  const handleSwitchChange = async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.post<ApiResponse>("/api/accept-messages", {
        acceptMessages: !acceptMessage,
      });
      setValue("acceptMessages", !acceptMessage);
      toast({
        title: response.data.message,
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSwitchLoading(false);
    }
  };

  const handleShieldToggle = async () => {
    setIsShieldLoading(true);
    const targetState = !isShieldEnabled;
    try {
      const response = await axios.post("/api/toggle-shield", {
        isShieldEnabled: targetState,
      });
      setIsShieldEnabled(targetState);
      
      // Update session locally
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            isShieldEnabled: targetState,
          }
        });
      }

      toast({
        title: response.data.message || `AI Shield ${targetState ? "enabled" : "disabled"}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update AI Shield setting.",
        variant: "destructive",
      });
    } finally {
      setIsShieldLoading(false);
    }
  };



  const handleGhostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGhostReply.trim()) return;

    setIsGhostSubmitLoading(true);
    try {
      const response = await axios.post("/api/ghost-reply", {
        reply: newGhostReply.trim(),
      });
      
      toast({
        title: "Success",
        description: response.data.message || "Ghost whisper published.",
      });

      setGhostReplies((prev) => [...prev, newGhostReply.trim()]);
      setNewGhostReply("");
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description: axiosError.response?.data?.message || "Failed to publish whisper.",
        variant: "destructive",
      });
    } finally {
      setIsGhostSubmitLoading(false);
    }
  };

  const handleGhostDelete = async (index: number) => {
    try {
      await axios.delete("/api/ghost-reply", {
        data: { index },
      });
      toast({
        title: "Success",
        description: "Ghost whisper deleted.",
      });
      setGhostReplies((prev) => prev.filter((_, i) => i !== index));
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete whisper.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const profileUrl = `${baseUrl}/u/${session?.user?.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Profile URL copied",
      description: "Profile URL has been copied to clipboard",
    });
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-8">
          {/* Header skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-4 w-96 mt-2 rounded" />
            </div>
            <Skeleton className="h-10 w-40 rounded-lg" />
          </div>

          {/* Top Controls Grid skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Share Link skeleton */}
              <div className="glass-card p-6 rounded-lg space-y-4">
                <Skeleton className="h-5 w-32 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-12 flex-grow rounded-md" />
                  <Skeleton className="h-10 w-16 rounded-md" />
                </div>
              </div>

              {/* Switches Grid skeleton */}
              <div className="glass-card p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-28 rounded" />
                      <Skeleton className="h-3 w-full rounded" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-10 rounded-full" />
                      <Skeleton className="h-3 w-14 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ghost Whispers skeleton */}
            <div className="glass-card p-6 rounded-lg space-y-4">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-3 w-full rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-grow rounded" />
                <Skeleton className="h-9 w-9 rounded" />
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            </div>
          </div>

          <Skeleton className="h-px w-full" />

          {/* Messages skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-7 w-48 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass-card rounded-lg border border-white/5 overflow-hidden">
                  <div className="p-6 space-y-4">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                  <div className="px-6 py-3 border-t border-white/5 flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <Button onClick={() => window.location.href = "/sign-in"}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
              Public Messages
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your public link, whispers, and anonymous messages received from visitors.
            </p>
          </div>
          
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={isLoading}
            className="gap-2 border-white/10 self-start md:self-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            Refresh Messages
          </Button>
        </motion.div>

        {/* Top Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings switch panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-lg space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Copy className="h-5 w-5 text-primary" />
                Your Share Link
              </h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={typeof window !== "undefined" && session?.user?.username ? `${window.location.protocol}//${window.location.host}/u/${session.user.username}` : "Loading URL..."}
                  disabled
                  className="w-full p-3 rounded-md bg-background/50 border border-white/10 text-muted-foreground font-mono text-xs sm:text-sm min-w-0 truncate"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Button onClick={copyToClipboard} className="flex-1 sm:flex-none">
                    Copy
                  </Button>
                  <Button 
                    onClick={() => setIsQRModalOpen(true)} 
                    variant="outline" 
                    className="flex-1 sm:flex-none gap-1.5 border-white/10 hover:bg-white/5"
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </Button>
                </div>
              </div>
            </div>

            {/* Switches Grid */}
            <div className="glass-card p-6 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col justify-between p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
                <div className="space-y-1">
                  <span className="font-semibold text-sm block">Accept Messages</span>
                  <span className="text-xs text-muted-foreground">Allow people to send you notes.</span>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  <Switch
                    checked={acceptMessage || false}
                    onCheckedChange={handleSwitchChange}
                    disabled={isSwitchLoading}
                  />
                  <span className={`text-xs font-bold ${acceptMessage ? "text-green-500" : "text-red-500"}`}>
                    {acceptMessage ? "ACTIVE" : "DISABLED"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between p-4 bg-white/5 rounded-xl border border-white/5 gap-4">
                <div className="space-y-1">
                  <span className="font-semibold text-sm flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-purple-400" />
                    AI Empathy Shield
                  </span>
                  <span className="text-xs text-muted-foreground">Tenderize and filter toxic notes automatically.</span>
                </div>
                <div className="flex items-center gap-3 mt-auto">
                  <Switch
                    checked={isShieldEnabled}
                    onCheckedChange={handleShieldToggle}
                    disabled={isShieldLoading}
                  />
                  <span className={`text-xs font-bold ${isShieldEnabled ? "text-purple-400" : "text-muted-foreground"}`}>
                    {isShieldEnabled ? "SHIELDED" : "UNFILTERED"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: Ghost Whispers */}
          <div className="space-y-6 flex flex-col">
            {/* Ghost replies whispers panel */}
            <div className="glass-card p-6 rounded-lg flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Ghost className="h-5 w-5 text-purple-400 animate-pulse" />
                Ghost Whispers
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Floating anonymous thoughts rendered on your public profile. Just vibes.
              </p>

              {/* Compose */}
              <form onSubmit={handleGhostSubmit} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Share a whisper... (max 280)"
                  maxLength={280}
                  value={newGhostReply}
                  onChange={(e) => setNewGhostReply(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-background/50 border border-white/10 text-foreground"
                />
                <Button type="submit" disabled={isGhostSubmitLoading || !newGhostReply.trim()} size="sm">
                  {isGhostSubmitLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </form>

              {/* List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {ghostReplies.length > 0 ? (
                  ghostReplies.map((reply, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2 bg-white/5 border border-white/5 p-2 rounded text-xs italic">
                      <span className="break-all">&ldquo;{reply}&rdquo;</span>
                      <button
                        onClick={() => handleGhostDelete(idx)}
                        className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 mt-0.5"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No whispers published yet.</p>
                )}
            </div>
          </div>
          </div>
          </div>
        </div>

        <Separator className="opacity-10" />

        {/* Messages List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Received Messages</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {messages.length > 0 ? (
              messages.map((message, index) => (
                <motion.div
                  key={String(message._id)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <MessageCard
                    message={message}
                    onMessageDelete={(id) =>
                      setMessages(messages.filter((msg) => String(msg._id) !== id.toString()))
                    }
                  />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 text-muted-foreground glass-card rounded-lg">
                <p className="text-lg font-bold">No messages received yet.</p>
                <p className="text-xs mt-1">Copy and share your profile link to receive anonymous feedback!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <ShareQRModal
        isOpen={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        username={session?.user?.username || ""}
      />
    </div>
  );
};

export default Page;
