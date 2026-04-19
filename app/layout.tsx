import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "700"],
});
import { TRPCProvider } from "@/lib/providers/trpc-provider";
import { TerminologyProvider } from "@/lib/providers/terminology-provider";
import { LabelsProvider } from "@/lib/providers/labels-provider";
import { LabelEditModeProvider } from "@/lib/providers/label-edit-mode-provider";
import { Toaster } from "@/components/ui/toaster";
import { EditLabelsSaveBar } from "@/components/common/edit-labels-button";

export const metadata: Metadata = {
  title: "Tripod",
  description: "Comprehensive staff management and scheduling platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-sans antialiased`} suppressHydrationWarning>
        <TRPCProvider>
          <TerminologyProvider>
            <LabelsProvider>
              <LabelEditModeProvider>
                {children}
                <EditLabelsSaveBar />
                <Toaster />
              </LabelEditModeProvider>
            </LabelsProvider>
          </TerminologyProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
