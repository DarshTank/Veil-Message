"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, Edit3, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
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

interface ConfessionMessage {
  _id: string;
  content: string;
  username: string;
  createdAt: Date;
}

export default function ConfessPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [confessionContent, setConfessionContent] = useState("");
  const [isSubmittingConfession, setIsSubmittingConfession] = useState(false);

  // User's own confessions
  const [myConfessions, setMyConfessions] = useState<ConfessionMessage[]>([]);
  const [loadingMyConfessions, setLoadingMyConfessions] = useState(true);

  // Edit Confession State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confession State
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const fetchMyConfessions = useCallback(async () => {
    if (!session?.user) return;
    setLoadingMyConfessions(true);
    try {
      const response = await axios.get("/api/board?my=true");
      setMyConfessions(response.data.boardMessages || []);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load your confessions.",
        variant: "destructive",
      });
    } finally {
      setLoadingMyConfessions(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (session) {
      fetchMyConfessions();
    }
  }, [session, fetchMyConfessions]);

  const handlePostConfession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confessionContent.trim().length < 1) {
      toast({
        title: "Validation Error",
        description: "Your confession cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingConfession(true);
    try {
      const response = await axios.post("/api/board", {
        content: confessionContent,
      });

      toast({
        title: "Success",
        description: response.data.message || "Confession posted successfully!",
      });

      setConfessionContent("");
      fetchMyConfessions();
    } catch (error) {
      toast({
        title: "Error",
        description: axios.isAxiosError(error)
          ? error.response?.data?.message || "Failed to post confession."
          : "Failed to post confession.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingConfession(false);
    }
  };

  const handleStartEdit = (msg: ConfessionMessage) => {
    setEditingMessageId(msg._id);
    setEditingContent(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = async (id: string) => {
    if (editingContent.trim().length < 1) {
      toast({
        title: "Validation Error",
        description: "Your confession cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const response = await axios.patch(`/api/board/${id}`, {
        content: editingContent,
      });

      toast({
        title: "Success",
        description: response.data.message || "Confession updated successfully!",
      });

      setMyConfessions((prev) =>
        prev.map((msg) => (msg._id === id ? { ...msg, content: response.data.confession.content } : msg))
      );
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      toast({
        title: "Error",
        description: axios.isAxiosError(error) ? error.response?.data?.message || "Failed to update confession." : "Failed to update confession.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteConfession = async () => {
    if (!deletingMessageId) return;

    setIsSubmittingDelete(true);
    try {
      await axios.delete(`/api/board/${deletingMessageId}`);

      toast({
        title: "Success",
        description: "Confession deleted successfully!",
      });

      setMyConfessions((prev) => prev.filter((msg) => msg._id !== deletingMessageId));
      setDeletingMessageId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: axios.isAxiosError(error) ? error.response?.data?.message || "Failed to delete confession." : "Failed to delete confession.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl text-white">
      {session ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Composer */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 w-full"
          >
            <Card className="glass-card bg-card/30 border border-white/5 p-6 space-y-6 rounded-2xl">
              <div className="space-y-1">
                <h3 className="text-xl font-bold">
                  Write a Confession
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your post will be publicly displayed on the board under your username: <span className="text-white font-semibold">@{session.user.username}</span>.
                </p>
              </div>

              <form onSubmit={handlePostConfession} className="space-y-4">
                <Textarea
                  placeholder="What is your secret? Share it with the world..."
                  value={confessionContent}
                  onChange={(e) => setConfessionContent(e.target.value)}
                  className="min-h-[160px] bg-background/50 border border-white/10 focus:ring-primary text-sm rounded-xl p-4 leading-relaxed text-white"
                  maxLength={500}
                />
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{confessionContent.length}/500 characters</span>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingConfession || confessionContent.trim().length < 1}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-5 rounded-xl transition-all cursor-pointer"
                >
                  {isSubmittingConfession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Confession"
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>

          {/* User's Own Active Confessions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-7 w-full space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold">Your Active Confessions</h3>
              <p className="text-xs text-zinc-400 mt-1">
                These confessions are live on the board and will expire after 24 hours. You can edit or delete them below.
              </p>
            </div>

            {loadingMyConfessions ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="glass-card bg-card/30 border border-white/5 rounded-xl p-6">
                    <Skeleton className="h-4 w-3/4 rounded bg-white/5 mb-3" />
                    <Skeleton className="h-4 w-1/2 rounded bg-white/5" />
                  </Card>
                ))}
              </div>
            ) : myConfessions.length > 0 ? (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {myConfessions.map((msg) => (
                    <motion.div
                      key={msg._id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="glass-card bg-card/30 border border-white/5 transition-all duration-300 hover:border-white/10">
                        {editingMessageId === msg._id ? (
                          <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                              <Textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="min-h-[120px] bg-background/50 border border-white/10 focus:ring-primary text-sm rounded-xl text-white"
                                maxLength={500}
                              />
                              <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                <span>{editingContent.length}/500</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCancelEdit}
                                disabled={isSubmittingEdit}
                                className="h-8 rounded-full border border-white/10 hover:bg-white/5 text-xs text-white"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveEdit(msg._id)}
                                disabled={isSubmittingEdit || editingContent.trim().length < 1}
                                className="h-8 rounded-full bg-primary hover:bg-primary/90 text-black font-semibold text-xs px-4"
                              >
                                {isSubmittingEdit ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        ) : (
                          <CardContent className="p-6 space-y-4">
                            <p className="text-foreground/90 leading-relaxed break-words text-sm font-medium">
                              &ldquo;{msg.content}&rdquo;
                            </p>

                            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-muted-foreground">
                              <span>{dayjs(msg.createdAt).fromNow()}</span>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEdit(msg)}
                                  className="h-7 w-7 text-zinc-400 hover:text-primary hover:bg-white/5 rounded-full cursor-pointer"
                                  title="Edit Confession"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingMessageId(msg._id)}
                                  className="h-7 w-7 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-full cursor-pointer"
                                  title="Delete Confession"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-16 glass-card rounded-xl border border-dashed border-white/10 p-8">
                <AlertCircle className="h-12 w-12 mx-auto text-zinc-500 mb-4" />
                <h3 className="text-sm font-bold">No active confessions</h3>
                <p className="text-xs text-zinc-500 mt-2">
                  You haven&apos;t posted any confessions in the last 24 hours.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto text-center"
        >
          <Card className="glass-card bg-card/30 border border-white/5 p-8 space-y-6 rounded-2xl">
            <Lock className="h-12 w-12 mx-auto text-zinc-500" />
            <div className="space-y-2">
              <h3 className="text-xl font-bold">Authentication Required</h3>
              <p className="text-sm text-zinc-400">
                You need to be signed in to write and post a public confession on the board.
              </p>
            </div>
            <Button
              onClick={() => router.push("/sign-in")}
              className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-5 rounded-xl cursor-pointer"
            >
              Sign In
            </Button>
          </Card>
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deletingMessageId !== null} onOpenChange={(open) => !open && setDeletingMessageId(null)}>
        <DialogContent className="glass-card border border-white/10 max-w-sm rounded-2xl bg-zinc-950 text-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500 font-bold">
              <Trash2 className="h-5 w-5" />
              Delete Confession
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              Are you sure you want to permanently delete this confession? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingMessageId(null)}
              className="border-white/10 hover:bg-white/5 rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfession}
              disabled={isSubmittingDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs h-9 px-4"
            >
              {isSubmittingDelete ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
