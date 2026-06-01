import { useLimits } from "@/lib/limits.query";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function formatCurrencyWhole(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getResetsInText(limit: any) {
  if (!limit.lastCleanup || !limit.cleanupInterval) return null;
  const last = new Date(limit.lastCleanup as string).getTime();
  let ms = 0;
  switch (limit.cleanupInterval) {
    case "1h": ms = 60 * 60 * 1000; break;
    case "12h": ms = 12 * 60 * 60 * 1000; break;
    case "24h": ms = 24 * 60 * 60 * 1000; break;
    case "1w": ms = 7 * 24 * 60 * 60 * 1000; break;
    case "1m": ms = 30 * 24 * 60 * 60 * 1000; break;
  }
  if (!ms) return null;
  const nextReset = last + ms;
  const now = Date.now();
  if (nextReset <= now) return "soon";
  
  const diffMs = nextReset - now;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays > 0) return `${diffDays}d`;
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours > 0) return `${diffHours}h`;
  const diffMins = Math.floor(diffMs / (60 * 1000));
  return `${diffMins}m`;
}

export function LimitUsageDisplay({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const { data: limits = [] } = useLimits();

  const entityLimits = useMemo(() => {
    return limits.filter(
      (l) => l.entityType === entityType && l.entityId === entityId
    );
  }, [limits, entityType, entityId]);

  if (entityLimits.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  // Find the limit with the least remaining usage percentage (most constraining)
  const mostConstrainingLimit = entityLimits.reduce((prev, curr) => {
    const prevUsage = (prev.modelUsage ?? []).reduce((sum: number, u: any) => sum + u.cost, 0);
    const currUsage = (curr.modelUsage ?? []).reduce((sum: number, u: any) => sum + u.cost, 0);
    const prevRatio = prev.limitValue > 0 ? prevUsage / prev.limitValue : 0;
    const currRatio = curr.limitValue > 0 ? currUsage / curr.limitValue : 0;
    return currRatio > prevRatio ? curr : prev;
  }, entityLimits[0]);

  const actualUsage = (mostConstrainingLimit.modelUsage ?? []).reduce(
    (sum: number, u: any) => sum + u.cost,
    0
  );
  const actualLimit = mostConstrainingLimit.limitValue;
  const percentage = actualLimit > 0 ? (actualUsage / actualLimit) * 100 : 0;
  const status = percentage >= 90 ? "danger" : percentage >= 75 ? "warning" : "safe";
  const resetsInText = getResetsInText(mostConstrainingLimit);

  return (
    <div className="flex flex-col gap-1 w-[160px]">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-mono">
          {formatCurrencyWhole(actualUsage)} / {formatCurrencyWhole(actualLimit)}
        </span>
        {resetsInText && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 font-normal flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {resetsInText}
          </Badge>
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full">
            <Progress
              value={Math.min(percentage, 100)}
              className={
                status === "danger"
                  ? "bg-red-100 [&>div]:bg-red-500 h-1.5"
                  : status === "warning"
                    ? "bg-orange-100 [&>div]:bg-orange-500 h-1.5"
                    : "h-1.5"
              }
            />
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <p>
            Usage: {formatCurrencyWhole(actualUsage)} / {formatCurrencyWhole(actualLimit)} ({percentage.toFixed(1)}%)
          </p>
          {entityLimits.length > 1 && (
            <div className="mt-1.5 pt-1.5 border-t border-border flex flex-col gap-1">
              <span className="font-semibold">{entityLimits.length} limits active</span>
              <Link
                href={`/llm/limits?appliedTo=${entityType}`}
                className="text-primary hover:underline font-medium block"
              >
                View all limits
              </Link>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
