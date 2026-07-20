"use client";

import React, { useState } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Flag, Loader2, ShieldAlert, AlertTriangle } from "lucide-react";

interface ReportUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUsername: string;
}

const CATEGORIES = [
  { id: "harassment", label: "Harassment & Bullying" },
  { id: "spam", label: "Spam & Unwanted Behavior" },
  { id: "inappropriate", label: "Inappropriate / Offensive Content" },
  { id: "impersonation", label: "Impersonation or Fake Profile" },
  { id: "other", label: "Other Violation" },
];

export default function ReportUserModal({
  isOpen,
  onClose,
  reportedUsername,
}: ReportUserModalProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState("harassment");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please enter details explaining why you are reporting this user.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post("/api/user/report", {
        reportedUsername,
        category,
        reason: reason.trim(),
      });

      if (res.data.success) {
        toast({
          title: "User Reported",
          description: res.data.message || `Report for @${reportedUsername} submitted to moderation.`,
        });
        setReason("");
        setCategory("harassment");
        onClose();
      }
    } catch (err: any) {
      toast({
        title: "Report Failed",
        description: err.response?.data?.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-zinc-950 border border-white/10 text-white rounded-2xl max-w-md w-full p-6 max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-rose-500">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20">
              <Flag className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Report @{reportedUsername}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-gray-400">
            Help us maintain a safe community. Submissions are reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Category
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs text-left transition-all ${
                    category === cat.id
                      ? "bg-rose-500/10 border-rose-500/50 text-rose-400 font-semibold"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{cat.label}</span>
                  {category === cat.id && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Reason / Explanation <span className="text-rose-400">*</span>
            </label>
            <Textarea
              placeholder="Describe the issue or specify what happened..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-xs min-h-[90px] rounded-xl focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-transparent border-white/10 text-white hover:bg-white/5 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                  Submit Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
