"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CardHeader, CardContent, Card, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageSchema } from "@/schemas/messageSchema";
import { motion } from "framer-motion";

const SEPARATOR = "||";

const parseMessages = (text = "") => text.split(SEPARATOR);

const initialMessageString =
  "What's your favorite movie?||Do you have any pets?||What's your dream job?";

export default function SendMessage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;
  const { toast } = useToast();

  const form = useForm<z.infer<typeof MessageSchema>>({
    resolver: zodResolver(MessageSchema),
  });

  const messageContent = form.watch("content");

  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState(
    initialMessageString
  );
  const [heading, setHeading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<{ bio: string } | null>(
    null
  );

  useEffect(() => {
    if (!username) return;

    axios
      .get(`/api/get-public-profile?username=${username}`)
      .then((res) => setPublicProfile(res.data.user))
      .catch(() => console.error("Failed to fetch public profile"));
  }, [username]);

  const onSubmit = async (data: z.infer<typeof MessageSchema>) => {
    setIsLoading(true);
    try {
      const res = await axios.post("/api/send-message", {
        ...data,
        username,
      });

      toast({ title: res.data.message });
      form.reset({ content: "" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 Updated to match new API
  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const res = await axios.get("/api/suggest-questions");

      let questions = "";
      if (res.data.questions && Array.isArray(res.data.questions)) {
        questions = res.data.questions.join(SEPARATOR);
      } else {
        questions = res.data.aitext ?? initialMessageString;
      }

      setGeneratedMessages(questions);
      setHeading(true);

      toast({
        title: "Questions Generated",
        description: "AI generated new questions for you.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate questions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-8"
      >
        <h1 className="text-4xl font-bold text-center">Public Profile</h1>

        <div className="text-center">
          <h2 className="text-2xl font-semibold">@{username}</h2>
          <p className="italic text-muted-foreground">
            {publicProfile?.bio || "No bio available."}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send an anonymous message</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Write your message..."
                          className="min-h-[120px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading || !messageContent}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Need inspiration?</p>
            <Button
              onClick={generateQuestions}
              disabled={isGenerating}
              variant="outline"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {heading ? "AI Generated Questions" : "Suggested Questions"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {parseMessages(generatedMessages).map((msg, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  className="justify-start text-left"
                  onClick={() => form.setValue("content", msg)}
                >
                  {msg}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="text-center">
          <p className="mb-6">Want your own message board?</p>
          <Link href="/sign-up">
            <Button>Create Your Account</Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
