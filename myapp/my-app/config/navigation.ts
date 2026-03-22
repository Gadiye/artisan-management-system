import { Home, Briefcase, DollarSign, Package, Users, BarChart3, LucideIcon } from "lucide-react"

export interface NavItem {
    name: string
    href: string
    icon: LucideIcon
}

export interface NavGroup {
    label: string
    items: NavItem[]
}

export type NavigationConfig = (NavItem | NavGroup)[]

export const navigationConfig: NavigationConfig = [
    { name: "Dashboard", href: "/", icon: Home },
    {
        label: "Inventory & Production",
        items: [
            { name: "Jobs", href: "/jobs", icon: Briefcase },
            { name: "Production Guide", href: "/production", icon: Package },
            { name: "Inventory", href: "/inventory", icon: Package },
            { name: "Finished Stock", href: "/stock", icon: Package },
        ],
    },
    {
        label: "Sales & CRM",
        items: [
            { name: "Orders", href: "/orders", icon: Package },
            { name: "Customers", href: "/customers", icon: Users },
            { name: "Pricing", href: "/pricing", icon: DollarSign },
        ],
    },
    {
        label: "Management",
        items: [
            { name: "Artisans", href: "/artisans", icon: Users },
            { name: "Reports", href: "/reports", icon: BarChart3 },
            { name: "Financials", href: "/financials", icon: DollarSign },
        ],
    },
]
