"use client";

import { useState } from "react";
import {
  Shield,
  ArrowRight,
  Ghost,
  EyeOff,
  Mic,
  Flame,
  Lock,
  QrCode,
  Key,
  Play,
  Heart,
  Clock,
  Sparkle,
  Compass,
  UserPlus,
  Check,
  X,
  ShieldCheck,
  FileText,
  LockKeyhole
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import messages from "@/messages.json";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
};

type ModalType = 'privacy' | 'terms' | 'security' | null;

const modalDetails = {
  privacy: {
    title: "Privacy Commitment",
    subtitle: "How Veil safeguards your identity and guarantees data minimization.",
    icon: ShieldCheck,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
    badge: "Strict Confidentiality",
    items: [
      {
        heading: "Zero Personal Data Collection",
        detail: "Veil never logs IP addresses, device serial numbers, or location metadata. Your account is tied exclusively to your chosen anonymous handle."
      },
      {
        heading: "No Tracking Cookies or Ad Networks",
        detail: "We do not sell user data, track cross-site activity, or utilize persistent behavioral advertising pixels."
      },
      {
        heading: "Automatic Ephemeral Purges",
        detail: "Self-destructing voice notes and single-view messages are permanently deleted from database storage immediately upon playback."
      }
    ]
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Platform policies for maintaining a safe and honest community.",
    icon: FileText,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    badge: "Community Standards",
    items: [
      {
        heading: "Constructive Anonymity",
        detail: "Anonymity exists to encourage authentic, candid expression. Targeted harassment, hate speech, and illegal activities are strictly forbidden."
      },
      {
        heading: "AI Toxicity Shield & Moderation",
        detail: "Incoming public confessions and inbox messages pass through NLP AI filters that flag and tenderize harmful language into constructive feedback."
      },
      {
        heading: "User Responsibility & Ownership",
        detail: "Users remain solely responsible for preserving their credentials and private encryption keys generated within their browser."
      }
    ]
  },
  security: {
    title: "Security Architecture",
    subtitle: "End-to-end cryptographic protection built directly into your browser.",
    icon: LockKeyhole,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    badge: "Cryptographic Protection",
    items: [
      {
        heading: "Browser-Side End-to-End Encryption (E2EE)",
        detail: "Private chat rooms exchange client-side AES-GCM keys directly inside your browser. Server databases only store unreadable ciphertext."
      },
      {
        heading: "Voice Pitch Masking & Audio Decoupling",
        detail: "Voice notes are re-encoded using Web Audio API PCM WAV rendering to obscure natural vocal resonance before delivery."
      },
      {
        heading: "DevTools Tampering & Inspection Guards",
        detail: "Client-side protection modules shield DOM elements and cryptographic key material against browser extension tampering."
      }
    ]
  }
};

