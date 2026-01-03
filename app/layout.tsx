import "./globals.css";

import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { Footer, type FooterProps } from "@/components/layout/Footer";
import { Navbar, type NavbarProps } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { TeleopProvider } from "@/components/TeleopContext";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "@/lib/wsClient";
import logoLight from "@/public/logo.webp";
import logoDark from "@/public/logo-light.webp";
import { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

type Props = {
  children: ReactNode;
};

export const metadata: Metadata = {
  title: "MiniVille Supervision",
};

export default async function LocalLayout({ children }: Props) {
  const navbarProps: NavbarProps = {
    logo: {
      logoLight,
      logoDark,
      url: "/",
      alt: "ESTACA Logo",
    },
    menu: [
      {
        title: "LiveMap",
        url: "/",
      },
    ],
  };
  const footerProps: FooterProps = {
    logo: {
      url: "/",
      logoLight,
      logoDark,
      alt: "ESTACA Logo",
    },
    // Pass a static start year and let the client Footer compute the current year
    copyrightStartYear: 2025,
    developed_by: "Developed by",
    links: [
      {
        title: "GitHub",
        url: "https://github.com/ESTACA-Mini-Ville/",
      },
    ],
  };

  return (
    <html lang="en" className="scroll-pt-20" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            <TeleopProvider>
              <div className="flex min-h-screen flex-col justify-between gap-0">
                <Navbar {...navbarProps} />
                <main className="mt-18 flex-grow">
                  {children}
                  <Toaster />
                </main>
                <Footer {...footerProps} />
              </div>
            </TeleopProvider>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
