"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { usernameValidation } from "@/schemas/signUpSchema";
import axios, { AxiosError } from "axios";
import { ApiResponse } from "@/types/ApiResponse";
import { useSession } from "next-auth/react";
import { useE2ee } from "@/context/E2eeContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, User, Key, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const setupSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  chatProtectionPassword: z.string().min(4, "Chat protection password must be at least 4 characters long"),
});

const SetupAccount = () => {
  const [username, setUsername] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showChatPassword, setShowChatPassword] = useState(false);

  const debounce = useDebounceCallback(setUsername, 300);
  const { toast } = useToast();
  const router = useRouter();
  const { data: session, update } = useSession();
  const { setupE2ee } = useE2ee();

  const isGoogleUser = session?.user?.authProvider === "google";

  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      username: session?.user?.username || "",
      password: "",
      chatProtectionPassword: "",
    },
  });

  useEffect(() => {
    if (!isGoogleUser) return;
    const checkUsernameUnique = async () => {
      if (username) {
        setIsCheckingUsername(true);
        setUsernameMessage("");
        try {
          const response = await axios.get(
            `/api/check-username-unique?username=${username}`
          );
          if (session?.user?.username === username) {
            setUsernameMessage("This is your current username");
          } else {
            setUsernameMessage(response.data.message);
          }
        } catch (error) {
          const axiosError = error as AxiosError<ApiResponse>;
          setUsernameMessage(
            axiosError.response?.data.message ?? "Error checking username"
          );
        } finally {
          setIsCheckingUsername(false);
        }
      }
    };
    checkUsernameUnique();
  }, [username, session, isGoogleUser]);

  const onSubmit = async (data: z.infer<typeof setupSchema>) => {
    if (isGoogleUser) {
      const usernameCheck = usernameValidation.safeParse(data.username);
      if (!usernameCheck.success) {
        form.setError("username", { message: usernameCheck.error.errors[0]?.message || "Invalid username" });
        return;
      }
      if (!data.password || data.password.length < 6) {
        form.setError("password", { message: "Account password must be at least 6 characters long" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // 1. Submit account details to backend
      const response = await axios.post<ApiResponse>("/api/setup-account", data);
      
      // 2. Setup E2EE Chat Protection with protection password
      await setupE2ee(data.chatProtectionPassword);

      toast({
        title: "Account Setup Complete!",
        description: response.data.message || "Your chat protection password has been saved.",
      });

      // 3. Update session to reflect setup is complete
      await update({
        ...session,
        user: {
          ...session?.user,
          username: data.username || session?.user?.username,
          isAccountSetupCompleted: true,
        }
      });

      window.location.href = "/chat";
    } catch (error) {
      console.error("Error setting up account:", error);
      const axiosError = error as AxiosError<ApiResponse>;
      const errorMessage =
        axiosError.response?.data.message ??
        "There was a problem setting up your account. Please try again.";
      toast({
        title: "Setup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-6 glass-card rounded-2xl border border-white/10 shadow-2xl mx-4 relative overflow-hidden"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-rose-400 tracking-tight mb-2">
            {isGoogleUser ? "Complete Profile Setup" : "Set Chat Protection Password"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {isGoogleUser
              ? "Set your custom username, account password, and chat protection password."
              : "Create your chat protection password to initialize end-to-end encryption for your DMs."}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Custom Username (Google Users Only) */}
            {isGoogleUser && (
              <FormField
                name="username"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <User className="h-3.5 w-3.5" /> Custom Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="Choose a username"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            debounce(e.target.value);
                          }}
                          className="bg-white/[0.03] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-sm h-10 rounded-xl transition-all duration-300"
                        />
                        {isCheckingUsername && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="animate-spin h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {username && usernameMessage && (
                      <p
                        className={`text-xs mt-1 ${
                          usernameMessage === "Username is unique" ||
                          usernameMessage.includes("current")
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {usernameMessage}
                      </p>
                    )}
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Account Password (Google Users Only) */}
            {isGoogleUser && (
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Key className="h-3.5 w-3.5" /> Account Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showAccountPassword ? "text" : "password"}
                          placeholder="Create a strong account password"
                          {...field}
                          className="bg-white/[0.03] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-sm h-10 rounded-xl transition-all duration-300 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAccountPassword(!showAccountPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          title={showAccountPassword ? "Hide password" : "Show password"}
                        >
                          {showAccountPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-rose-400" />
                  </FormItem>
                )}
              />
            )}

            {/* Chat Protection Password (Required for All Users) */}
            <FormField
              name="chatProtectionPassword"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Lock className="h-3.5 w-3.5 text-purple-400" /> Chat Protection Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showChatPassword ? "text" : "password"}
                        placeholder="PIN/Password for Chat End-to-End Encryption"
                        {...field}
                        className="bg-white/[0.03] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-sm h-10 rounded-xl transition-all duration-300 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowChatPassword(!showChatPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        title={showChatPassword ? "Hide password" : "Show password"}
                      >
                        {showChatPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    Used to encrypt and unlock your private end-to-end direct messages.
                  </p>
                  <FormMessage className="text-xs text-rose-400" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl font-semibold text-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </Form>
      </motion.div>
    </div>
  );
};

export default SetupAccount;
