import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

// import { ThemeProvider, ThemeToggle } from "~/components/ui/theme";
// import { Toaster } from "~/components/ui/toast";
import { TRPCReactProvider } from "~/trpc/react";

import "~/app/styles.css";

import { cn } from "~/lib/utils";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "CD Judge",
  description: "CD Judge Application",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",
          geistSans.variable,
          geistMono.variable,
        )}
      >
        {/* <ThemeProvider> */}
        <TRPCReactProvider>{props.children}</TRPCReactProvider>
        <div className="absolute right-4 bottom-4">{/* <ThemeToggle /> */}</div>
        {/* <Toaster /> */}
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}
