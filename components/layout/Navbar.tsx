"use client";

import { Menu } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: typeof Link.arguments.href;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
  isActive?: boolean;
}

export interface NavbarProps {
  logo: {
    logoLight: StaticImageData;
    logoDark: StaticImageData;
    url: typeof Link.arguments.href;
    alt: string;
  };
  menu: MenuItem[];
}

const Navbar = ({ logo, menu }: NavbarProps) => {
  const pathname = usePathname();

  return (
    <section className="bg-sidebar fixed top-0 z-50 w-screen px-6 py-4 shadow-sm md:px-12">
      {/* Desktop Menu */}
      <nav className="hidden justify-between lg:flex">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <Link href={logo.url} className="flex items-center gap-2">
            <Image
              src={logo.logoLight}
              quality={25}
              alt={logo.alt}
              priority={true}
              className="block max-h-8 w-full object-contain dark:hidden"
            />
            <Image
              src={logo.logoDark}
              quality={25}
              alt={logo.alt}
              priority={true}
              className="hidden max-h-8 w-full object-contain dark:block"
            />
            <span className="text-lg font-semibold tracking-tighter"></span>
          </Link>
          <div className="flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                {menu.map((item) => {
                  item.isActive =
                    pathname.endsWith(item.url) ||
                    (item.url.includes(pathname) && pathname !== "/");
                  return renderMenuItem(item);
                })}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className="block lg:hidden">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={logo.url} className="flex items-center gap-2">
            <Image
              src={logo.logoLight}
              quality={25}
              alt={logo.alt}
              className="block max-h-6 w-full object-contain dark:hidden"
            />
            <Image
              src={logo.logoDark}
              quality={25}
              alt={logo.alt}
              className="hidden max-h-6 w-full object-contain dark:block"
            />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link href={logo.url} className="flex items-center gap-2">
                      <Image
                        src={logo.logoLight}
                        quality={25}
                        alt={logo.alt}
                        className="block max-h-8 w-full object-contain dark:hidden"
                      />
                      <Image
                        src={logo.logoDark}
                        quality={25}
                        alt={logo.alt}
                        className="hidden max-h-8 w-full object-contain dark:block"
                      />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map((subItem) => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
              <SubMenuLink item={subItem} />
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <Link
        href={item.url}
        data-active={item.isActive}
        className={cn(
          "data-[active=true]:focus:bg-accent data-[active=true]:hover:bg-accent data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-ring/50 [&_svg:not([class*='text-'])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
          "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        )}
      >
        {item.title}
      </Link>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <SubMenuLink key={subItem.title} item={subItem} />
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <a key={item.title} href={item.url} className="text-md font-semibold">
      {item.title}
    </a>
  );
};

const SubMenuLink = ({ item }: { item: MenuItem }) => {
  return (
    <a
      className="hover:bg-muted hover:text-accent-foreground flex flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none"
      href={item.url}
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-muted-foreground text-sm leading-snug">
            {item.description}
          </p>
        )}
      </div>
    </a>
  );
};

export { Navbar };
