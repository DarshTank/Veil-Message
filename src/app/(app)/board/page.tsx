"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  AlertCircle,
  ShieldAlert,
  Flag,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

dayjs.extend(relativeTime);

interface BoardMessage {
  _id: string;
  content: string;
  username: string;
  createdAt: Date;
}

export default function ConfessionsBoard() {
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  // Report modal state
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchBoard = useCallback(async (targetPage = 1, append = false) => {
    if (targetPage === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await axios.get(`/api/board?page=${targetPage}`);
      const fetched = response.data.boardMessages || [];
      
      if (append) {
        setMessages((prev) => [...prev, ...fetched]);
      } else {
        setMessages(fetched);
      }
      
      if (fetched.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to load confessions board.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [toast]);

  useEffect(() => {
    setPage(1);
    fetchBoard(1, false);
  }, [fetchBoard]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBoard(nextPage, true);
  };





  const handleReportSubmit = async () => {
    if (!reportMessageId) return;
    if (!reportReason.trim()) {
      toast({
        title: "Report Reason Required",
        description: "Please specify why you are flagging this message.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReport(true);
    try {
      await axios.post(`/api/report-message/${reportMessageId}`, {
        reason: reportReason,
      });

      toast({
        title: "Report Submitted",
        description: "Thank you. This confession has been flagged for admin review.",
      });

      // Remove the reported message locally
      setMessages((prev) => prev.filter((m) => m._id !== reportMessageId));
      setReportMessageId(null);
      setReportReason("");
    } catch {
      toast({
        title: "Error",
        description: "Could not submit report.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl text-white">
      <div className="text-center space-y-4 mb-10">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-purple-400 to-blue-400"
        >
          Confessions Board
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground max-w-xl mx-auto text-sm"
        >
          Whispers, secrets, and late-night thoughts from the community. Post yours publicly, completely at will.
        </motion.p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card bg-card/30 border border-white/5 rounded-xl overflow-hidden">
              <div className="p-6 space-y-4">
                <Skeleton className="h-4 w-full rounded bg-white/5" />
                <Skeleton className="h-4 w-5/6 rounded bg-white/5" />
                <Skeleton className="h-4 w-2/3 rounded bg-white/5" />
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16 rounded bg-white/5" />
                    <Skeleton className="h-3 w-20 rounded bg-white/5" />
                  </div>
                  <Skeleton className="h-7 w-7 rounded-full bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : messages.length > 0 ? (
        <div className="space-y-8">
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="glass-card bg-card/30 border border-white/5 h-full flex flex-col justify-between transition-all duration-300 hover:border-white/15 hover:shadow-[0_0_20px_rgba(255,255,255,0.02)]">
                      <CardContent className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-primary block">
                            @{msg.username}
                          </span>
                          <p className="text-foreground/90 leading-relaxed break-words text-sm font-medium">
                            &ldquo;{msg.content}&rdquo;
                          </p>
                        </div>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground/80">
                            {dayjs(msg.createdAt).fromNow()}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setReportMessageId(msg._id)}
                              className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-full"
                              title="Report Post"
                            >
                              <Flag className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {hasMore && (
            <div className="flex justify-center mt-12">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                className="px-8 border-white/10 hover:bg-white/5"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Confessions"
                )}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-24 glass-card rounded-xl border border-dashed border-white/10 p-8 max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-bold">No confessions found</h3>
          <p className="text-muted-foreground text-sm mt-2">
            The board is currently clean. Be the first to post a public confession!
          </p>
        </div>
      )}



      {/* Report Modal */}
      <Dialog open={reportMessageId !== null} onOpenChange={(open) => !open && setReportMessageId(null)}>
        <DialogContent className="glass-card border border-white/10 max-w-md rounded-2xl bg-zinc-950 text-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400 font-bold">
              <ShieldAlert className="h-5 w-5" />
              Flag Confession
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Report this message if it contains harassment, hate speech, explicit content, or other policy violations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Tell us why you are reporting this message..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="bg-background/50 border-white/10 min-h-[100px] rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setReportMessageId(null)}
              className="border-white/10 hover:bg-white/5 rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReportSubmit}
              disabled={submittingReport}
              className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs h-9 px-4"
            >
              {submittingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
