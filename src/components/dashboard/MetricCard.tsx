import { formatPercent } from '@/lib/format';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  trend?: {
    change_pct: number;
  };
}

export function MetricCard({ label, value, trend }: MetricCardProps) {
  const isPositive = trend && trend.change_pct >= 0;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
  const trendBgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-2xl font-bold">{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 rounded px-2 py-1 ${trendBgColor}`}>
            {isPositive ? (
              <ArrowUp className={`h-4 w-4 ${trendColor}`} />
            ) : (
              <ArrowDown className={`h-4 w-4 ${trendColor}`} />
            )}
            <span className={`text-xs font-semibold ${trendColor}`}>
              {formatPercent(trend.change_pct)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
