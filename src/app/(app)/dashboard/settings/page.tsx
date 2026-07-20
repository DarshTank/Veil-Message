"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { 
  ChevronLeft, 
  Loader2, 
  User, 
  Shield, 
  KeyRound, 
  FileText, 
  MessageSquareOff, 
  Sparkles,
  Link as LinkIcon,
  Eye,
  EyeOff
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useE2ee } from "@/context/E2eeContext";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

const bioSchema = z.object({
  bio: z.string().max(300, "Bio must be less than 300 characters"),
});

const accountSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const Settings = () => {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const { e2eeStatus, resetE2eeKeys } = useE2ee();

  // Tab State
  const [activeTab, setActiveTab] = useState<"profile" | "account" | "privacy">("profile");

  // Loading States
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<{
    field: string;
    value: string;
  } | null>(null);

  // Privacy Settings States
  const [isAcceptingMessages, setIsAcceptingMessages] = useState(true);
  const [isAcceptingMessagesLoading, setIsAcceptingMessagesLoading] = useState(false);
  const [isShieldEnabled, setIsShieldEnabled] = useState(true);
  const [isShieldLoading, setIsShieldLoading] = useState(false);


  // Password Reset Modal State
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"send" | "verify">("send");
  const [isSendingPwOtp, setIsSendingPwOtp] = useState(false);
  const [isResettingPw, setIsResettingPw] = useState(false);
  const [pwOtp, setPwOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const bioForm = useForm<z.infer<typeof bioSchema>>({
    resolver: zodResolver(bioSchema),
    defaultValues: {
      bio: "",
    },
  });

  const accountForm = useForm<z.infer<typeof accountSchema>>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  });

  // Load Settings Data
  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.username) {
        try {
          const response = await axios.get(
            `/api/get-public-profile?username=${session.user.username}`
          );
            if (response.data.success && response.data.user) {
              bioForm.setValue("bio", response.data.user.bio || "");
            }
        } catch (error) {
          console.error("Error fetching profile:", error);
          bioForm.setValue("bio", session.user.bio || "");
        }
      }
    };

    const fetchAcceptMessages = async () => {
      try {
        const response = await axios.get<ApiResponse>("/api/accept-messages");
        const acceptStatus = response.data.isAcceptingMessage ?? 
                             (response.data as { isAcceptingMessages?: boolean }).isAcceptingMessages ?? 
                             true;
        setIsAcceptingMessages(acceptStatus);
      } catch (error) {
        console.error("Error fetching accept messages status:", error);
      }
    };

    if (session?.user) {
      accountForm.setValue("username", session.user.username || "");
      accountForm.setValue("email", session.user.email || "");
      setIsShieldEnabled(session.user.isShieldEnabled ?? true);
      fetchProfile();
      fetchAcceptMessages();
    }
  }, [session, bioForm, accountForm]);

  const onBioSubmit = async (data: z.infer<typeof bioSchema>) => {
    setIsBioLoading(true);
    try {
      const response = await axios.post<ApiResponse>("/api/update-bio", data);
      toast({
        title: "Success",
        description: response.data.message,
      });
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            bio: data.bio,
          }
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to update bio",
        variant: "destructive",
      });
    } finally {
      setIsBioLoading(false);
    }
  };

  const onAccountSubmit = async (data: z.infer<typeof accountSchema>) => {
    const currentUsername = session?.user?.username;
    const currentEmail = session?.user?.email;

    if (data.username !== currentUsername) {
      setPendingUpdate({ field: "username", value: data.username });
    } else if (data.email !== currentEmail) {
      setPendingUpdate({ field: "email", value: data.email });
    } else {
      toast({
        title: "No changes",
        description: "You haven't made any changes to your account.",
      });
      return;
    }

    setIsOtpLoading(true);
    try {
      const response = await axios.post<ApiResponse>("/api/send-otp");
      toast({
        title: "OTP Sent",
        description: response.data.message,
      });
      setIsOtpOpen(true);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsOtpLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!pendingUpdate) return;
    setIsVerifying(true);
    try {
      const response = await axios.post<ApiResponse>("/api/update-account", {
        otp,
        field: pendingUpdate.field,
        value: pendingUpdate.value,
      });
      toast({
        title: "Success",
        description: response.data.message,
      });
      setIsOtpOpen(false);
      setOtp("");
      
      // Update session locally
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            [pendingUpdate.field]: pendingUpdate.value,
          }
        });
      }

      setPendingUpdate(null);
      if (
        pendingUpdate.field === "username" ||
        pendingUpdate.field === "email"
      ) {
        toast({
          title: "Session Updated",
          description: "Your account details have changed successfully.",
        });
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Verification Failed",
        description:
          axiosError.response?.data.message ?? "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Password Reset Functions
  const handleOpenPasswordReset = () => {
    setIsPasswordOpen(true);
    setPasswordStep("send");
    setPwOtp("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSendPasswordOtp = async () => {
    setIsSendingPwOtp(true);
    try {
      const response = await axios.post<ApiResponse>("/api/send-otp");
      toast({
        title: "Code Sent",
        description: response.data.message || "A verification code has been sent to your email.",
      });
      setPasswordStep("verify");
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description: axiosError.response?.data.message ?? "Failed to send verification code.",
        variant: "destructive",
      });
    } finally {
      setIsSendingPwOtp(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setIsResettingPw(true);
    try {
      const response = await axios.post<ApiResponse>("/api/reset-password", {
        username: session?.user?.username,
        otp: pwOtp,
        newPassword,
      });
      toast({
        title: "Password Updated",
        description: response.data.message || "Your password has been changed successfully.",
      });
      setIsPasswordOpen(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Reset Failed",
        description: axiosError.response?.data.message ?? "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPw(false);
    }
  };

  // Switch Toggles
  const handleSwitchChange = async () => {
    setIsAcceptingMessagesLoading(true);
    const targetState = !isAcceptingMessages;
    try {
      const response = await axios.post<ApiResponse>("/api/accept-messages", {
        acceptMessages: targetState,
      });
      setIsAcceptingMessages(targetState);
      toast({
        title: response.data.message,
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
      setIsAcceptingMessagesLoading(false);
    }
  };

  const handleShieldToggle = async () => {
    setIsShieldLoading(true);
    const targetState = !isShieldEnabled;
    try {
      const response = await axios.post("/api/toggle-shield", {
        isShieldEnabled: targetState,
      });
      setIsShieldEnabled(targetState);
      
      // Update session locally
      if (session) {
        await updateSession({
          ...session,
          user: {
            ...session.user,
            isShieldEnabled: targetState,
          }
        });
      }

      toast({
        title: response.data.message || `AI Shield ${targetState ? "enabled" : "disabled"}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update AI Shield setting.",
        variant: "destructive",
      });
    } finally {
      setIsShieldLoading(false);
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl text-white">
      <div className="space-y-8">
        
        {/* Back navigation & Page Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="p-2 border border-white/5 rounded-xl bg-white/5 hover:bg-white/10 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
              Settings
            </h1>
            <p className="text-muted-foreground text-xs">
              Manage your identity, safety options, and profile preferences.
            </p>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-white/10 pr-0 md:pr-4 shrink-0">
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === "profile" 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <User className="h-4 w-4" />
              Profile Details
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === "account" 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              Account Security
            </button>
            <button
              onClick={() => setActiveTab("privacy")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === "privacy" 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className="h-4 w-4" />
              Privacy & Filters
            </button>
          </div>

          {/* Form Content Area */}
          <div className="md:col-span-3 min-h-[450px]">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Profile Details */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Hero card */}
                  <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 border border-primary/20 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-inner">
                        {session?.user?.username?.charAt(0).toUpperCase() || "V"}
                      </div>
                      <div className="text-center sm:text-left flex-grow">
                        <h2 className="text-xl font-bold">@{session?.user?.username || "anonymous"}</h2>
                        <p className="text-zinc-500 text-xs mt-0.5">Your profile is active and encryption-secured.</p>
                      </div>
                      <Button
                        onClick={copyToClipboard}
                        size="sm"
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/5 gap-1.5 shrink-0 rounded-xl"
                      >
                        <LinkIcon className="h-3.5 w-3.5" />
                        Copy Profile URL
                      </Button>
                    </div>
                  </div>

                  {/* Bio Form */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                      <FileText className="h-5 w-5 text-primary" />
                      Public Bio
                    </h3>
                    <Form {...bioForm}>
                      <form
                        onSubmit={bioForm.handleSubmit(onBioSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={bioForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-zinc-400">Bio description (shown on your public anonymous link)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Tell visitors a little about yourself or set some guidelines for notes..."
                                  className="bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary min-h-[120px] rounded-xl text-white resize-none"
                                  maxLength={300}
                                  {...field}
                                />
                              </FormControl>
                              <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1">
                                <span>Be authentic. Maximum 300 characters.</span>
                                <span>{field.value?.length || 0} / 300</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          disabled={isBioLoading}
                          className="bg-primary text-white hover:bg-primary/80 py-5 px-6 rounded-xl font-semibold shadow-lg shadow-primary/20"
                        >
                          {isBioLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Changes"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Account Security */}
              {activeTab === "account" && (
                <motion.div
                  key="account-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-6 rounded-2xl border border-white/5">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Account Credentials
                    </h3>
                    <p className="text-xs text-zinc-400 mb-6">Updating your email or username requires OTP validation.</p>
                    
                    <Form {...accountForm}>
                      <form
                        onSubmit={accountForm.handleSubmit(onAccountSubmit)}
                        className="space-y-5"
                      >
                        <FormField
                          control={accountForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-zinc-400">Username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Username"
                                  className="bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary rounded-xl text-white py-5"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={accountForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-zinc-400">Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Email"
                                  className="bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary rounded-xl text-white py-5"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button 
                          type="submit" 
                          disabled={isOtpLoading}
                          className="bg-primary text-white hover:bg-primary/80 py-5 px-6 rounded-xl font-semibold shadow-lg shadow-primary/20"
                        >
                          {isOtpLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Verification...
                            </>
                          ) : (
                            "Request Account Update"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </div>

                  {/* Password Reset Section */}
                  <div className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                      <h4 className="font-bold text-sm">Security Password</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Change your password by receiving a code on your email.</p>
                    </div>
                    <Button
                      variant="outline"
                      className="border-white/10 text-white hover:bg-white/5 rounded-xl py-5"
                      onClick={handleOpenPasswordReset}
                    >
                      <KeyRound className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Privacy & Filters */}
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Privacy Settings & AI Protection
                    </h3>

                    {/* Accept messages toggle */}
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl gap-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <MessageSquareOff className="h-4 w-4 text-rose-400" />
                          Accept Messages
                        </span>
                        <span className="text-xs text-zinc-500 block leading-relaxed max-w-md">
                          Allow users to send anonymous notes to your public profile link.
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isAcceptingMessages}
                          onCheckedChange={handleSwitchChange}
                          disabled={isAcceptingMessagesLoading}
                        />
                      </div>
                    </div>

                    {/* AI Shield */}
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl gap-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          AI Empathy Shield
                        </span>
                        <span className="text-xs text-zinc-500 block leading-relaxed max-w-md">
                          Tenderize and filter toxic notes automatically using AI analysis.
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isShieldEnabled}
                          onCheckedChange={handleShieldToggle}
                          disabled={isShieldLoading}
                        />
                      </div>
                    </div>



                    {/* End-to-End Encryption */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-primary" />
                        End-to-End Encryption (E2EE)
                      </h4>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-2xl">
                        <div>
                          <p className="text-xs font-semibold text-gray-300">
                            Status:{" "}
                            <span
                              className={`uppercase tracking-wider font-bold ${
                                e2eeStatus === "ready"
                                  ? "text-emerald-400"
                                  : e2eeStatus === "unlock_needed"
                                  ? "text-amber-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {e2eeStatus === "ready"
                                ? "Active & Decrypted"
                                : e2eeStatus === "unlock_needed"
                                ? "Locked (PIN Required)"
                                : "Not Set Up"}
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-500 mt-1 max-w-md leading-relaxed">
                            Your direct chats are encrypted client-side. Resetting keys creates a new keypair, which resets access to older encrypted messages.
                          </p>
                        </div>
                        {e2eeStatus !== "setup_needed" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="rounded-xl px-4 py-4"
                            onClick={async () => {
                              if (confirm("Are you sure you want to reset your encryption keys? You will lose access to decrypting older messages on this device if you don't remember your PIN.")) {
                                await resetE2eeKeys();
                                toast({
                                  title: "Keys Reset Successful",
                                  description: "You can now configure a new Chat PIN.",
                                });
                              }
                            }}
                          >
                            Reset Keys
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

        </div>

      </div>

      {/* Account Update OTP Dialog */}
      <Dialog open={isOtpOpen} onOpenChange={setIsOtpOpen}>
        <DialogContent className="glass-card border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Verify Changes</DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              We sent a verification code to your email. Please enter it below to confirm this change.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center text-lg tracking-widest bg-black/40 border-white/10 focus:border-primary rounded-xl py-5"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOtpOpen(false)}
              disabled={isVerifying}
              className="border-white/10 hover:bg-white/5 text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={verifyOtp}
              disabled={isVerifying || otp.length < 6}
              className="bg-primary hover:bg-primary/85 text-white rounded-xl"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="glass-card border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <KeyRound className="h-5 w-5 text-primary" />
              {passwordStep === "send" ? "Reset Password" : "Enter New Password"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              {passwordStep === "send"
                ? "Click below to receive a verification code at your registered email address."
                : "Enter the code we sent and your new password."}
            </DialogDescription>
          </DialogHeader>

          {passwordStep === "send" ? (
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPasswordOpen(false)}
                className="border-white/10 hover:bg-white/5 text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendPasswordOtp}
                disabled={isSendingPwOtp}
                className="bg-primary hover:bg-primary/85 text-white rounded-xl"
              >
                {isSendingPwOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </DialogFooter>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">Verification Code</label>
                  <Input
                    placeholder="Enter 6-digit code"
                    value={pwOtp}
                    onChange={(e) => setPwOtp(e.target.value)}
                    className="text-center text-lg tracking-widest bg-black/40 border-white/10 focus:border-primary rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">New Password</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-black/40 border-white/10 focus:border-primary rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400">Confirm Password</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-black/40 border-white/10 focus:border-primary rounded-xl pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordOpen(false)}
                  className="border-white/10 hover:bg-white/5 text-white rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResetPassword}
                  disabled={isResettingPw || pwOtp.length < 6 || newPassword.length < 6}
                  className="bg-primary hover:bg-primary/85 text-white rounded-xl"
                >
                  {isResettingPw ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
