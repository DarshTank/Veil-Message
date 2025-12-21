"use client";

import MessageCard from "@/components/MessageCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/model/User.model";
import { acceptMessageSchema } from "@/schemas/acceptMessageSchema";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2, RefreshCcw, Copy } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";

const Page = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const isInitialLoad = useRef(true);

  const { toast } = useToast();
  const { data: session, status } = useSession();
  const form = useForm({ resolver: zodResolver(acceptMessageSchema) });
  const { register, watch, setValue } = form;

  const acceptMessage = watch("acceptMessages");

  const fetchData = useCallback(async (refresh = false) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const [messagesResponse, acceptResponse] = await Promise.all([
        axios.get<ApiResponse>("/api/get-messages"),
        axios.get<ApiResponse>("/api/accept-messages"),
      ]);

      setMessages(messagesResponse.data.messages || []);
      setValue("acceptMessages", acceptResponse.data.isAcceptingMessage ?? true);

      if (refresh) {
        toast({
          title: "Refreshed Messages",
          description: "Showing latest Messages",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [setValue, toast, isLoading]);

  useEffect(() => {
    if (status === "authenticated" && isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchData();
    }
  }, [status, fetchData]);

  const handleSwitchChange = async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.post<ApiResponse>("/api/accept-messages", {
        acceptMessages: !acceptMessage,
      });
      setValue("acceptMessages", !acceptMessage);
      toast({
        title: response.data.message,
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message || "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSwitchLoading(false);
    }
  };

  const copyToClipboard = () => {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    const profileUrl = `${baseUrl}/u/${session?.user?.username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "Profile URL copied",
      description: "Profile URL has been copied to clipboard",
    });
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <Button onClick={() => window.location.href = "/sign-in"}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
            User Dashboard
          </h1>

          <div className="glass-card p-6 rounded-lg mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />
              Copy Your Unique Link
            </h2>
            <div className="flex items-center gap-2">
              <div className="relative flex-grow">
                <input
                  type="text"
                  value={`${window.location.protocol}//${window.location.host}/u/${session?.user?.username}`}
                  disabled
                  className="w-full p-3 pr-12 rounded-md bg-background/50 border border-input focus:ring-2 focus:ring-primary transition-all text-muted-foreground"
                />
              </div>
              <Button onClick={copyToClipboard} className="shrink-0">
                Copy
              </Button>
            </div>
          </div>

          <div className="glass-card p-6 rounded-lg mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Switch
                {...register("acceptMessages")}
                checked={acceptMessage}
                onCheckedChange={handleSwitchChange}
                disabled={isSwitchLoading}
              />
              <span className="font-medium">
                Accept Messages: <span className={acceptMessage ? "text-green-500" : "text-red-500"}>{acceptMessage ? "On" : "Off"}</span>
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchData(true)}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </motion.div>

        <Separator className="my-8 opacity-50" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <motion.div
                key={message._id as string}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <MessageCard
                  message={message}
                  onMessageDelete={(id) =>
                    setMessages(messages.filter((msg) => msg._id !== id))
                  }
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p className="text-xl">No messages yet.</p>
              <p className="text-sm mt-2">Share your link to start receiving anonymous feedback!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page;
