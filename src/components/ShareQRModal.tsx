"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Download, QrCode } from "lucide-react";

interface ShareQRModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
}

export function ShareQRModal({ isOpen, onOpenChange, username }: ShareQRModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const profileUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}/u/${username}`
    : "";

  useEffect(() => {
    if (isOpen && profileUrl) {
      QRCode.toDataURL(
        profileUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#1e1b4b", // Deep indigo matching the app's aesthetic
            light: "#ffffff",
          },
        },
        (err, url) => {
          if (err) {
            console.error(err);
            toast({
              title: "Error",
              description: "Failed to generate QR code",
              variant: "destructive",
            });
            return;
          }
          setQrCodeUrl(url);
        }
      );
    }
  }, [isOpen, profileUrl, toast]);

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Profile URL copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement("a");
    link.href = qrCodeUrl;
    link.download = `${username}-veil-profile-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Success",
      description: "QR Code downloaded successfully",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 text-white rounded-2xl max-w-sm sm:max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
            <QrCode className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            Share Your Profile
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs sm:text-sm">
            Scan this QR code or copy the link below to receive anonymous messages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {/* QR Code Container with nice glow effects */}
          <div className="relative p-4 bg-white rounded-2xl shadow-2xl border border-white/20 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            {qrCodeUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            ) : (
              <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-zinc-500">
                Generating...
              </div>
            )}
          </div>

          {/* Quick link display */}
          <div className="w-full flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 pl-3">
            <span className="font-mono text-xs text-zinc-400 truncate flex-grow">
              {profileUrl}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyLink}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg shrink-0"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:space-x-2 border-t border-white/5 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto border-white/10 text-white hover:bg-white/5 rounded-xl"
          >
            Close
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!qrCodeUrl}
            className="w-full sm:w-auto bg-primary hover:bg-primary/85 text-white rounded-xl gap-2 font-semibold shadow-lg shadow-primary/20"
          >
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
