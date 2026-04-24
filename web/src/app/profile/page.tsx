"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens } from "@/hooks/useTokens"
import { useTransfers } from "@/hooks/useTransfers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const ROLE_LABELS: Record<string, string> = {
  producer: "Productor (Fundición)",
  factory: "Fábrica de puertas",
  retailer: "Distribuidor",
  consumer: "Consumidor",
}

const STATUS_LABELS: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANTS: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline"
}

export default function ProfilePage() {
  const router = useRouter()
  const { isConnected, userStatus, account, role, isAdmin, userInfo, disconnectWallet, refreshUser } = useWeb3()
  const { tokens } = useTokens()
  const { transfers } = useTransfers()

  useEffect(() => {
    if (!isConnected) router.push("/")
  }, [isConnected, router])

  const activeTokens = tokens.filter((t) => !t.burned).length
  const burnedTokens = tokens.filter((t) => t.burned).length

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 max-w-2xl">
        <h1 className="text-2xl font-bold">Mi perfil</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Información de cuenta</CardTitle>
              <Button variant="outline" size="sm" onClick={refreshUser}>Actualizar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Dirección</span>
              <span className="font-mono text-xs break-all">{account}</span>

              <span className="text-muted-foreground">Rol</span>
              <span>
                {isAdmin ? "Administrador" : ROLE_LABELS[role ?? ""] ?? role ?? "—"}
              </span>

              <span className="text-muted-foreground">Estado</span>
              <Badge variant={STATUS_VARIANTS[userStatus ?? 0]} className="w-fit">
                {isAdmin ? "Admin" : STATUS_LABELS[userStatus ?? 0]}
              </Badge>

              {userInfo && (
                <>
                  <span className="text-muted-foreground">ID usuario</span>
                  <span>{userInfo.id.toString()}</span>
                </>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-bold">{tokens.length}</div>
                <div className="text-muted-foreground">Tokens totales</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{activeTokens}</div>
                <div className="text-muted-foreground">Activos</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{burnedTokens}</div>
                <div className="text-muted-foreground">Redimidos</div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl font-bold">{transfers.length}</div>
                <div className="text-muted-foreground">Transferencias totales</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {transfers.filter((t) => t.status === 0 && t.to.toLowerCase() === account?.toLowerCase()).length}
                </div>
                <div className="text-muted-foreground">Pendientes de aceptar</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Red</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <div className="flex justify-between">
              <span>Red</span>
              <span>Anvil (local)</span>
            </div>
            <div className="flex justify-between">
              <span>Chain ID</span>
              <span>31337</span>
            </div>
            <div className="flex justify-between">
              <span>RPC</span>
              <span className="font-mono">http://localhost:8545</span>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" onClick={disconnectWallet} className="w-full">
          Desconectar wallet
        </Button>
      </main>
    </div>
  )
}
