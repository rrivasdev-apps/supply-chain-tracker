"use client"

import Link from "next/link"
import { useWeb3 } from "@/contexts/Web3Context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const ROLE_LABELS: Record<string, string> = {
  producer: "Productor",
  factory: "Fábrica",
  retailer: "Distribuidor",
  consumer: "Consumidor",
}

const STATUS_LABELS: Record<number, string> = {
  0: "Pendiente",
  1: "Aprobado",
  2: "Rechazado",
  3: "Cancelado",
}

const STATUS_VARIANTS: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary",
  1: "default",
  2: "destructive",
  3: "outline",
}

export function Navbar() {
  const { account, isConnected, role, isAdmin, userStatus, connectWallet, disconnectWallet } =
    useWeb3()

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ⛓ Supply Chain
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          {isConnected && (userStatus === 1 || isAdmin) && (
            <>
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="/tokens" className="text-muted-foreground hover:text-foreground transition-colors">
                Tokens
              </Link>
              <Link href="/transfers" className="text-muted-foreground hover:text-foreground transition-colors">
                Transferencias
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {isConnected && (
            <>
              {isAdmin && <Badge variant="outline">Admin</Badge>}
              {role && !isAdmin && (
                <Badge variant={STATUS_VARIANTS[userStatus ?? 0]}>
                  {ROLE_LABELS[role] ?? role} · {STATUS_LABELS[userStatus ?? 0]}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground font-mono hidden md:block">
                {account?.slice(0, 6)}…{account?.slice(-4)}
              </span>
              <Button variant="outline" size="sm" onClick={disconnectWallet}>
                Desconectar
              </Button>
            </>
          )}
          {!isConnected && (
            <Button size="sm" onClick={connectWallet}>
              Conectar MetaMask
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
