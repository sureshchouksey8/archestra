"use client";

import { useLimits } from "@/lib/limits.query";
import { useSession } from "@/lib/auth/auth.query";
import { useOrganization } from "@/lib/organization.query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, Coins, Info, ShieldCheck, Zap } from "lucide-react";
import { useMemo } from "react";

function formatCurrencyWhole(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getFriendlyInterval(interval: string | null | undefined) {
  if (!interval) return "";
  switch (interval) {
    case "1h": return "hourly";
    case "12h": return "every 12 hours";
    case "24h": return "daily";
    case "1w": return "weekly";
    case "1m": return "monthly";
    default: return `every ${interval}`;
  }
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

export function UserLimitsCard() {
  const { data: session } = useSession();
  const { data: organization } = useOrganization();
  const userId = session?.user?.id;

  const { data: limits = [], isLoading: isLimitsLoading } = useLimits(
    userId ? { entityType: "user", entityId: userId } : undefined
  );

  const userLimits = useMemo(() => {
    if (!userId) return [];
    return limits.filter(
      (l) => l.entityType === "user" && l.entityId === userId
    );
  }, [limits, userId]);

  const isLoading = isLimitsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Limits</CardTitle>
          <CardDescription>Your current spending limits and API usage.</CardDescription>
        </CardHeader>
        <CardContent className="h-24 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Loading limits...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 1: Direct custom user-level limits configured
  if (userLimits.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Personal Usage Limits
          </CardTitle>
          <CardDescription>
            You have custom spending limits configured for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {userLimits.map((limit) => {
            const actualUsage = (limit.modelUsage ?? []).reduce(
              (sum: number, u: any) => sum + u.cost,
              0
            );
            const actualLimit = limit.limitValue;
            const percentage = actualLimit > 0 ? (actualUsage / actualLimit) * 100 : 0;
            const resetsIn = getResetsInText(limit);
            const status = percentage >= 90 ? "danger" : percentage >= 75 ? "warning" : "safe";

            return (
              <div key={limit.id} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        Token Spending Limit
                      </span>
                      {limit.model && limit.model.length > 0 ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {limit.model.length} model{limit.model.length > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          All models
                        </Badge>
                      )}
                    </div>
                    {limit.model && limit.model.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate max-w-md">
                        Applies to: {limit.model.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {resetsIn && (
                      <Badge variant="outline" className="text-xs font-normal flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        resets in {resetsIn}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Resets {getFriendlyInterval(limit.cleanupInterval)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-foreground">
                      {formatCurrencyWhole(actualUsage)}
                    </span>
                    <span className="text-muted-foreground">
                      of {formatCurrencyWhole(actualLimit)}
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full cursor-help">
                        <Progress
                          value={Math.min(percentage, 100)}
                          className={
                            status === "danger"
                              ? "bg-red-100 dark:bg-red-950/20 [&>div]:bg-red-500 h-2"
                              : status === "warning"
                                ? "bg-orange-100 dark:bg-orange-950/20 [&>div]:bg-orange-500 h-2"
                                : "h-2"
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      <p>
                        Spending progress: {percentage.toFixed(1)}%
                      </p>
                      {limit.modelUsage && limit.modelUsage.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border space-y-1">
                          <p className="font-semibold">Usage by Model:</p>
                          {limit.modelUsage.map((u: any) => (
                            <div key={u.model} className="flex justify-between gap-4 font-mono text-[10px]">
                              <span>{u.model}:</span>
                              <span>{formatCurrencyWhole(u.cost)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Case 2: No custom limits, but organization has default user limit configured
  if (organization?.defaultUserLimitValue) {
    const defaultLimitVal = organization.defaultUserLimitValue;
    const defaultInterval = getFriendlyInterval(organization.defaultUserLimitCleanupInterval);
    const defaultModels = organization.defaultUserLimitModel;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Organization Default Limit
          </CardTitle>
          <CardDescription>
            Your account is governed by the organization's default user limit settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <Zap className="mt-0.5 h-5 w-5 text-amber-500 shrink-0" />
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-sm font-semibold leading-none">
                  Default User Spending Cap
                </p>
                <div className="text-2xl font-bold font-mono tracking-tight mt-1.5">
                  {formatCurrencyWhole(defaultLimitVal)}
                  <span className="text-xs font-normal text-muted-foreground font-sans ml-1">
                    {defaultInterval}
                  </span>
                </div>
                {defaultModels && defaultModels.length > 0 ? (
                  <p className="text-xs text-muted-foreground mt-2 truncate">
                    Applies to: {defaultModels.join(", ")}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">
                    Applies to all LLM requests
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <span>
              If you require a higher spending limit, please contact your workspace administrator to request a custom limit override.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Case 3: Neither custom nor default user limits are configured
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Usage Limits
        </CardTitle>
        <CardDescription>
          No spending limits are configured for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-none text-emerald-800 dark:text-emerald-300">
                Unlimited Access Enabled
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1.5">
                You can make LLM proxy calls without any spending limits or token caps.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
