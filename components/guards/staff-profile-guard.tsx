"use client";

import { useSession } from "@/lib/client/auth";
import { trpc } from "@/lib/client/trpc";
import { createContext, useContext } from "react";
import type { SessionUser } from "@/lib/types/auth.types";

interface ProfileContextType {
    isProfileIncomplete: boolean;
    isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface StaffProfileGuardProps {
    children: React.ReactNode;
}

export function StaffProfileGuard({ children }: StaffProfileGuardProps) {
    const { data: session, isPending: sessionPending } = useSession();

    const user = session?.user as SessionUser | undefined;
    const isStaff = user?.role === "STAFF";

    const { data: profile, isLoading: profileLoading } = trpc.staff.getMyProfile.useQuery(undefined, {
        enabled: isStaff && !sessionPending,
    });

    const isProfileIncomplete = isStaff && profile !== undefined && !profile?.profileCompleted;

    return (
        <ProfileContext.Provider value={{ isProfileIncomplete, isLoading: profileLoading }}>
            {children}
        </ProfileContext.Provider>
    );
}

export function useProfileCompletion() {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        return { isProfileIncomplete: false, isLoading: false };
    }
    return context;
}
