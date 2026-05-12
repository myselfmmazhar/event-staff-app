"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";

interface BillOrInvoiceItem {
    serviceId?: string | null;
    date?: Date | string | null;
    service?: {
        id: string;
        callTimes?: Array<{
            id: string;
            startDate?: Date | string | null;
            event?: {
                id: string;
                title: string;
                venueName?: string | null;
                address?: string | null;
                addressLine2?: string | null;
                city?: string | null;
                state?: string | null;
                zipCode?: string | null;
                startDate?: Date | string | null;
            } | null;
        }>;
    } | null;
}

interface DerivedTask {
    id: string;
    title: string;
    location: string | null;
}

function isSameDay(a: Date | string | null | undefined, b: Date | string | null | undefined): boolean {
    if (!a || !b) return false;
    const dA = new Date(a);
    const dB = new Date(b);
    if (isNaN(dA.getTime()) || isNaN(dB.getTime())) return false;
    return (
        dA.getUTCFullYear() === dB.getUTCFullYear() &&
        dA.getUTCMonth() === dB.getUTCMonth() &&
        dA.getUTCDate() === dB.getUTCDate()
    );
}

function formatLocation(ev: NonNullable<NonNullable<BillOrInvoiceItem["service"]>["callTimes"]>[number]["event"]): string | null {
    if (!ev) return null;
    const streetParts = [ev.address, ev.addressLine2].filter((p) => p && p.trim());
    const cityStateZip = [ev.city, ev.state].filter((p) => p && p.trim()).join(", ");
    const cityLine = [cityStateZip, ev.zipCode].filter((p) => p && p.trim()).join(" ");
    const parts = [
        ev.venueName?.trim() || null,
        streetParts.length > 0 ? streetParts.join(", ") : null,
        cityLine || null,
    ].filter((p): p is string => !!p);
    if (parts.length === 0) return null;
    return parts.join("\n");
}

export function deriveTasks(items: BillOrInvoiceItem[] | undefined | null): DerivedTask[] {
    if (!items || items.length === 0) return [];

    const eventsMap = new Map<string, DerivedTask>();

    for (const item of items) {
        const callTimes = item.service?.callTimes ?? [];
        if (callTimes.length === 0) continue;

        const matchedByDate = callTimes.filter((ct) => isSameDay(ct.startDate, item.date));
        const source = matchedByDate.length > 0 ? matchedByDate : callTimes;

        for (const ct of source) {
            const ev = ct.event;
            if (!ev) continue;
            if (!eventsMap.has(ev.id)) {
                eventsMap.set(ev.id, {
                    id: ev.id,
                    title: ev.title,
                    location: formatLocation(ev),
                });
            }
        }
    }

    return Array.from(eventsMap.values());
}

interface TaskDetailsCardProps {
    items: BillOrInvoiceItem[] | undefined | null;
}

export function TaskDetailsCard({ items }: TaskDetailsCardProps) {
    const tasks = deriveTasks(items);

    if (tasks.length === 0) return null;

    return (
        <Card className="border-muted-foreground/15 bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Task Details
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="rounded-lg border border-border bg-background px-4 py-3 grid grid-cols-2 gap-4"
                    >
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Task Name
                            </p>
                            <p className="text-sm font-medium text-foreground select-text">
                                {task.title}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Task Location
                            </p>
                            <p className="text-sm whitespace-pre-wrap text-muted-foreground select-text">
                                {task.location ?? "—"}
                            </p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
