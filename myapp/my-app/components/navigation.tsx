"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils";
import { Home, Briefcase, DollarSign, Package, Users, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
// Import SheetTitle and SheetHeader
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
// You might need to import VisuallyHidden if you want to hide the title visually
// import { VisuallyHidden } from "@radix-ui/react-visually-hidden";


const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Jobs", href: "/jobs", icon: Briefcase },
  { name: "Pricing", href: "/pricing", icon: DollarSign },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Artisans", href: "/artisans", icon: Users },
  // { name: "Reports", href: "/reports", icon: BarChart3 },
  // { name: "customers", href : "/customers", icon: Users },
  // { name: "orders", href : "/orders", icon: Package },
  { name: "finished stock", href : "/stock", icon: Package },
  { name: "payslip", href : "/payslips", icon: Package },
  { name: "Pending Payments", href: "/payslips/pending", icon: DollarSign },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Package className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Artisan Management</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === item.href ? "text-foreground" : "text-foreground/60",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            {/* Add SheetHeader and SheetTitle here */}
            <SheetHeader>
              {/* Option 1: Visually present title */}
              <SheetTitle>Main Navigation</SheetTitle>
              {/* Option 2: Visually hidden title for screen readers only */}
              {/*
              <VisuallyHidden>
                <SheetTitle>Main Navigation</SheetTitle>
              </VisuallyHidden>
              */}
            </SheetHeader>

            {/* Your existing content */}
            <Link href="/" className="flex items-center space-x-2">
              <Package className="h-6 w-6" />
              <span className="font-bold">Artisan Management</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                      pathname === item.href ? "text-foreground" : "text-foreground/60",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}