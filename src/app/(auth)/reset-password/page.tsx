"use client";

import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";

const resetPasswordSchema = z.object({
  username: z.string().min(2, "Username is required."),
  otp: z.string().length(6, "OTP must be exactly 6 digits."),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      username: "",
      otp: "",
      newPassword: "",
    },
  });

  // Prefill username from query params if present
  useEffect(() => {
    const userParam = searchParams ? searchParams.get("username") : null;
    if (userParam) {
      form.setValue("username", userParam);
    }
  }, [searchParams, form]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post("/api/reset-password", data);
      
      if (response.data.success) {
        toast({
          title: "Password Reset Success",
          description: "Your password has been successfully reset. Please sign in with your new password.",
        });
        router.push("/sign-in");
      } else {
        toast({
          title: "Error",
          description: response.data.message || "Failed to reset password.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Invalid or expired reset code.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          name="username"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your username"
                  {...field}
                  className="bg-background/50 border-input focus:ring-primary"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="otp"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>6-Digit Reset Code (OTP)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  {...field}
                  className="bg-background/50 border-input focus:ring-primary text-center tracking-[0.25em] font-mono text-lg"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="newPassword"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter at least 6 characters"
                    {...field}
                    className="bg-background/50 border-input focus:ring-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full shadow-lg shadow-primary/20">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function ResetPassword() {
  return (
    <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 space-y-8 glass-card rounded-lg shadow-xl mx-4"
      >
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 text-foreground">
            Verify OTP
          </h1>
          <p className="text-muted-foreground">
            Confirm your username, verification code, and enter a new password
          </p>
        </div>

        <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center mt-6">
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Request another code
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
