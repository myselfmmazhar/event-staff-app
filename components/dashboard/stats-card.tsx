"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "./animated-counter";

interface StatsCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  description?: string;
  gradient?: "purple" | "rose" | "blue" | "green";
  href?: string;
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  href,
  isLoading = false,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <Card className="bg-card border border-border shadow-none">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-3.5 w-28 bg-muted rounded animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-16 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const inner = (
    <Card className={`bg-card border border-border shadow-none transition-shadow duration-150 ${href ? "hover:shadow-sm cursor-pointer" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            <div className="w-4 h-4">{icon}</div>
          </div>
        </div>
        <h3 className="text-4xl font-bold text-foreground leading-none mb-1.5">
          <AnimatedCounter value={value} duration={900} />
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
