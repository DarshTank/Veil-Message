"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Ghost, Home, MessageSquare, Compass, ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg z-10 text-center"
      >
        {/* Glassmorphic Container Card */}
        <div className="relative backdrop-blur-2xl bg-black/40 border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-3xl p-8 sm:p-10 overflow-hidden">
          {/* Subtle top accent highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70" />

          {/* Animated Floating Ghost & 404 Badge */}
          <div className="flex flex-col items-center justify-center mb-6">
            <motion.div
              animate={{
                y: [0, -10, 0],
                rotate: [0, 2, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative p-5 rounded-2xl bg-purple-950/40 border border-purple-500/30 shadow-[0_0_30px_rgba(168,85,247,0.25)] mb-4"
            >
              <Ghost className="w-16 h-16 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full blur-xs"
              />
            </motion.div>

            {/* Glowing 404 Text */}
            <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight bg-gradient-to-b from-white via-purple-100 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.4)]">
              404
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              <span>LOST BEYOND THE VEIL</span>
            </div>
          </div>

          {/* Title & Description */}
          <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">
            Page Not Found
          </h2>

          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md mx-auto">
            The page or link you are trying to reach doesn&apos;t exist, has been removed, or is restricted outside allowed routes.
          </p>

          {/* Action Links */}
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300 transform active:scale-[0.98]"
            >
              <Home className="w-4 h-4" />
              <span>Return to Home</span>
            </Link>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/chat"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-purple-200 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-200"
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Go to Chat</span>
              </Link>

              <Link
                href="/board"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium text-purple-200 bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-200"
              >
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Public Board</span>
              </Link>
            </div>

            <button
              onClick={() => router.back()}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go back to previous page</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
