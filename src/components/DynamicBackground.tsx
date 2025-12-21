"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export default function DynamicBackground() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const y2 = useTransform(scrollY, [0, 500], [0, -150]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <motion.div 
        style={{ y: y1 }}
        className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px] opacity-50"
      />
      <motion.div 
        style={{ y: y2 }}
        className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[100px]"
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    </div>
  );
}
