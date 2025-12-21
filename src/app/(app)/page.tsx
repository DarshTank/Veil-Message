"use client";

import { Shield, ArrowRight, MessageSquare, Ghost, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";
import messages from "@/messages.json";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen text-white selection:bg-primary selection:text-primary-foreground overflow-x-hidden">
      <main className="relative z-10 flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-16 pb-8 md:pt-24 md:pb-12 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center"
          >
            <motion.div variants={itemVariants}>
              <Badge variant="outline" className="mb-6 py-1 px-4 rounded-full border-primary/20 bg-primary/5 text-primary-foreground animate-pulse">
                Now in Private Beta
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-glow mb-8"
            >
              SPEAK YOUR <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-primary animate-pulse">TRUTH.</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="max-w-xl text-lg md:text-xl text-zinc-300 mb-10 leading-relaxed"
            >
              The world&apos;s most elegant anonymous messaging platform. 
              Share thoughts, gather feedback, and connect without the bias of identity.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link href="/sign-up">
                <Button size="lg" className="h-14 px-10 rounded-full text-lg font-bold shadow-2xl shadow-primary/20 group">
                  Get Started 
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="outline" size="lg" className="h-14 px-10 rounded-full text-lg border-white/10 hover:bg-white/5">
                  How it works
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: Shield, 
                title: "Obsessive Privacy", 
                desc: "We don't just hide your name; we encrypt your existence. No trackers, no cookies, just pure connection." 
              },
              { 
                icon: MessageSquare, 
                title: "Honest Feedback", 
                desc: "Get the raw truth from your friends or audience. No masks, no personas, just authentic dialogue." 
              },
              { 
                icon: EyeOff, 
                title: "Zero Identity", 
                desc: "Your data is ephemeral. What happens in the shadows, stays in the shadows. We keep no logs." 
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card border-none p-8 h-full hover:bg-white/[0.05] transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Carousel Section */}
        <section className="py-16 bg-transparent border-y border-white/5">
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
                          <p className="text-zinc-300 font-medium leading-relaxed italic">"{message.content}"</p>
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
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/security" className="hover:text-white">Security</Link>
        </div>
      </footer>
    </div>
  );
}