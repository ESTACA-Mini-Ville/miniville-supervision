import './globals.css';

import { Geist } from 'next/font/google';
import { ReactNode } from 'react';

import { Footer, FooterProps } from '@/components/layout/Footer';
import { Navbar, NavbarProps } from '@/components/layout/Navbar';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import logoLight from '@/public/logo.webp';
import logoDark from '@/public/logo-light.webp';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export default async function LocalLayout({ children }: { children: ReactNode }) {

  const navbarProps: NavbarProps = {
    logo: {
      logoLight,
      logoDark,
      url: '/',
      alt: "Lun'Air Logo",
    },
    menu: [
      {
        title: 'Home',
        url: '/',
      },
      {
        title: 'Debug',
        url: '/debug',
      },
    ],
  };
  const footerProps: FooterProps = {
    logo: {
      url: '/',
      logoLight,
      logoDark,
      alt: "Lun'Air Logo",
    },
    copyright: `© 2025 - ${new Date().getFullYear()} ESTACA. Copyright`,
    developed_by: 'Developed by',
    links: [
      {
        title: 'GitHub',
        url: 'https://github.com/ESTACA-Mini-Ville/'
      }
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
          <div className="flex min-h-screen flex-col justify-between gap-0">
            <Navbar {...navbarProps} />
            <main className="mt-18 flex-grow">
              {children}
              <Toaster />
            </main>
            <Footer {...footerProps} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}