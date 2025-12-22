"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";

import { authClient } from "~/auth/client";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { AnimatedThemeToggler } from "./ui/animated-theme-toggler";

interface DashboardHeaderProps {
  onOpenMobileSidebar: () => void;
}

export function DashboardHeader({ onOpenMobileSidebar }: DashboardHeaderProps) {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const user = session?.user;
  const userInitials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
    : "??";

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  return (
    <header className="bg-background/80 z-10 flex h-16 items-center justify-between border-b px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMobileSidebar}
        >
          <Menu size={20} />
        </Button>

        {/* Search Bar */}
        <div className="group relative hidden md:block">
          <Search className="text-muted-foreground group-focus-within:text-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors" />
          <Input
            type="text"
            placeholder="Search resources..."
            className="bg-muted/50 w-64 pr-4 pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            <span className="bg-primary border-background absolute top-2 right-2.5 h-2 w-2 rounded-full border"></span>
          </Button>
          <AnimatedThemeToggler />
        </div>
        <div className="bg-border mx-1 h-8 w-px"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hover:bg-muted hover:border-border flex items-center gap-3 rounded-full border border-transparent p-1.5 pr-3 transition-colors">
              <div className="from-primary to-primary/60 text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr text-sm font-medium">
                {userInitials}
              </div>
              <span className="hidden text-sm font-medium sm:block">
                {user?.name ?? "User"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="w-full cursor-pointer">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Billing (Coming soon)</DropdownMenuItem>
            <DropdownMenuItem disabled>Team (Coming soon)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
