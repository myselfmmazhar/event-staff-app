"use client";

import Link from "next/link";

interface ActionItem {
  label: string;
  description: string;
  href: string;
}

interface ImmediateActionsProps {
  pendingStaff?: number;
  openAssignments?: number;
  upcomingCount?: number;
}

export function ImmediateActions({
  pendingStaff = 0,
  openAssignments = 0,
  upcomingCount = 0,
}: ImmediateActionsProps) {
  const actions: ActionItem[] = [];

  if (pendingStaff > 0) {
    actions.push({
      label: `Review ${pendingStaff} pending talent${pendingStaff !== 1 ? "s" : ""}`,
      description: "Staff records waiting for account confirmation",
      href: "/staff",
    });
  }

  if (openAssignments > 0) {
    actions.push({
      label: `Fill ${openAssignments} open assignment${openAssignments !== 1 ? "s" : ""}`,
      description: "Published events that still need staffing",
      href: "/assignments",
    });
  }

  if (upcomingCount > 0) {
    actions.push({
      label: `${upcomingCount} upcoming event${upcomingCount !== 1 ? "s" : ""} this month`,
      description: "Check schedules and confirm staff attendance",
      href: "/events",
    });
  }

  if (actions.length === 0) {
    actions.push({
      label: "All caught up",
      description: "No immediate actions needed right now",
      href: "/dashboard",
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-0.5">Immediate actions</h3>
      <p className="text-xs text-muted-foreground mb-4">Items that need your attention</p>

      <div className="space-y-3.5">
        {actions.map((action, i) => (
          <div key={i}>
            <Link
              href={action.href}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {action.label}
            </Link>
            <span className="text-sm text-muted-foreground"> · {action.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
