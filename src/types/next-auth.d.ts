import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    _id?: string;
    username?: string;
    isVerified?: boolean;
    isAcceptingMessages?: boolean;
    isShieldEnabled?: boolean;
    bio?: string;
    role?: string;
    status?: string;
    authProvider?: string;
    isAccountSetupCompleted?: boolean;
  }

  interface Session {
    user: {
      _id: string;
      username: string;
      email?: string | null;
      isVerified: boolean;
      isAcceptingMessages: boolean;
      isShieldEnabled: boolean;
      bio: string;
      role: string;
      status: string;
      authProvider: string;
      isAccountSetupCompleted: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    _id?: string;
    username?: string;
    isVerified?: boolean;
    isAcceptingMessages?: boolean;
    isShieldEnabled?: boolean;
    bio?: string;
    role?: string;
    status?: string;
    authProvider?: string;
    isAccountSetupCompleted?: boolean;
  }
}
