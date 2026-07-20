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
import { useToast } from "@/hooks/use-toast";
import { verifySchema } from "@/schemas/verifySchema";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { motion } from "framer-motion";
import { Loader2, MailCheck, RotateCcw } from "lucide-react";

const VerifyAccount = () => {
  const router = useRouter();
  const params = useParams<{ username: string }>();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const form = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: "",
    },
  });

  // 30-Second Countdown Timer for Resend Code
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !canResend) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer, canResend]);

  const handleResend = async () => {
    if (!params?.username || !canResend || isResending) return;
    setIsResending(true);
    try {
      const response = await axios.post<ApiResponse>("/api/resend-verification-code", {
        username: params.username,
      });

      toast({
        title: "Code Resent!",
        description: response.data.message || "A new 6-digit verification code has been sent to your email.",
      });

      // Reset timer back to 30 seconds
      setTimer(30);
      setCanResend(false);
    } catch (error) {
      console.error("Error resending code:", error);
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Resend Failed",
        description: axiosError.response?.data.message ?? "Could not resend verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof verifySchema>) => {
    if (!params?.username) return;
    setIsSubmitting(true);
    try {
      const response = await axios.post<ApiResponse>(`/api/verify-code`, {
        username: params.username,
        verifyCode: data.code,
      });

      toast({
        title: "Account Verified!",
        description: response.data.message || "Your email has been verified. You can now sign in.",
      });

      router.replace("/sign-in");
    } catch (error) {
      console.error("Error verifying account:", error);
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Verification Failed",
        description: axiosError.response?.data.message ?? "An error occurred during verification.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!params?.username) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-background">
        <div className="glass-card p-6 rounded-xl text-rose-400 font-semibold border border-rose-500/20">
          Invalid Verification Link
        </div>
      </div>
    );
  }

  const decodedUsername = decodeURIComponent(params.username);

  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-80px)] relative overflow-hidden">
      {/* Background Glowing Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-primary/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 space-y-6 glass-card rounded-2xl border border-white/10 shadow-2xl mx-4 relative overflow-hidden"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-2 shadow-inner">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-400 to-rose-400 tracking-tight">
            Verify Account
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-xs mx-auto">
            We sent a 6-digit verification code to your registered email address for{" "}
            <span className="text-purple-400 font-bold">@{decodedUsername}</span>.
          </p>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>6-Digit Security Code</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      {...field}
                      className="bg-white/[0.03] border-white/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 text-center text-xl font-mono tracking-[0.5em] h-12 rounded-xl transition-all duration-300"
                    />
                  </FormControl>
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
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </form>
        </Form>

        {/* Resend Code Section */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Didn&apos;t receive the code?</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={!canResend || isResending}
            className="h-8 px-3 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 disabled:opacity-50 transition-all font-semibold rounded-lg"
          >
            {isResending ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </div>
            ) : canResend ? (
              <div className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Resend Code</span>
              </div>
            ) : (
              <span>Resend in {timer}s</span>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifyAccount;
