"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { Bell, UserPlus, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

interface Sender {
  _id: string;
  username: string;
  bio: string;
}

interface ConnectionRequest {
  _id: string;
  sender: Sender;
  createdAt: string;
}

interface NotificationDropdownProps {
  pendingRequestsCount: number;
  setPendingRequestsCount: React.Dispatch<React.SetStateAction<number>>;
}

export default function NotificationDropdown({
  pendingRequestsCount,
  setPendingRequestsCount,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"accept" | "decline" | null>(null);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/connections/requests/inbox");
      if (res.data.success) {
        setRequests(res.data.requests);
        setPendingRequestsCount(res.data.requests.length);
      }
    } catch (err) {
      console.error("Failed to fetch connection requests:", err);
    } finally {
      setLoading(false);
    }
  }, [setPendingRequestsCount]);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, fetchRequests]);

  const handleAction = async (requestId: string, action: "accept" | "decline") => {
    setActioningId(requestId);
    setActionType(action);
    try {
      const res = await axios.patch(`/api/connections/request/${requestId}`, {
        action,
      });

      if (res.data.success) {
        toast({
          title: action === "accept" ? "Connection Accepted" : "Connection Declined",
          description: res.data.message,
        });

        // Remove from local list
        setRequests((prev) => prev.filter((req) => req._id !== requestId));
        setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to process request";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setActioningId(null);
      setActionType(null);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-full border-white/10 bg-white/5 hover:bg-white/10 transition-all h-9 w-9 flex items-center justify-center cursor-pointer"
        >
          <Bell className="h-4.5 w-4.5 text-foreground" />
          {pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[calc(100vw-2rem)] sm:w-96 max-w-sm glass-card border border-white/10 text-foreground p-2 max-h-[80dvh] overflow-y-auto"
      >
        <DropdownMenuLabel className="font-semibold text-sm px-3 py-2 flex items-center justify-between">
          <span>Connection Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="text-xs text-muted-foreground font-normal">
              {pendingRequestsCount} pending
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10 my-1" />

        {loading ? (
          <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              Loading requests...
            </span>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center gap-2 px-4">
            <div className="bg-white/5 p-2.5 rounded-full border border-white/5">
              <UserPlus className="h-5 w-5 text-muted-foreground/75" />
            </div>
            <span className="text-sm font-semibold text-muted-foreground/90">
              No Pending Requests
            </span>
            <span className="text-xs text-muted-foreground max-w-[200px]">
              {"When people request to connect, they'll show up here."}
            </span>
          </div>
        ) : (
          <div className="space-y-1.5 py-1">
            {requests.map((req) => (
              <DropdownMenuItem
                key={req._id}
                className="focus:bg-white/5 focus:text-foreground rounded-lg p-3 border border-transparent hover:border-white/5 transition-all flex flex-col gap-2.5 items-start cursor-default"
              >
                <div className="w-full">
                  <div className="flex justify-between items-start w-full">
                    <span className="font-bold text-sm tracking-tight">
                      @{req.sender.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground/80 font-mono">
                      {dayjs(req.createdAt).fromNow()}
                    </span>
                  </div>
                  {req.sender.bio && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {req.sender.bio}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 w-full justify-end mt-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actioningId !== null}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAction(req._id, "decline");
                    }}
                    className="h-7 px-3 text-xs border-white/10 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 rounded-full flex items-center gap-1 transition-all"
                  >
                    {actioningId === req._id && actionType === "decline" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    Decline
                  </Button>

                  <Button
                    size="sm"
                    disabled={actioningId !== null}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAction(req._id, "accept");
                    }}
                    className="h-7 px-3 text-xs bg-primary hover:bg-primary/90 text-black font-semibold rounded-full flex items-center gap-1 transition-all"
                  >
                    {actioningId === req._id && actionType === "accept" ? (
                      <Loader2 className="h-3 w-3 animate-spin text-black" />
                    ) : (
                      <Check className="h-3 w-3 text-black" />
                    )}
                    Accept
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
