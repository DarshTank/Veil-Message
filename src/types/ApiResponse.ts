import { Message } from "@/model/User.model";

export interface ApiResponse {
  success: boolean;
  Success?: boolean; // legacy — keep for backwards compat
  message: string;

  // optional response fields
  aitext?: string;
  isAcceptingMessage?: boolean;
  messages?: Array<Message>;

  // public profile
  user?: {
    username: string;
    bio: string;
    isAcceptingMessage: boolean;
    ghostReplies?: string[];
    isPublicBoard?: boolean;
  };

  // admin
  users?: Array<{
    _id: string;
    username: string;
    email: string;
    role: string;
    status: string;
    isFlagged: boolean;
    toxicCount: number;
    createdAt: string;
  }>;
  total?: number;

  // board
  boardMessages?: Array<{
    _id: string;
    content: string;
    mood: string;
    createdAt: string;
  }>;
}
