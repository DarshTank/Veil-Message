import { z } from "zod";

export const MessageSchema = z.object({
  content: z
    .string()
    .max(300, "Message must not be longer than 300 characters")
    .optional()
    .default(""),
});
