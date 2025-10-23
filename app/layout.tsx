import "./globals.css";

import { Geist } from "next/font/google";
import type { ReactNode } from "react";

import { Footer, type FooterProps } from "@/components/layout/Footer";
import { Navbar, type NavbarProps } from "@/components/layout/Navbar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { WebSocketProvider } from "@/lib/wsClient";
import logoLight from "@/public/logo.webp";
import logoDark from "@/public/logo-light.webp";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

type Props = {
  children: ReactNode;
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
    copyright: `© 2025 - ${new Date().getFullYear()} ESTACA. Copyright`,
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
            <div className="flex min-h-screen flex-col justify-between gap-0">
              <Navbar {...navbarProps} />
              <main className="mt-18 flex-grow">
                {children}
                <Toaster />
              </main>
              <Footer {...footerProps} />
            </div>
          </WebSocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
