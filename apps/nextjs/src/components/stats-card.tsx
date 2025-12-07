import type { LucideIcon } from 'lucide-react';
import { Card } from '@acme/ui/card';
import { cn } from '@acme/ui';

interface StatsCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
}

export function StatsCard({ title, value, trend, trendUp, icon: Icon }: StatsCardProps) {
  return (
    <Card className="p-5 hover:border-border/80 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-muted rounded-lg group-hover:bg-muted/80 transition-colors">
          <Icon className="text-primary" size={20} />
        </div>
        <span
          className={cn(
            'text-xs font-medium px-2 py-1 rounded-full',
            trendUp
              ? 'bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/20'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {trend}
        </span>
      </div>
      <div className="space-y-1">
        <h4 className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          {title}
        </h4>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
