import type { LucideIcon } from "lucide-react";

import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
}

export function StatsCard({
  title,
  value,
  trend,
  trendUp,
  icon: Icon,
}: StatsCardProps) {
  return (
    <Card className="hover:border-border/80 group p-5 transition-colors">
      <div className="mb-4 flex items-start justify-between">
        <div className="bg-muted group-hover:bg-muted/80 rounded-lg p-2 transition-colors">
          <Icon className="text-primary" size={20} />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            trendUp
              ? "bg-emerald-500/10 text-emerald-400 dark:bg-emerald-500/20"
              : "bg-muted text-muted-foreground",
          )}
        >
          {trend}
        </span>
      </div>
      <div className="space-y-1">
        <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {title}
        </h4>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
