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
import { useToast } from "@/hooks/use-toast";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { ChevronLeft, Loader2, Save, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
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
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

const bioSchema = z.object({
  bio: z.string().max(300, "Bio must be less than 300 characters"),
});

const accountSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

const Settings = () => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingUpdate, setPendingUpdate] = useState<{
    field: string;
    value: string;
  } | null>(null);

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
      password: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (session?.user?.username) {
        try {
          const response = await axios.get(
            `/api/get-public-profile?username=${session.user.username}`
          );
          if (response.data.success) {
            bioForm.setValue("bio", response.data.user.bio || "");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          // Fallback to session if fetch fails
          bioForm.setValue("bio", session.user.bio || "");
        }
      }
    };

    if (session?.user) {
      accountForm.setValue("username", session.user.username || "");
      accountForm.setValue("email", session.user.email || "");
      fetchProfile();
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
      router.push("/dashboard");
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
    // Determine what changed
    const currentUsername = session?.user?.username;
    const currentEmail = session?.user?.email;

    if (data.username !== currentUsername) {
      setPendingUpdate({ field: "username", value: data.username });
    } else if (data.email !== currentEmail) {
      setPendingUpdate({ field: "email", value: data.email });
    } else if (data.password) {
      setPendingUpdate({ field: "password", value: data.password });
    } else {
      toast({
        title: "No changes",
        description: "You haven't made any changes to your account.",
      });
      return;
    }

    // Send OTP
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
      setPendingUpdate(null);
      // Ideally, refresh session or redirect
      if (
        pendingUpdate.field === "username" ||
        pendingUpdate.field === "email"
      ) {
        // Force sign out or refresh might be needed
        toast({
          title: "Please Sign In Again",
          description: "Your account details have changed.",
        });
      } else {
        router.push("/dashboard");
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard")}
              className="mr-4"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
              Account Settings
            </h1>
          </div>

          <div className="grid gap-8">
            {/* Bio Section */}
            <div className="glass-card p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Save className="h-5 w-5 text-primary" />
                Public Bio
              </h2>
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
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a little about yourself..."
                            className="bg-background/50 border-input focus:ring-primary min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isBioLoading}>
                    {isBioLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Bio"
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Account Section */}
            <div className="glass-card p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Account Details
              </h2>
              <Form {...accountForm}>
                <form
                  onSubmit={accountForm.handleSubmit(onAccountSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={accountForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Username"
                            {...field}
                            className="bg-background/50 border-input focus:ring-primary"
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Email"
                            {...field}
                            className="bg-background/50 border-input focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={accountForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Leave blank to keep current password"
                            {...field}
                            className="bg-background/50 border-input focus:ring-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isOtpLoading}>
                    {isOtpLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Update Account"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </motion.div>
      </div>

      <Dialog open={isOtpOpen} onOpenChange={setIsOtpOpen}>
        <DialogContent className="glass-card border-none">
          <DialogHeader>
            <DialogTitle>Verify Changes</DialogTitle>
            <DialogDescription>
              We sent a verification code to your email. Please enter it below to
              confirm this change.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="text-center text-lg tracking-widest bg-background/50"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOtpOpen(false)}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={verifyOtp}
              disabled={isVerifying || otp.length < 6}
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
    </div>
  );
};

export default Settings;
