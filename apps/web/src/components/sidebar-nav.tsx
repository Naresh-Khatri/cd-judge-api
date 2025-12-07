'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  BookOpen,
  Box,
  Key,
  LayoutDashboard,
  Settings,
  TerminalSquare,
  Zap,
} from 'lucide-react';

import { Button } from '@acme/ui/button';
import { cn } from '@acme/ui';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/playground', label: 'Playground', icon: TerminalSquare },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
  { href: '/dashboard/usage', label: 'Usage & Limits', icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

interface SidebarNavProps {
  onOpenPlans?: () => void;
}

export function SidebarNav({ onOpenPlans }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap className="text-primary-foreground fill-primary-foreground" size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">cd judge</h1>
          <p className="text-xs text-muted-foreground">Execution Engine</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-muted text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <Icon
                size={18}
                className={cn(
                  'transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
              )}
            </Link>
          );
        })}

        <div className="mt-8 px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Resources
        </div>
        <Link
          href="/dashboard/docs"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
            pathname === '/dashboard/docs'
              ? 'bg-muted text-foreground shadow-sm border border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          <BookOpen
            size={18}
            className="text-muted-foreground group-hover:text-foreground transition-colors"
          />
          Documentation
        </Link>
      </nav>

      {/* Upgrade Card */}
      <div className="mt-auto p-4 bg-gradient-to-br from-card to-muted border border-border rounded-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -mr-10 -mt-10 rounded-full group-hover:bg-primary/20 transition-all duration-500"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mb-3 border border-border">
            <Box className="text-foreground" size={20} />
          </div>
          <h4 className="text-sm font-semibold mb-1">Upgrade to Pro</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Unlock unlimited executions and priority support.
          </p>
          <Button
            onClick={onOpenPlans}
            className="w-full shadow-lg"
            size="sm"
          >
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