export default function Home() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const currentModal = activeModal ? modalDetails[activeModal] : null;
  return (
    <div className="flex flex-col min-h-screen text-white selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <main className="relative z-10 flex-grow">
        {/* Hero Section */}
        <section className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center container mx-auto px-4 text-center py-12">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center max-w-4xl"
          >
            <motion.h1 
              variants={itemVariants}
              className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.88] text-glow mb-6"
            >
              SPEAK YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-pulse">TRUTH.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="max-w-2xl text-lg md:text-xl text-zinc-300 mb-10 leading-relaxed"
            >
              The world&apos;s most secure and fully featured anonymous messaging platform. 
              Share thoughts anonymously, exchange E2EE messages, send disappearing voice notes, and host public confessions.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold shadow-2xl shadow-primary/20 group">
                  Get Started 
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/board">
                <Button variant="outline" size="lg" className="h-14 px-10 rounded-full text-lg border-white/10 hover:bg-white/5 bg-white/5">
                  Confession Board
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Bento Grid Features Section */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Powerful Features. Absolute Privacy.
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-base md:text-lg">
              Explore the advanced cryptographic systems, moderation models, and custom audio layers driving our platform.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Card 1: Confession Board (Wide - col-span-2) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="md:col-span-2"
            >
              <Card className="bg-gradient-to-br from-rose-500/10 to-orange-500/10 border-rose-500/10 hover:border-rose-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col md:flex-row justify-between gap-6 overflow-hidden relative group backdrop-blur-sm">
                <div className="flex-1 flex flex-col justify-between z-10">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-6">
                      <Flame className="w-6 h-6 animate-pulse" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Confession Board</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm max-w-md">
                      Share your deepest secrets anonymously and read confessions from the community. Let off steam on our central public board without sharing your name.
                    </p>
                  </div>
                  <div className="mt-6 md:mt-0">
                    <Link href="/board">
                      <Button variant="link" className="text-rose-400 p-0 hover:text-rose-300 font-semibold text-sm">
                        Enter Confession Board <ArrowRight className="w-4 h-4 ml-1 inline" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Confession Mock Graphic */}
                <div className="flex-1 relative flex items-center justify-center min-h-[160px] md:min-h-0">
                  <div className="absolute inset-0 bg-radial-gradient from-rose-500/20 to-transparent blur-2xl opacity-55" />
                  <div className="flex flex-col gap-3 w-full max-w-[240px]">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="bg-zinc-900/80 border border-rose-500/15 px-4 py-2.5 rounded-2xl text-xs italic text-rose-300 shadow-lg -rotate-3"
                    >
                      &quot;I still listen to our shared playlist.&quot;
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      className="bg-zinc-900/80 border border-orange-500/15 px-4 py-2.5 rounded-2xl text-xs italic text-orange-300 shadow-lg translate-x-4 rotate-2"
                    >
                      &quot;I&apos;m resigning from my job tomorrow.&quot;
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                      className="bg-zinc-900/80 border border-rose-400/15 px-4 py-2.5 rounded-2xl text-xs italic text-rose-200 shadow-lg -translate-x-2 -rotate-1"
                    >
                      &quot;I bought the gift they wanted.&quot;
                    </motion.div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Card 2: Self-Destructing Audio (Tall - row-span-2) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:row-span-2"
            >
              <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/10 hover:border-amber-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative group backdrop-blur-sm">
                <div className="z-10">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-6">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">Self-Destruct Audio</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Record and send voice messages that self-destruct after being played exactly once. Use deep or chipmunk pitch filters to mask your natural vocal frequencies completely.
                  </p>
                </div>

                {/* Waveform Player Mock Graphic */}
                <div className="my-8 bg-zinc-900/80 border border-white/5 p-4 rounded-2xl space-y-4 relative z-10 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                      <Play className="w-4 h-4 fill-white" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        <span>Private Note</span>
                        <span className="text-amber-400 flex items-center gap-1"><Flame className="w-3 h-3" /> Burn after play</span>
                      </div>
                      <div className="flex items-end gap-1 h-6 py-1">
                        {[4, 8, 12, 10, 6, 8, 14, 16, 12, 8, 10, 6, 4, 8, 10, 14, 12, 6, 4].map((h, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [h, h * 1.5, h] }}
                            transition={{ duration: 1.5 + (i % 3) * 0.2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ height: `${h}px` }}
                            className="flex-grow bg-gradient-to-t from-amber-500 to-yellow-400 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-amber-500/30 text-[10px] font-bold text-amber-400 bg-amber-500/5">Chipmunk 🐿️</Badge>
                    <Badge variant="outline" className="border-white/10 text-[10px] font-bold text-zinc-500 hover:text-white">Deep Voice 🤖</Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Card 4: AI-Powered Toxic Shield (Wide - col-span-2) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="md:col-span-2"
            >
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col md:flex-row justify-between gap-6 overflow-hidden relative group backdrop-blur-sm">
                <div className="flex-1 flex flex-col justify-between z-10">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">AI-Powered Shield</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm max-w-md">
                      Preserve your mental space. Our AI moderation automatically flags toxic comments and &quot;tenderizes&quot; (rewrites) offensive messages into constructive feedback.
                    </p>
                  </div>
                  <div className="mt-6 md:mt-0 text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkle className="w-3 h-3 text-emerald-400" /> Powered by Advanced Natural Language Processing
                  </div>
                </div>

                {/* AI Shield Transform Mock */}
                <div className="flex-1 flex flex-col gap-3 justify-center min-h-[140px] md:min-h-0 relative">
                  <div className="absolute inset-0 bg-radial-gradient from-emerald-500/15 to-transparent blur-2xl opacity-40" />
                  
                  {/* Toxic Message */}
                  <div className="bg-rose-950/20 border border-rose-500/25 p-3 rounded-2xl text-xs space-y-1 relative max-w-[240px] shadow-md">
                    <div className="text-[9px] text-rose-400/60 uppercase font-black tracking-widest">Raw Input (Toxicity Flagged)</div>
                    <p className="text-rose-200 italic font-medium">&quot;Your presentation was garbage.&quot;</p>
                  </div>

                  {/* Sparkle Arrow */}
                  <div className="flex justify-center w-full max-w-[240px]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-sm">
                      ✨
                    </div>
                  </div>

                  {/* Tenderized Message */}
                  <div className="bg-emerald-950/20 border border-emerald-500/25 p-3 rounded-2xl text-xs space-y-1 relative max-w-[240px] shadow-md align-self-end ml-6">
                    <div className="text-[9px] text-emerald-400/70 uppercase font-black tracking-widest flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-emerald-400" /> Tenderized Message
                    </div>
                    <p className="text-emerald-200 italic font-medium">&quot;Your presentation could use some adjustments to be clearer.&quot;</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Card 3: End-to-End Encryption (Standard - col-span-1) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/10 hover:border-purple-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative group backdrop-blur-sm">
                <div className="z-10">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-6">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">E2EE Private Rooms</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Protect private conversation rooms with robust cryptographic E2EE keys generated directly inside your browser. Only you and the recipient hold the keys to read them.
                  </p>
                </div>

                {/* Cryptography Mock Graphic */}
                <div className="mt-8 flex items-center gap-4 py-2 border-t border-white/5">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400"><Key className="w-3.5 h-3.5" /></div>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 font-black text-[10px]">AES</div>
                  </div>
                  <span className="text-[10px] text-purple-400 font-mono tracking-wider font-bold">KEY EXCHANGE SECURED</span>
                </div>
              </Card>
            </motion.div>

            {/* Card 5: Shareable Profile QR Codes (Wide - md:col-span-2) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-2"
            >
              <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/10 hover:border-blue-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col md:flex-row justify-between gap-6 overflow-hidden relative group backdrop-blur-sm">
                <div className="flex-1 flex flex-col justify-between z-10">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-6">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Profile QR Codes</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm max-w-md">
                      Generate beautifully custom-branded vector QR codes for your profile page. Print them as stickers, use them in stories, or share them easily across your social media pages.
                    </p>
                  </div>
                </div>

                {/* QR Code Mock Graphic */}
                <div className="flex-1 flex items-center justify-center min-h-[140px] md:min-h-0 relative">
                  <div className="absolute inset-0 bg-radial-gradient from-blue-500/15 to-transparent blur-2xl opacity-40" />
                  <div className="w-28 h-28 rounded-2xl bg-zinc-950 border border-blue-500/30 p-3 flex items-center justify-center relative shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <div className="grid grid-cols-4 gap-2.5 w-full h-full opacity-70">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((i) => (
                        <div
                          key={i}
                          className={`rounded-sm ${
                            i === 1 || i === 4 || i === 13 || i === 16 || i === 6 || i === 7 || i === 10 || i === 11
                              ? "bg-blue-400"
                              : "bg-blue-400/20"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute w-8 h-8 rounded-lg bg-zinc-900 border border-blue-500/40 flex items-center justify-center">
                      <Ghost className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Card 7: Stranger Connect (Wide - md:col-span-2) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="md:col-span-2"
            >
              <Card className="bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col md:flex-row justify-between gap-8 overflow-hidden relative group backdrop-blur-sm">
                <div className="flex-1 flex flex-col justify-between z-10">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">Stranger Connect</h3>
                    <p className="text-zinc-400 leading-relaxed text-sm max-w-xl">
                      Browse anonymous profiles, make new connections, and establish encrypted private chats. Send prompts to start chats, accept inbox requests, and build your social network safely.
                    </p>
                  </div>
                  <div className="mt-6">
                    <Link href="/discover">
                      <Button variant="link" className="text-indigo-400 p-0 hover:text-indigo-300 font-semibold text-sm">
                        Discover Connections <ArrowRight className="w-4 h-4 ml-1 inline" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Connection Request Flow Mock Graphic */}
                <div className="flex-1 flex flex-col sm:flex-row gap-4 items-center justify-center min-h-[160px] md:min-h-0 relative">
                  <div className="absolute inset-0 bg-radial-gradient from-indigo-500/20 to-transparent blur-3xl opacity-50" />
                  
                  {/* Stranger Profile */}
                  <div className="bg-zinc-900/90 border border-white/5 p-4 rounded-2xl space-y-3 shadow-xl max-w-[190px] w-full relative z-10 hover:border-indigo-500/30 transition-colors duration-300">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-[10px] font-bold text-indigo-400 flex items-center justify-center">M</div>
                      <span className="text-xs font-bold text-white">@mystery_soul</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic">&quot;Always searching for secrets.&quot;</p>
                    <Button size="sm" className="w-full h-7 text-[10px] bg-indigo-500 hover:bg-indigo-600 text-white font-bold flex items-center gap-1 rounded-lg">
                      <UserPlus className="w-2.5 h-2.5" /> Connect
                    </Button>
                  </div>

                  {/* Connect Line Graphic */}
                  <div className="hidden sm:flex items-center justify-center text-indigo-500/50">
                    ➔
                  </div>

                  {/* Incoming request */}
                  <div className="bg-zinc-900/90 border border-indigo-500/20 p-4 rounded-2xl space-y-3 shadow-xl max-w-[190px] w-full relative z-10 hover:border-indigo-500/30 transition-colors duration-300">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400">Incoming</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-zinc-800 text-[10px] font-bold text-zinc-400 flex items-center justify-center">S</div>
                      <span className="text-xs font-bold text-white">@silent_one</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1 h-6 text-[9px] bg-primary text-black font-black flex items-center justify-center gap-0.5 rounded-md">
                        <Check className="w-2.5 h-2.5" /> Accept
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-6 text-[9px] border-white/10 text-white font-bold flex items-center justify-center gap-0.5 rounded-md">
                        <X className="w-2.5 h-2.5" /> Decline
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Card 6: Disappearing Chats (Standard - col-span-1) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-zinc-500/10 to-slate-500/10 border-zinc-500/10 hover:border-zinc-500/20 transition-all duration-300 rounded-3xl p-8 h-full flex flex-col justify-between overflow-hidden relative group backdrop-blur-sm">
                <div className="z-10">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center mb-6">
                    <EyeOff className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">Disappearing Chats</h3>
                  <p className="text-zinc-400 leading-relaxed text-sm">
                    Host ephemeral conversations that leave no footprints. Set customized message timers and expire chat rooms permanently when your discussions are completed.
                  </p>
                </div>

                {/* Disappearing Mock Graphic */}
                <div className="mt-8 flex justify-center py-2">
                  <div className="bg-zinc-900/80 border border-white/5 rounded-2xl p-3 flex items-center gap-3 w-full max-w-[200px] shadow-lg">
                    <Clock className="w-4 h-4 text-zinc-400 animate-spin" style={{ animationDuration: "10s" }} />
                    <div className="flex-1 space-y-1">
                      <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
                      <div className="w-16 h-1 bg-zinc-800 rounded-full" />
                    </div>
                    <Badge variant="outline" className="border-zinc-500/20 text-[9px] font-bold text-zinc-400 px-1 py-0 h-4">02:59</Badge>
                  </div>
                </div>
              </Card>
            </motion.div>

          </div>
        </section>

        {/* Carousel Section */}
        <section className="py-16 bg-transparent border-y border-white/5 my-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center mb-12 text-center">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 transition-colors">Real interactions, <span className="text-primary italic">anonymously.</span></h2>
              <p className="text-zinc-500 max-w-lg">Join thousands of users sharing their thoughts every single day.</p>
            </div>
            
            <Carousel
              plugins={[Autoplay({ delay: 3000 })]}
              className="w-full max-w-5xl mx-auto"
            >
              <CarouselContent>
                {messages.map((message, index) => (
                  <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3 pl-4">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="p-1"
                    >
                      <Card className="glass-card border-none h-64 flex flex-col p-6">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 animate-pulse" />
                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{message.title}</span>
                          </div>
                          <p className="text-zinc-300 font-medium leading-relaxed italic">{message.content}</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[10px] text-zinc-600 font-bold uppercase">{message.received}</span>
                          <div className="flex gap-1">
                            {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-primary/30" />)}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-12 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-8 md:p-12 rounded-[3rem] bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10 border border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent)]" />
            <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 relative z-10 text-white">READY TO DROP <br /> THE MASK?</h2>
            <div className="relative z-10">
              <Link href="/sign-up">
                <Button size="lg" className="h-16 px-12 rounded-full text-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors">
                  Create Your Link
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-600">
        <div className="flex items-center gap-2">
          <Ghost className="w-4 h-4 text-white" />
          <span className="text-sm font-bold tracking-widest uppercase text-white">Veil</span>
        </div>
        <p className="text-xs uppercase tracking-widest">© 2025 Veil Anonymous Platforms. VEIL @ All rights reserved.</p>
        <div className="flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors">
          <button onClick={() => setActiveModal('privacy')} className="hover:text-white transition-colors cursor-pointer outline-none">Privacy</button>
          <button onClick={() => setActiveModal('terms')} className="hover:text-white transition-colors cursor-pointer outline-none">Terms</button>
          <button onClick={() => setActiveModal('security')} className="hover:text-white transition-colors cursor-pointer outline-none">Security</button>
        </div>
      </footer>

      {/* Justification Modal */}
      <Dialog open={!!activeModal} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg rounded-3xl p-6 sm:p-8">
          {currentModal && (
            <div className="space-y-6">
              <DialogHeader className="text-left space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${currentModal.color}`}>
                    <currentModal.icon className="w-6 h-6" />
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${currentModal.color}`}>
                    {currentModal.badge}
                  </Badge>
                </div>
                <DialogTitle className="text-2xl font-bold text-white pt-2">
                  {currentModal.title}
                </DialogTitle>
                <DialogDescription className="text-zinc-400 text-sm">
                  {currentModal.subtitle}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {currentModal.items.map((item, index) => (
                  <div key={index} className="bg-zinc-900/80 border border-white/5 p-4 rounded-2xl space-y-1">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {item.heading}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed pl-3">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl px-6 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                >
                  Close Note
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}