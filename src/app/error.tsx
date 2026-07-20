"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-4 bg-destructive/10 rounded-full text-destructive">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">Something went wrong</h2>
      <p className="text-zinc-400 text-xs sm:text-sm max-w-md">
        An unexpected error occurred while loading this page. Please try again or refresh your browser.
      </p>
      <Button
        onClick={() => reset()}
        className="bg-primary text-black hover:bg-primary/80 font-bold px-6 py-2 rounded-xl text-xs transition-all"
      >
        Try Again
      </Button>
    </div>
  );
}
