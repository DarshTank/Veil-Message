"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Settings,
  LogOut,
  Ghost,
  MessageCircle,
  Globe,
  Compass,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  PlusCircle,
} from "lucide-react";
import { useNotificationCounts } from "@/hooks/useNotificationCounts";
import NotificationDropdown from "./NotificationDropdown";
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
  const pathname = usePathname();
  const user = session?.user;
  const isAdmin = user?.role === "super-admin";
  const { pendingRequests, unreadChats, setPendingRequests } = useNotificationCounts();
  const totalUnreadChats = Object.values(unreadChats).reduce((a, b) => a + b, 0);

  const navItems = [
    ...(!isAdmin
      ? [
          { label: "Confession Board", href: "/board", icon: Globe },
        ]
      : []),
    ...(session
      ? [
          ...(!isAdmin
            ? [
                { label: "Confession Message", href: "/confess", icon: PlusCircle },
              ]
            : []),
          {
            label: isAdmin ? "Admin Console" : "Public Messages",
            href: isAdmin ? "/admin" : "/dashboard",
            icon: isAdmin ? ShieldAlert : MessageCircle,
          },
          ...(!isAdmin
            ? [
                {
                  label: "Discover",
                  href: "/discover",
                  icon: Compass,
                  badge: pendingRequests,
                },
                {
                  label: "Chat",
                  href: "/chat",
                  icon: MessageSquare,
                  badge: totalUnreadChats,
                },
              ]
            : []),
        ]
      : []),
  ];

  return (
    <>
      {/* Modern Header Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-black/60 backdrop-blur-2xl border-b border-white/10 shadow-lg transition-all duration-300">
        <div className="w-full h-full flex justify-between items-center px-6 sm:px-12">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white/20 transition-all duration-300">
              <Ghost className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-widest text-white">
              VEIL
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/chat"
                  ? pathname?.startsWith("/chat")
                  : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-2.5 lg:px-3.5 py-1.5 rounded-lg text-[11px] lg:text-xs font-medium flex items-center gap-1.5 transition-colors duration-200 shrink-0 ${
                    isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      className="absolute inset-0 rounded-lg bg-white/10 border border-white/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <Icon className="w-3.5 h-3.5 z-10 shrink-0" />
                  <span className="z-10 whitespace-nowrap">{item.label}</span>
                  {Boolean(item.badge && item.badge > 0) && (
                    <span className="z-10 ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-white text-black shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {session ? (
              <>
                {!isAdmin && (
                  <NotificationDropdown
                    pendingRequestsCount={pendingRequests}
                    setPendingRequestsCount={setPendingRequests}
                  />
                )}

                {/* Profile Pill Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-200 outline-none cursor-pointer">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {user?.username?.charAt(0).toUpperCase() || <User className="w-3.5 h-3.5" />}
                      </div>
                      <span className="hidden sm:inline text-xs font-medium text-zinc-200 max-w-[100px] truncate">
                        {user?.username}
                      </span>
                      {isAdmin ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300 bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10">
                          Admin
                        </span>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-transform group-data-[state=open]:rotate-180" />
                      )}
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="w-56 backdrop-blur-2xl bg-zinc-950/90 border border-white/10 shadow-2xl rounded-2xl text-foreground p-1.5 z-[60] mt-2"
                  >
                    <DropdownMenuLabel className="p-3 bg-white/5 rounded-xl mb-1 border border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-sm text-white truncate">
                            @{user?.username}
                          </span>
                          {user?.email && !user.email.includes(":") ? (
                            <span className="text-[11px] text-zinc-400 font-normal truncate">
                              {user.email}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-white/10 my-1" />

                    <DropdownMenuItem asChild className="rounded-xl focus:bg-white/10 focus:text-white cursor-pointer py-2 text-xs">
                      <Link href="/dashboard/settings" className="flex items-center w-full">
                        <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                        <span>Profile Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/10 my-1" />

                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="rounded-xl cursor-pointer text-rose-400 focus:text-rose-300 focus:bg-rose-500/10 py-2 text-xs"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link href="/sign-in">
                  <button className="px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-all">
                    Sign In
                  </button>
                </Link>
                <Link href="/sign-up">
                  <button className="px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold text-black bg-white hover:bg-zinc-200 transition-all">
                    Join Now
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Glass Navigation Bar */}
      <div className="md:hidden fixed bottom-3 left-2 right-2 sm:left-4 sm:right-4 z-50 max-w-md mx-auto">
        <div className="bg-black/85 backdrop-blur-2xl border border-white/10 rounded-2xl px-2 py-1.5 flex justify-around items-center shadow-2xl">
          {!session ? (
            <>
              <Link
                href="/board"
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/board" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Board</span>
              </Link>
              <Link
                href="/sign-in"
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/sign-in" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Sign In</span>
              </Link>
              <Link
                href="/sign-up"
                className="flex flex-col items-center gap-0.5 p-1 px-3 rounded-xl bg-white text-black font-bold text-[9px] sm:text-[10px] shrink-0"
              >
                <Ghost className="w-4 h-4 shrink-0" />
                <span>Join</span>
              </Link>
            </>
          ) : isAdmin ? (
            <>
              <Link
                href="/admin"
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/admin" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Admin</span>
              </Link>
              <Link
                href="/board"
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/board" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Board</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className={`flex flex-col items-center gap-0.5 p-1 px-2 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/dashboard/settings" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Settings</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={`flex flex-col items-center gap-0.5 p-1 px-1.5 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/dashboard" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Messages</span>
              </Link>

              <Link
                href="/board"
                className={`flex flex-col items-center gap-0.5 p-1 px-1.5 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/board" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Board</span>
              </Link>

              <Link
                href="/discover"
                className={`flex flex-col items-center gap-0.5 p-1 px-1.5 rounded-xl transition-all min-w-0 text-center relative ${
                  pathname === "/discover" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Compass className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Discover</span>
                {pendingRequests > 0 && (
                  <span className="absolute -top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
                    {pendingRequests}
                  </span>
                )}
              </Link>

              <Link
                href="/chat"
                className={`flex flex-col items-center gap-0.5 p-1 px-1.5 rounded-xl transition-all min-w-0 text-center relative ${
                  pathname?.startsWith("/chat") ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Chat</span>
                {totalUnreadChats > 0 && (
                  <span className="absolute -top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-bold text-black">
                    {totalUnreadChats}
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard/settings"
                className={`flex flex-col items-center gap-0.5 p-1 px-1.5 rounded-xl transition-all min-w-0 text-center ${
                  pathname === "/dashboard/settings" ? "text-white font-semibold bg-white/10" : "text-zinc-400"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="text-[9px] sm:text-[10px] truncate">Settings</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
