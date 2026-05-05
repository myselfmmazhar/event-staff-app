"use client";

import { useSession } from "@/lib/client/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
}

function AuthRedirect() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isPending && !session) {
      const search = searchParams.toString();
      const callbackUrl = encodeURIComponent(search ? `${pathname}?${search}` : pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [session, isPending, router, pathname, searchParams]);

  return null;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
    );
  }

  return <>{children}</>;
}
