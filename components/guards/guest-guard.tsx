"use client";

import { useSession } from "@/lib/client/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

interface GuestGuardProps {
  children: React.ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Pages that should be accessible even when authenticated
  // (user just created account and needs to verify OTP before full access)
  const publicAuthPages = ['/verify-otp'];
  const isPublicAuthPage = publicAuthPages.some(page => pathname.includes(page));

  useEffect(() => {
    if (!isPending && session && !isPublicAuthPage) {
      router.push("/dashboard");
    }
  }, [session, isPending, router, isPublicAuthPage]);

  // Show loading state while checking authentication
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Allow access to public auth pages even if authenticated
  if (isPublicAuthPage) {
    return <>{children}</>;
  }

  // Don't render children if authenticated (and not on public auth page)
  if (session) {
    return null;
  }

  return <>{children}</>;
}
