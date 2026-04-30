"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  label: string
  roles?: string[]
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["producer", "certifier", "factory", "retailer", "consumer"] },
  { href: "/tokens", label: "Productos", roles: ["producer", "factory", "retailer", "consumer"] },
  { href: "/transfers", label: "Transferencias", roles: ["producer", "factory", "retailer", "consumer"] },
  { href: "/certification", label: "Certificación", roles: ["certifier"] },
  { href: "/profile", label: "Perfil" },
  { href: "/admin", label: "Administración", adminOnly: true },
]

export function Sidebar() {
  const { role, isAdmin } = useWeb3()
  const pathname = usePathname()

  const visible = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin
    if (item.roles) return !isAdmin && item.roles.includes(role ?? "")
    return true
  })

  return (
    <aside className="w-56 shrink-0 border-r min-h-[calc(100vh-4rem)] py-6 px-3">
      <nav className="flex flex-col gap-1">
        {visible.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
