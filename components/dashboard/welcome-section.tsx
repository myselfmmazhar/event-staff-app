"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserRole } from "@prisma/client";

interface WelcomeSectionProps {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
}

/**
 * Welcome section with user greeting and current date/time
 */
export function WelcomeSection({
  firstName,
  lastName,
  role,
}: WelcomeSectionProps) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

  const formatDate = () => {
    const now = new Date();
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(now);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "default";
      case "ADMIN":
        return "purple";
      case "MANAGER":
        return "info";
      case "STAFF":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatRoleDisplay = (role?: UserRole) => {
    if (!role) return "";
    return role.replace("_", " ");
  };

  return (
    <Card className="border-border bg-gradient-to-br from-primary/5 to-secondary/5">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {getGreeting()}, {fullName}!
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {formatDate()}
              {role && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant={getRoleBadgeVariant(role)} className="text-xs">
                    {formatRoleDisplay(role)}
                  </Badge>
                </>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
