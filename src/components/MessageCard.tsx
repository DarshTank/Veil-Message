"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2, Play, Pause, Flame, Shield, Eye, EyeOff, 
  Flag, Volume2
} from "lucide-react";
import { Message } from "@/model/User.model";
import { useToast } from "@/hooks/use-toast";
import { ApiResponse } from "@/types/ApiResponse";
import axios, { AxiosError } from "axios";
import dayjs from "dayjs";

type MessageCardProps = {
  message: Message;
  onMessageDelete: (messageID: string) => void;
};

const moodGlows = {
  confession: "shadow-[0_0_20px_rgba(244,63,94,0.12)] border-rose-500/10 hover:border-rose-500/30",
  advice: "shadow-[0_0_20px_rgba(16,185,129,0.12)] border-emerald-500/10 hover:border-emerald-500/30",
  wit: "shadow-[0_0_20px_rgba(245,158,11,0.12)] border-amber-500/10 hover:border-amber-500/30",
  critique: "shadow-[0_0_20px_rgba(139,92,246,0.12)] border-violet-500/10 hover:border-violet-500/30",
  curious: "shadow-[0_0_20px_rgba(59,130,246,0.12)] border-blue-500/10 hover:border-blue-500/30",
};

const moodBadgeColors = {
  confession: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  advice: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  wit: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critique: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  curious: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function MessageCard({ message, onMessageDelete }: MessageCardProps) {
  const { toast } = useToast();
  const { data: session } = useSession();
  
  // React shield checks
  const isShieldEnabled = session?.user?.isShieldEnabled ?? true;
  const isToxic = message.toxicityLevel === "toxic" || message.toxicityLevel === "harsh";
  const [showOriginal, setShowOriginal] = useState(false);

  // Burn After Read States
  const [isBurnRevealed, setIsBurnRevealed] = useState(false);
  const [burning, setBurning] = useState(false);

  // Audio Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);



  // Report Modal States
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const handleDeleteConfirm = async () => {
    try {
      const response = await axios.delete<ApiResponse>(
        `/api/delete-message/${message._id}`
      );
      toast({ title: response.data.message });
      onMessageDelete(String(message._id));
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description: axiosError.response?.data.message ?? "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // Open Burn After Read Message
  const handleRevealBurn = async () => {
    if (message.audioUrl) {
      setIsBurnRevealed(true);
      return;
    }

    setBurning(true);
    try {
      await axios.post(`/api/open-burn-message/${message._id}`);
      setIsBurnRevealed(true);
      toast({
        title: "Opened self-destruct message",
        description: "This message has been permanently deleted from the server.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to open and burn message.",
        variant: "destructive",
      });
    } finally {
      setBurning(false);
    }
  };

  // Stable callback refs to prevent Audio recreation on parent component re-renders
  const onMessageDeleteRef = useRef(onMessageDelete);
  onMessageDeleteRef.current = onMessageDelete;

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const messageIdRef = useRef(message._id);
  messageIdRef.current = message._id;

  const isBurnAfterReadRef = useRef(message.isBurnAfterRead);
  isBurnAfterReadRef.current = message.isBurnAfterRead;

  // Audio Handlers
  useEffect(() => {
    if (message.audioUrl && (isBurnRevealed || !message.isBurnAfterRead)) {
      const isPrivateBlob = message.audioUrl.includes(".private.blob.vercel-storage.com");
      const src = isPrivateBlob
        ? `/api/audio-proxy?url=${encodeURIComponent(message.audioUrl)}`
        : message.audioUrl;

      const audio = new Audio(src);
      audioRef.current = audio;

      const setAudioInfo = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setAudioDuration(audio.duration);
        }
      };
      const updateProgress = () => {
        setAudioProgress(audio.currentTime);
      };
      const handleAudioEnded = async () => {
        setIsPlaying(false);
        setAudioProgress(0);

        if (isBurnAfterReadRef.current) {
          try {
            await axios.post(`/api/open-burn-message/${messageIdRef.current}`);
            toastRef.current({
              title: "Voice note burned",
              description: "This voice note has been permanently deleted from the server.",
            });
            onMessageDeleteRef.current(String(messageIdRef.current));
          } catch (err) {
            console.error("Failed to burn audio message:", err);
          }
        }
      };
      const handleAudioError = (e: Event) => {
        console.error("Audio playback/loading error:", e);
      };

      audio.addEventListener("loadedmetadata", setAudioInfo);
      audio.addEventListener("timeupdate", updateProgress);
      audio.addEventListener("ended", handleAudioEnded);
      audio.addEventListener("error", handleAudioError);

      // Trigger preloading
      audio.load();

      return () => {
        audio.removeEventListener("loadedmetadata", setAudioInfo);
        audio.removeEventListener("timeupdate", updateProgress);
        audio.removeEventListener("ended", handleAudioEnded);
        audio.removeEventListener("error", handleAudioError);
        try {
          audio.pause();
        } catch (err) {
          console.warn("Failed to pause audio on unmount:", err);
        }
        audioRef.current = null;
      };
    }
  }, [message.audioUrl, isBurnRevealed, message.isBurnAfterRead]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Audio playback interrupted:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioProgress(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const formatAudioTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return "0:00";
    const totalSeconds = Math.round(time);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };



  // Flag message
  const handleReportMessage = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please specify why you are reporting this message.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReport(true);
    try {
      await axios.post(`/api/report-message/${message._id}`, {
        reason: reportReason,
      });
      toast({
        title: "Report Submitted",
        description: "The message has been reported for moderation.",
      });
      setIsReportOpen(false);
      onMessageDelete(String(message._id));
    } catch {
      toast({
        title: "Error",
        description: "Failed to report message.",
        variant: "destructive",
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  // Determine displayed message text
  const displayContent = () => {
    if (isShieldEnabled && isToxic && !showOriginal) {
      return message.tenderized || "[This toxic message has been shielded and tenderized]";
    }
    return message.content;
  };

  const currentGlowClass = moodGlows[message.mood as keyof typeof moodGlows] || "border-white/5 shadow-lg";

  return (
    <Card className={`glass-card bg-card/35 border transition-all duration-300 relative overflow-hidden ${currentGlowClass}`}>
      
      {/* Burn After Read Ominous Cover */}
      {message.isBurnAfterRead && !isBurnRevealed ? (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[160px] bg-black/40 backdrop-blur-md">
          <Flame className="w-12 h-12 text-rose-500 animate-pulse" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-rose-400">Self-Destruct Message</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              This message will permanently disappear from the database the moment you reveal and close it.
            </p>
          </div>
          <Button 
            onClick={handleRevealBurn} 
            disabled={burning}
            className="bg-rose-600 hover:bg-rose-500 text-white rounded-full px-6 shadow-lg shadow-rose-950"
          >
            {burning ? "Burning..." : <><Flame className="inline h-4 w-4 mr-1" /> Reveal Message</>}
          </Button>
        </div>
      ) : (
        <>
          <CardHeader className="flex flex-row justify-between items-start space-y-0 pb-2">
            <div className="flex flex-col gap-2 w-full">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 items-center">
                {message.mood && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${moodBadgeColors[message.mood as keyof typeof moodBadgeColors]}`}>
                    {message.mood}
                  </span>
                )}
                {isShieldEnabled && isToxic && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    showOriginal ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  }`}>
                    <Shield className="h-3 w-3" />
                    {showOriginal ? `Toxic Alert: ${Math.round((message.toxicityScore ?? 0) * 100)}%` : "AI Tenderized"}
                  </span>
                )}
                {message.isBurnAfterRead && (
                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    Burned
                  </span>
                )}

              </div>

              {/* Message content */}
              {!message.audioUrl ? (
                <div className="space-y-2 mt-2 pr-6">
                  <p className="text-lg font-medium leading-relaxed text-foreground/95 break-words">
                    &ldquo;{displayContent()}&rdquo;
                  </p>
                  
                  {isShieldEnabled && isToxic && (
                    <button
                      onClick={() => setShowOriginal(!showOriginal)}
                      className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 mt-1 transition-colors"
                    >
                      {showOriginal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showOriginal ? "Show Tenderized Version" : "View Original (Uncensored)"}
                    </button>
                  )}
                </div>
              ) : (
                /* Spotify-style Audio Note Player */
                <div className="space-y-3 mt-2 pr-6 bg-white/5 border border-white/5 p-4 rounded-xl">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={toggleAudio}
                      className="h-12 w-12 rounded-full bg-primary hover:bg-primary/95 text-white p-0 shrink-0 shadow-lg shadow-primary/30 transition-transform hover:scale-105"
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </Button>

                    <div className="flex-grow">
                      {/* Progress bar */}
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 1}
                        value={audioProgress}
                        onChange={handleAudioSeek}
                        className="audio-progress"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) ${
                            audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0
                          }%, rgba(255,255,255,0.12) ${
                            audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0
                          }%)`,
                        }}
                      />
                      {/* Time stamps */}
                      <div className="flex justify-between text-[10px] text-muted-foreground/70 font-mono mt-1.5 px-0.5">
                        <span>{formatAudioTime(audioProgress)}</span>
                        <span>{formatAudioTime(audioDuration)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 justify-end">
                    <Volume2 className="h-3 w-3" />
                    ANONYMOUS VOICE NOTE
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="text-[10px] text-muted-foreground/80 font-mono mt-1">
                {dayjs(message.createdAt).format("MMM D, YYYY • h:mm A")}
              </div>
            </div>

            {/* Trash Delete Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full shrink-0 h-9 w-9 -mr-2 -mt-1 transition-colors"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-white/10 max-h-[90dvh] overflow-y-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Message?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this
                    message from your dashboard.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-background/50 border-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardHeader>

          <CardContent className="p-6 pt-2 flex flex-wrap gap-2 items-center justify-end border-t border-white/5 mt-4">
            {/* Flag message */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReportOpen(true)}
              className="h-8 rounded-full text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 text-xs"
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" />
              Report
            </Button>
          </CardContent>
        </>
      )}

      {/* Report Reason Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="glass-card border-white/10 max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Flag className="h-5 w-5" />
              Report Message
            </DialogTitle>
            <DialogDescription>
              Help us keep the community safe. Let us know why you are flagging this message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Why are you reporting this message? (e.g., harassment, spam, explicit content)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="bg-background/50 border-white/10 min-h-[100px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsReportOpen(false)} className="border-white/10">
              Cancel
            </Button>
            <Button
              onClick={handleReportMessage}
              disabled={submittingReport}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {submittingReport ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
