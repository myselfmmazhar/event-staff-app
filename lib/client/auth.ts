"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect: () => {
        if (typeof window !== "undefined") {
          window.location.href = "/verify-2fa";
        }
      },
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  resetPassword,
  twoFactor,
  $Infer,
} = authClient;

// Custom forgot password function since better-auth doesn't expose it on client
export const forgotPassword = async (data: { email: string; redirectTo?: string }) => {
  const baseURL = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const response = await fetch(`${baseURL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      redirectTo: data.redirectTo,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    return { error: result };
  }

  return { data: result };
};

export type Session = typeof $Infer.Session;
