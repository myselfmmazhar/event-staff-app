"use client";

import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";

interface WelcomeSectionProps {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

export function WelcomeSection({ firstName, lastName, role }: WelcomeSectionProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

  const formatDate = () =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date());

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const formatRoleDisplay = (role?: UserRole) =>
    role ? role.replace("_", " ") : "";

  return (
    <div className="bg-card border border-border rounded-xl px-6 py-5">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {getGreeting()}, {fullName}!
      </h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <span>{formatDate()}</span>
        {role && (
          <>
            <span>•</span>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold uppercase tracking-widest border-foreground/25 text-foreground px-2 py-0"
            >
              {formatRoleDisplay(role)}
            </Badge>
          </>
        )}
        <span className="text-muted-foreground/40">·</span>
        <span>Event &amp; staff management hub</span>
      </div>
    </div>
  );
}
