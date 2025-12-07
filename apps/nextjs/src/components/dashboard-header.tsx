'use client';

import { Bell, Menu, Search, User } from 'lucide-react';

import { Button } from '@acme/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@acme/ui/dropdown-menu';
import { Input } from '@acme/ui/input';

interface DashboardHeaderProps {
  onOpenMobileSidebar: () => void;
}

export function DashboardHeader({ onOpenMobileSidebar }: DashboardHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-background/80 backdrop-blur-md z-10">
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
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 group-focus-within:text-foreground transition-colors" />
          <Input
            type="text"
            placeholder="Search resources..."
            className="pl-10 pr-4 w-64 bg-muted/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-primary rounded-full border border-background"></span>
        </Button>
        <div className="h-8 w-[1px] bg-border mx-1"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-muted p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-border">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary to-primary/60 rounded-full flex items-center justify-center text-primary-foreground font-medium text-sm">
                JD
              </div>
              <span className="text-sm font-medium hidden sm:block">John Doe</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
