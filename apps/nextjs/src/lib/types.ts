export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

export interface UsageMetric {
  date: string;
  successful: number;
  failed: number;
  latency: number;
}

export interface ChartDataPoint {
  name: string;
  requests: number;
}

export interface StatsCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ElementType;
}
