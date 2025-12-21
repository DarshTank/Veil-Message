"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";
import { User, Settings, LogOut, Ghost } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center backdrop-blur-md border-b border-white/5">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="bg-primary p-1.5 rounded-lg rotate-12 group-hover:rotate-0 transition-transform duration-300">
          <Ghost className="w-5 h-5 text-black" />
        </div>
        <span className="text-xl font-bold tracking-tighter text-foreground">VEIL</span>
      </Link>

      <div className="flex gap-4 items-center">
        {session ? (
          <div className="flex items-center space-x-4">
             <Link href="/dashboard">
                <Button variant="ghost" className="hidden md:inline-flex">Dashboard</Button>
             </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 transition-all hover:scale-105 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                  <User className="h-4 w-4" />
                  <span className="hidden md:inline font-medium">
                    {user?.username || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card border-white/10 text-foreground">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-foreground cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Link href="/sign-up">
            <Button size="sm" className="rounded-full px-5 shadow-lg shadow-primary/20">Join Now</Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
