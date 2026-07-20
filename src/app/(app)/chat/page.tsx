"use client";

import React from "react";
import { MessageSquare } from "lucide-react";

export default function ChatPlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center p-6 space-y-6">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
        <MessageSquare className="w-8 h-8 text-gray-500" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-300">Your Conversations</h3>
        <p className="text-gray-500 text-xs sm:text-sm">
          Select a chat from the sidebar to start messaging.
        </p>
      </div>
    </div>
  );
}
