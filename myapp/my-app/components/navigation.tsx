"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Briefcase, DollarSign, Package, Users, Menu, LogOut, User, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { useSession, signOut } from "next-auth/react"

import { navigationConfig, type NavItem, type NavGroup } from "@/config/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown } from "lucide-react"

export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Package className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">Artisan Management</span>
            {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                Demo
              </span>
            )}
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            {navigationConfig.map((item, index) => {
              if ("items" in item) {
                return (
                  <Popover key={index}>
                    <PopoverTrigger asChild>
                      <button className="flex items-center space-x-1 outline-none transition-colors hover:text-foreground/80 text-foreground/60">
                        <span>{item.label}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <div className="grid gap-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                              pathname === subItem.href ? "bg-accent text-accent-foreground" : "text-foreground/60",
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.name}</span>
                          </Link>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              }
              return (
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
              )
            })}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-initial">
          </div>
          {session && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{session.user?.name || session.user?.username}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
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
                {navigationConfig.map((item, index) => {
                  if ("items" in item) {
                    return (
                      <div key={index} className="flex flex-col space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">
                          {item.label}
                        </h4>
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-foreground/80",
                              pathname === subItem.href ? "text-foreground" : "text-foreground/60",
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            <span>{subItem.name}</span>
                          </Link>
                        ))}
                      </div>
                    )
                  }
                  return (
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
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}