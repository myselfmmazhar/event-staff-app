"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "./animated-counter";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  description?: string;
  gradient?: "purple" | "rose" | "blue" | "green";
  isLoading?: boolean;
}

/**
 * Stats card component with animated counter and gradient effects
 */
export function StatsCard({
  title,
  value,
  icon,
  description,
  gradient = "purple",
  isLoading = false,
}: StatsCardProps) {
  const gradients = {
    purple: "from-primary/10 to-primary/5 border-primary/20",
    rose: "from-secondary/10 to-secondary/5 border-secondary/20",
    blue: "from-info/10 to-info/5 border-info/20",
    green: "from-success/10 to-success/5 border-success/20",
  };

  const iconGradients = {
    purple: "from-primary to-primary/80",
    rose: "from-secondary to-secondary/80",
    blue: "from-info to-info/80",
    green: "from-success to-success/80",
  };

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-border">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-20 bg-muted rounded animate-pulse" />
              <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-12 h-12 bg-muted rounded-xl animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br ${gradients[gradient]}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-foreground mb-1">
              <AnimatedCounter value={value} duration={1200} />
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${iconGradients[gradient]} shadow-lg`}
          >
            <div className="text-white">{icon}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
