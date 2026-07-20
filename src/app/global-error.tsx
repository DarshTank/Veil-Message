"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-2">Application Error</h1>
        <p className="text-zinc-400 text-sm mb-6 max-w-md">
          A critical error occurred. Please try reloading the page.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-200 transition-all cursor-pointer"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
