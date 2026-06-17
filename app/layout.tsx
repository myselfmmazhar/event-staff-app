import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "@/lib/providers/trpc-provider";
import { TerminologyProvider } from "@/lib/providers/terminology-provider";
import { LabelsProvider } from "@/lib/providers/labels-provider";
import { LabelEditModeProvider } from "@/lib/providers/label-edit-mode-provider";
import { PodContextProvider } from "@/lib/providers/pod-context-provider";
import { Toaster } from "@/components/ui/toaster";
import { EditLabelsSaveBar } from "@/components/common/edit-labels-button";

export const metadata: Metadata = {
  title: "Tripod",
  description: "Comprehensive staff management and scheduling platform",
};

// Render every route on-demand instead of statically prerendering at build time.
// The app is entirely auth-gated and client-data-driven, so static generation
// provides no benefit and triggers a React prerender crash ("Cannot read
// properties of null (reading 'useState')") in Amplify's Linux build environment.
// Setting this on the root layout cascades to all routes in the app.
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <TRPCProvider>
          <TerminologyProvider>
            <LabelsProvider>
              <PodContextProvider>
                <LabelEditModeProvider>
                  {children}
                  <EditLabelsSaveBar />
                  <Toaster />
                </LabelEditModeProvider>
              </PodContextProvider>
            </LabelsProvider>
          </TerminologyProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
