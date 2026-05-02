"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Package, ArrowRightLeft,
  ShieldCheck, User, Settings, Link2,
} from "lucide-react"

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  roles?: string[]
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",     label: "Dashboard",      icon: <LayoutDashboard size={18} />, roles: ["producer", "certifier", "factory", "retailer", "consumer"] },
  { href: "/tokens",        label: "Productos",       icon: <Package size={18} />,         roles: ["producer", "factory", "retailer", "consumer"] },
  { href: "/transfers",     label: "Transferencias",  icon: <ArrowRightLeft size={18} />,  roles: ["producer", "factory", "retailer", "consumer"] },
  { href: "/certification", label: "Certificación",   icon: <ShieldCheck size={18} />,     roles: ["certifier"] },
  { href: "/profile",       label: "Dashboard",       icon: <LayoutDashboard size={18} />,  adminOnly: true },
  { href: "/profile",       label: "Perfil",          icon: <User size={18} />,             roles: ["producer", "certifier", "factory", "retailer", "consumer"] },
  { href: "/admin",         label: "Administración",  icon: <Settings size={18} />,         adminOnly: true },
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
    <>
      {/* Espaciador para empujar el contenido a la derecha */}
      <div className="w-56 shrink-0" />

      {/* Panel fijo que se superpone al header */}
      <aside
        className="fixed left-0 top-0 h-screen w-56 z-[60] flex flex-col"
        style={{ backgroundColor: "#0D1D2B" }}
      >
        {/* Logo / marca */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10 shrink-0">
          <Link2 size={22} className="text-white shrink-0" />
          <span className="font-bold text-white tracking-tight text-sm">Metal Trace</span>
        </div>

        {/* Navegación */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1 overflow-y-auto">
          {visible.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-[#20415F]",
                  active
                    ? "bg-[#20415F] text-white font-bold"
                    : "text-[#FFFEFE] font-medium"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
