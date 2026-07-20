"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Send, Sparkles, Mic, Square, Play, Pause, Trash2, MessageSquare, User, AudioWaveform, Squirrel, Flame, Ghost, Flag } from "lucide-react";
import ReportUserModal from "@/components/ReportUserModal";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CardHeader, CardContent, Card, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MessageSchema } from "@/schemas/messageSchema";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";

const SEPARATOR = "||";
const parseMessages = (text = "") => text.split(SEPARATOR);
const initialMessageString =
  "What's your favorite movie?||Do you have any pets?||What's your dream job?";

// WAV encoding helper functions
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2;
  const bufferArr = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(bufferArr);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bufferLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChan, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bufferLength, true);
  
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([view], { type: 'audio/wav' });
}

function interleave(inputL: Float32Array, inputR: Float32Array) {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default function SendMessage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;
  const { toast } = useToast();
  const router = useRouter();
  const { status } = useSession();

  const [activeTab, setActiveTab] = useState<"text" | "voice">("text");
  const [isBurnAfterRead, setIsBurnAfterRead] = useState(false);

  // Voice message states
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [pitchEffect, setPitchEffect] = useState<"normal" | "deep" | "chipmunk">("normal");
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [processedAudioBlob, setProcessedAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioProgress, setAudioProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const form = useForm<z.infer<typeof MessageSchema>>({
    resolver: zodResolver(MessageSchema),
    defaultValues: {
      content: "",
    },
  });

  const messageContent = form.watch("content");

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState(initialMessageString);
  const [heading, setHeading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<{ bio: string; ghostReplies?: string[] } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const fetchProfile = useCallback(() => {
    if (!username) return;
    axios
      .get(`/api/get-public-profile?username=${username}`)
      .then((res) => setPublicProfile(res.data.user))
      .catch(() => console.error("Failed to fetch public profile"));
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Audio timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    if (status !== "authenticated") {
      setIsLoginModalOpen(true);
      return;
    }
    setAudioUrl(null);
    setProcessedAudioBlob(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        await applyPitchShift(rawBlob, pitchEffect);
        
        // Stop stream tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Web Audio API Pitch shifting node simulation
  const applyPitchShift = async (blob: Blob, effect: "normal" | "deep" | "chipmunk") => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    let decodedBuffer;
    try {
      decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
      console.error("Failed to decode audio data", e);
      return;
    }

    let rate = 1.0;
    if (effect === "deep") rate = 0.75;
    if (effect === "chipmunk") rate = 1.45;



    // Use OfflineAudioContext to render the pitched audio
    const offlineCtx = new OfflineAudioContext(
      decodedBuffer.numberOfChannels,
      decodedBuffer.duration * decodedBuffer.sampleRate / rate,
      decodedBuffer.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;
    source.playbackRate.value = rate;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const pitchedBlob = bufferToWav(renderedBuffer);

    setProcessedAudioBlob(pitchedBlob);
    setAudioUrl(URL.createObjectURL(pitchedBlob));
    await audioCtx.close();
  };

  // Re-apply pitch shift if target effect changes on existing raw audio chunks
  useEffect(() => {
    if (audioChunksRef.current.length > 0 && !isRecording) {
      const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType });
      applyPitchShift(rawBlob, pitchEffect);
    }
  }, [pitchEffect]);

  // Audio playback lifecycle for recording preview
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      playbackAudioRef.current = audio;

      const setAudioInfo = () => { setAudioDuration(audio.duration || 0); };
      const updateProgress = () => { setAudioProgress(audio.currentTime); };
      const handleAudioEnded = () => { setIsPlayingBack(false); setAudioProgress(0); };

      audio.addEventListener("loadedmetadata", setAudioInfo);
      audio.addEventListener("timeupdate", updateProgress);
      audio.addEventListener("ended", handleAudioEnded);

      return () => {
        audio.removeEventListener("loadedmetadata", setAudioInfo);
        audio.removeEventListener("timeupdate", updateProgress);
        audio.removeEventListener("ended", handleAudioEnded);
        try {
          audio.pause();
        } catch (err) {
          console.warn("Failed to pause audio on unmount:", err);
        }
      };
    } else {
      playbackAudioRef.current = null;
    }
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!playbackAudioRef.current) return;
    if (isPlayingBack) {
      playbackAudioRef.current.pause();
      setIsPlayingBack(false);
    } else {
      playbackAudioRef.current.play().catch((err) => {
        console.warn("Audio playback interrupted:", err);
      });
      setIsPlayingBack(true);
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAudioProgress(val);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.currentTime = val;
    }
  };

  const deleteRecording = () => {
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    setAudioUrl(null);
    setProcessedAudioBlob(null);
    audioChunksRef.current = [];
    setIsPlayingBack(false);
    setAudioProgress(0);
    setAudioDuration(0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "text") {
      form.handleSubmit(onSubmit)(e);
    } else {
      onSubmit({ content: "" });
    }
  };

  const onSubmit = async (data: z.infer<typeof MessageSchema>) => {
    if (status !== "authenticated") {
      setIsLoginModalOpen(true);
      return;
    }
    // Manual validation based on active tab
    if (activeTab === "text") {
      const trimmed = (data.content ?? "").trim();
      if (trimmed.length < 10) {
        form.setError("content", { message: "Message must be at least 10 characters long" });
        return;
      }
    } else {
      if (!processedAudioBlob) {
        toast({ title: "No recording", description: "Please record a voice message first.", variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    try {
      let finalAudioUrl = "";

      if (activeTab === "voice" && processedAudioBlob) {
        try {
          const formData = new FormData();
          formData.append("file", processedAudioBlob);

          const uploadRes = await axios.post("/api/upload", formData);
          if (uploadRes.data.success) {
            finalAudioUrl = uploadRes.data.url;
          } else {
            throw new Error(uploadRes.data.message || "Failed to upload to server");
          }
        } catch (uploadError) {
          console.warn("Vercel Blob upload failed, falling back to Base64:", uploadError);
          // Fallback to base64 Data URL
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
          });
          reader.readAsDataURL(processedAudioBlob);
          finalAudioUrl = await base64Promise;
        }
      }

      const res = await axios.post("/api/send-message", {
        content: activeTab === "text" ? data.content : "",
        isBurnAfterRead,
        audioUrl: finalAudioUrl,
        username,
      });

      toast({ title: res.data.message });
      form.reset({ content: "" });
      deleteRecording();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuestions = async () => {
    if (status !== "authenticated") {
      setIsLoginModalOpen(true);
      return;
    }
    setIsGenerating(true);
    try {
      const res = await axios.get("/api/suggest-questions");

      let questions = "";
      if (res.data.questions && Array.isArray(res.data.questions)) {
        questions = res.data.questions.join(SEPARATOR);
      } else {
        questions = res.data.aitext ?? initialMessageString;
      }

      setGeneratedMessages(questions);
      setHeading(true);

      toast({
        title: "Questions Generated",
        description: "AI generated new questions for you.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const totalSeconds = Math.round(secs);
    const mins = Math.floor(totalSeconds / 60);
    const remaining = totalSeconds % 60;
    return `${mins}:${remaining < 10 ? "0" : ""}${remaining}`;
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }



  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-5"
      >
        <div className="relative text-center space-y-2">
          <div className="absolute right-0 top-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsReportModalOpen(true)}
              className="h-8 px-2.5 text-muted-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 text-xs rounded-lg gap-1.5 transition-colors"
              title="Report User"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </Button>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2 text-foreground">
            Public Profile
          </h1>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            @{username}
          </h2>
          <p className="italic text-muted-foreground/90 mt-2 max-w-md mx-auto">
            "{publicProfile?.bio || "Shh... whispers are welcome here."}"
          </p>
        </div>

        <ReportUserModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          reportedUsername={username || ""}
        />

        {/* Ghost Replies / Whispers display */}
        {publicProfile?.ghostReplies && publicProfile.ghostReplies.length > 0 && (
          <div className="space-y-3 py-1">
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-rose-400 text-center">
              <Ghost className="h-5 w-5 inline mr-1.5" /> Whispers from @{username}
            </h3>
            
            <div className="relative flex flex-wrap justify-center items-center gap-3 overflow-hidden py-2">
              {publicProfile.ghostReplies.map((reply, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8, y: 15 }}
                  animate={{
                    opacity: [0.7, 0.9, 0.7],
                    scale: 1,
                    y: [0, -10, 0],
                  }}
                  transition={{
                    opacity: { repeat: Infinity, duration: 4 + index, ease: "easeInOut" },
                    y: { repeat: Infinity, duration: 6 + index * 2, ease: "easeInOut" },
                    delay: index * 0.5,
                  }}
                  className="glass-card bg-card/25 backdrop-blur-md px-6 py-4 rounded-3xl border border-purple-500/10 hover:border-purple-500/30 text-foreground italic text-sm font-medium shadow-[0_4px_30px_rgba(0,0,0,0.1)] text-center max-w-[280px] break-words"
                >
                  "{reply}"
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <Card className="glass-card border-white/10 overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("text")}
              className={`flex-1 py-4 text-center font-semibold text-sm transition-all ${
                activeTab === "text"
                  ? "bg-white/5 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="h-4 w-4 mr-1.5 inline" /> Text Message
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`flex-1 py-4 text-center font-semibold text-sm transition-all ${
                activeTab === "voice"
                  ? "bg-white/5 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="h-4 w-4 mr-1.5 inline" /> Voice Message
            </button>
          </div>

          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {activeTab === "text" ? (
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Send an anonymous message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Write your message anonymously..."
                            className="min-h-[120px] bg-background/50 border-white/10 focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="space-y-6">
                    <FormLabel>Send an anonymous voice note</FormLabel>
                    
                    <div className="glass-card p-6 rounded-lg flex flex-col items-center justify-center border border-white/5 gap-4">
                      {isRecording ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex gap-1 items-end h-8">
                            <motion.div animate={{ height: [8, 24, 8] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-rose-500 rounded-full" />
                            <motion.div animate={{ height: [12, 32, 12] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.15 }} className="w-1 bg-rose-500 rounded-full" />
                            <motion.div animate={{ height: [6, 18, 6] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.3 }} className="w-1 bg-rose-500 rounded-full" />
                            <motion.div animate={{ height: [14, 28, 14] }} transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }} className="w-1 bg-rose-500 rounded-full" />
                          </div>
                          <span className="font-mono text-lg font-bold text-rose-500">
                            {formatTime(recordTime)}
                          </span>
                          <Button
                            type="button"
                            onClick={stopRecording}
                            className="bg-rose-600 hover:bg-rose-500 text-white rounded-full p-4 h-12 w-12 flex items-center justify-center shadow-lg shadow-rose-950/50"
                          >
                            <Square className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : audioUrl ? (
                        <div className="w-full space-y-3 bg-white/5 border border-white/10 p-4 rounded-xl">
                          <div className="flex items-center gap-4">
                            <Button
                              type="button"
                              onClick={togglePlayback}
                              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/95 text-white p-0 shrink-0 shadow-lg shadow-primary/30 transition-transform hover:scale-105"
                            >
                              {isPlayingBack ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
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
                                <span>{formatTime(audioProgress)}</span>
                                <span>{formatTime(audioDuration)}</span>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              onClick={deleteRecording}
                              className="h-9 w-9 p-0 rounded-full text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 justify-end">
                            <Mic className="h-3 w-3 inline mr-1" /> PREVIEW — ANONYMOUS VOICE NOTE
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <p className="text-sm text-muted-foreground text-center">
                            Press mic to start recording. Maximum 1 minute.
                          </p>
                          <Button
                            type="button"
                            onClick={startRecording}
                            className="bg-primary hover:bg-primary/90 text-black rounded-full p-4 h-14 w-14 flex items-center justify-center shadow-lg shadow-primary/20"
                          >
                            <Mic className="h-6 w-6" />
                          </Button>
                        </div>
                      )}

                      {/* Voice Effects Panel */}
                      {audioUrl && !isRecording && (
                        <div className="w-full space-y-2 mt-4 pt-4 border-t border-white/5">
                          <span className="text-xs text-muted-foreground font-medium block">
                            <User className="h-3 w-3 inline mr-1" /> Voice Aura / Pitch Modifier:
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {(["normal", "deep", "chipmunk"] as const).map((effect) => (
                              <Button
                                key={effect}
                                type="button"
                                variant={pitchEffect === effect ? "default" : "outline"}
                                onClick={() => setPitchEffect(effect)}
                                className={`rounded-full text-xs capitalize ${
                                  pitchEffect === effect 
                                    ? "bg-primary text-black border-transparent" 
                                    : "border-white/10 bg-white/5"
                                }`}
                              >
                                {effect === "normal" && <><User className="h-3.5 w-3.5 mr-1 inline" /> Normal</>}
                                {effect === "deep" && <><AudioWaveform className="h-3.5 w-3.5 mr-1 inline" /> Deep</>}
                                {effect === "chipmunk" && <><Squirrel className="h-3.5 w-3.5 mr-1 inline" /> Chipmunk</>}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* self destruct and submit buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="burn-toggle"
                      checked={isBurnAfterRead}
                      onCheckedChange={setIsBurnAfterRead}
                    />
                    <label htmlFor="burn-toggle" className="text-sm font-semibold cursor-pointer text-muted-foreground hover:text-foreground">
                      <Flame className="h-4 w-4 mr-1 inline" /> Self-destruct after reading
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || (activeTab === "text" ? !messageContent : !processedAudioBlob)}
                    className="px-8 shadow-lg shadow-primary/10"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {activeTab === "text" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-muted-foreground">Need inspiration?</p>
              <Button
                onClick={generateQuestions}
                disabled={isGenerating}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg">
                  {heading ? "AI Generated Questions" : "Suggested Questions"}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {parseMessages(generatedMessages).map((msg, i) => (
                  <Button
                    key={i}
                    variant="secondary"
                    className="justify-start text-left bg-white/5 hover:bg-white/10 text-foreground border border-white/5 h-auto py-3 whitespace-normal break-words text-xs sm:text-sm"
                    onClick={() => form.setValue("content", msg)}
                  >
                    {msg}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}



        {status !== "authenticated" && (
          <>
            <Separator className="border-white/10" />
            <div className="text-center">
              <p className="mb-6 text-muted-foreground">Want your own message board?</p>
              <Link href="/sign-up">
                <Button variant="outline" className="border-white/10 hover:bg-white/5">
                  Create Your Account
                </Button>
              </Link>
            </div>
          </>
        )}
      </motion.div>

      <Dialog open={isLoginModalOpen} onOpenChange={setIsLoginModalOpen}>
        <DialogContent className="glass-card bg-zinc-950/90 border border-white/10 p-6 sm:p-8 rounded-2xl max-w-md text-center space-y-6 max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-primary border border-white/10">
              <Ghost className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-bold text-white">Authentication Required</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 leading-relaxed">
              You need to be signed in to perform this action. Register or log in to interact with public profiles.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Link href="/sign-in" className="w-full">
              <Button className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-3.5 rounded-xl transition-all cursor-pointer">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" className="w-full">
              <Button variant="ghost" className="w-full border border-white/10 hover:bg-white/5 text-white font-semibold py-3.5 rounded-xl transition-all cursor-pointer">
                Create an Account
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
