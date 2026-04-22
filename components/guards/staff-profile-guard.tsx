"use client";

import { useSession } from "@/lib/client/auth";
import { trpc } from "@/lib/client/trpc";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { SessionUser } from "@/lib/types/auth.types";

const COMPLETE_PROFILE_PATH = "/staff/complete-profile";

interface StaffProfileGuardProps {
    children: React.ReactNode;
}

export function StaffProfileGuard({ children }: StaffProfileGuardProps) {
    const { data: session, isPending: sessionPending } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const user = session?.user as SessionUser | undefined;
    const isStaff = user?.role === "STAFF";
    const onCompletePage = pathname === COMPLETE_PROFILE_PATH;

    const { data: profile, isLoading: profileLoading } = trpc.staff.getMyProfile.useQuery(undefined, {
        enabled: isStaff && !sessionPending,
    });

    useEffect(() => {
        if (sessionPending || !isStaff) return;
        if (profileLoading || profile === undefined) return;

        if (!profile?.profileCompleted && !onCompletePage) {
            router.replace(COMPLETE_PROFILE_PATH);
        } else if (profile?.profileCompleted && onCompletePage) {
            router.replace("/dashboard");
        }
    }, [sessionPending, isStaff, profileLoading, profile, onCompletePage, router]);

    // Block rendering only when we know a redirect is about to happen
    if (isStaff && !profileLoading && profile !== undefined) {
        if (!profile?.profileCompleted && !onCompletePage) return null;
    }

    return <>{children}</>;
}
