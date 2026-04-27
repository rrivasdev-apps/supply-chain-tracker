"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens } from "@/hooks/useTokens"
import { useTransfers } from "@/hooks/useTransfers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<string, string> = {
  producer: "Productor",
  factory: "Fábrica",
  retailer: "Distribuidor",
  consumer: "Consumidor",
}

export default function DashboardPage() {
  const router = useRouter()
  const { isConnected, isAdmin, userStatus, role, account } = useWeb3()
  const { tokens, loading: tokensLoading } = useTokens()
  const { pending, incoming, outgoing, loading: transfersLoading } = useTransfers()

  useEffect(() => {
    if (!isConnected) { router.push("/"); return }
    if (isAdmin) { router.push("/admin"); return }
    if (userStatus !== null && userStatus !== 1) { router.push("/"); return }
  }, [isConnected, isAdmin, userStatus, router])

  const rawMaterials = tokens.filter((t) => t.parentId === 0n && !t.burned)
  const products = tokens.filter((t) => t.parentId > 0n && !t.burned)
  const activeTokens = tokens.filter((t) => !t.burned)

  const stats = [
    {
      label: role === "producer" ? "Productos Activos" : role === "factory" ? "Materias Primas" : "Tokens Activos",
      value: role === "factory" ? rawMaterials.length : activeTokens.length,
      loading: tokensLoading,
    },
    ...(role === "factory" ? [{
      label: "Productos Fabricados",
      value: products.length,
      loading: tokensLoading,
    }] : []),
    {
      label: "Transferencias Pendientes",
      value: pending.length,
      loading: transfersLoading,
      highlight: pending.length > 0,
    },
    {
      label: "Enviadas",
      value: outgoing.length,
      loading: transfersLoading,
    },
    {
      label: "Recibidas",
      value: incoming.length,
      loading: transfersLoading,
    },
  ]

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {ROLE_LABELS[role ?? ""] ?? role} · {account?.slice(0, 8)}…{account?.slice(-6)}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className={stat.highlight ? "border-orange-300 bg-orange-50" : ""}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {stat.loading ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">{stat.value}</span>
                    {stat.highlight && stat.value > 0 && (
                      <Badge variant="secondary">Acción Requerida</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {role === "producer" && (
                <Link href="/tokens" className="block p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm">
                  Crear Nuevo Producto →
                </Link>
              )}
              {role === "factory" && (
                <>
                  <Link href="/tokens" className="block p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm">
                    Fabricar Nuevo Producto →
                  </Link>
                  <Link href="/transfers" className="block p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm">
                    Aceptar Transferencias →
                  </Link>
                </>
              )}
              {(role === "retailer" || role === "consumer") && (
                <Link href="/transfers" className="block p-3 rounded-md bg-muted hover:bg-muted/80 transition-colors text-sm">
                  {pending.length > 0 ? `Revisar ${pending.length} Transferencia(s) Pendiente(s) →` : "Ver Transferencias →"}
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flujo De La Cadena</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                {["Productor", "Fábrica", "Distribuidor", "Consumidor"].map((step, i, arr) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      ROLE_LABELS[role ?? ""] === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step}
                    </span>
                    {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
