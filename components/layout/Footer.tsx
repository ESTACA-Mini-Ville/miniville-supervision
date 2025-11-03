"use client";

import Image, { type StaticImageData } from "next/image";

import Link from "next/link";

export interface FooterProps {
  logo: {
    url: typeof Link.arguments.href;
    logoLight: StaticImageData;
    logoDark: StaticImageData;
    alt: string;
  };
  // If provided, the footer will render a range from this start year to the current year.
  // This value is computed on the client so it can use runtime Date().
  copyrightStartYear?: number;
  developed_by: string;
  links: {
    title: string;
    url: typeof Link.arguments.href;
  }[];
}
import { useEffect, useState } from "react";

const Footer = ({ logo, copyrightStartYear, developed_by, links }: FooterProps) => {
  // Avoid using Date() during prerender — compute on client after hydration
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // During SSR, fall back to the provided start year so we don't call Date()
  const displayYear = currentYear ?? copyrightStartYear ?? 2025;
  const copyright =
    copyrightStartYear && currentYear && copyrightStartYear < currentYear
      ? `© ${copyrightStartYear} - ${currentYear} ESTACA. Copyright`
      : `© ${displayYear} ESTACA. Copyright`;
  return (
    <section className="flex justify-center pt-8 pb-16">
      <div className="container">
        <footer>
          <div className="text-muted-foreground flex flex-col justify-between gap-4 border-t pt-8 text-sm font-medium md:flex-row md:items-center">
            <div className="flex flex-col items-center justify-center gap-2 md:items-start">
              {/* Logo */}
              <Link href={logo.url} className="flex gap-2">
                <Image
                  src={logo.logoLight}
                  quality={25}
                  alt={logo.alt}
                  className="block max-h-16 w-full object-contain dark:hidden"
                />
                <Image
                  src={logo.logoDark}
                  quality={25}
                  alt={logo.alt}
                  className="hidden max-h-16 w-full object-contain dark:block"
                />
                <span className="text-lg font-semibold tracking-tighter"></span>
              </Link>
              <div className="flex flex-col gap-1 sm:flex-row md:flex-col xl:flex-row">
                <p>{copyright}</p>
                <p className="text-center sm:text-left">
                  {developed_by}
                  <a
                    target="_blank"
                    href="https://github.com/arthurpar06"
                    className="hover:text-primary underline"
                    rel="noopener"
                  >
                    Arthur P
                  </a>
                  .
                </p>
              </div>
            </div>
            <ul className="flex flex-col items-center justify-center gap-4 sm:flex-row md:justify-end">
              {links.map((link) => (
                <li key={link.title} className="hover:text-primary underline">
                  <Link href={link.url}>{link.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
};

export { Footer };
