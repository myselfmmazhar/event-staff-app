import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/providers/trpc-provider";
import { TerminologyProvider } from "@/lib/providers/terminology-provider";
import { Toaster } from "@/components/ui/toaster";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Event Staff Management Platform",
  description: "Comprehensive event staff management and scheduling platform",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lexend.variable} font-sans antialiased`}>
        <TRPCProvider>
          <TerminologyProvider>
            {children}
            <Toaster />
          </TerminologyProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
