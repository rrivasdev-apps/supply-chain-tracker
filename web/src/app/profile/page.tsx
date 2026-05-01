"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens } from "@/hooks/useTokens"
import { useTransfers } from "@/hooks/useTransfers"
import { useAllUsers } from "@/hooks/useAllUsers"
import { useAdminStats } from "@/hooks/useAdminStats"
import { getUserDates, UserDates } from "@/services/Web3Service"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const ROLE_LABELS: Record<string, string> = {
  producer: "Fundición", certifier: "Certificador", factory: "Fábrica",
  retailer: "Distribuidor", consumer: "Cliente",
}
const STATUS_LABELS: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANTS: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline",
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground leading-tight">{label}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

// ── Vista de KPIs del admin ───────────────────────────────────────────────────

function AdminKPIs() {
  const { users, approved } = useAllUsers()
  const [filterAddr, setFilterAddr] = useState("__all__")
  const { stats, loading } = useAdminStats(filterAddr === "__all__" ? undefined : filterAddr)

  const byRole = (role: string) => approved.filter((u) => u.role === role).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-base">Actividad De La Cadena</CardTitle>
          <Select value={filterAddr} onValueChange={(v) => setFilterAddr(v ?? "__all__")}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos los usuarios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toda la cadena</SelectItem>
              {approved.map((u) => (
                <SelectItem key={u.addr} value={u.addr}>
                  {u.name || u.addr.slice(0, 10)} — {ROLE_LABELS[u.role] ?? u.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-4 gap-6">
              <StatBox label="Lotes registrados" value={stats.totalRawMaterials} />
              <StatBox label="Productos fabricados" value={stats.totalProducts} />
              <StatBox label="Certificaciones emitidas" value={stats.totalCertifications} />
              <StatBox label="Transferencias totales" value={stats.totalTransfers} />
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-6">
              <StatBox label="Transferencias en tránsito" value={stats.pendingTransfers} />
              <StatBox label="Redenciones" value={stats.totalRedemptions} />
              <StatBox label="Unidades redimidas" value={stats.redeemedUnits.toString()} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No se pudieron cargar los datos.</p>
        )}

        {filterAddr === "__all__" && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-3">Usuarios aprobados por rol</p>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { role: "producer",  label: "Fundición" },
                  { role: "certifier", label: "Certificador" },
                  { role: "factory",   label: "Fábrica" },
                  { role: "retailer",  label: "Distribuidor" },
                  { role: "consumer",  label: "Cliente" },
                ].map(({ role, label }) => (
                  <StatBox key={role} label={label} value={byRole(role)} />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { isConnected, userStatus, userLoading, account, role, isAdmin, userInfo, contract, disconnectWallet, refreshUser } = useWeb3()
  const { tokens } = useTokens()
  const { transfers } = useTransfers()

  const [dates, setDates] = useState<UserDates | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) router.push("/")
  }, [isConnected, userLoading, router])

  // Cargar fechas del usuario conectado (no aplica al admin)
  useEffect(() => {
    if (!contract || !account || isAdmin) return
    getUserDates(contract, account).then(setDates).catch(() => {})
  }, [contract, account, isAdmin])

  const activeTokens = tokens.filter((t) => !t.burned).length
  const burnedTokens  = tokens.filter((t) =>  t.burned).length

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6 max-w-3xl">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>

        {/* Información de cuenta */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Información De Cuenta</CardTitle>
              <Button variant="outline" size="sm" onClick={refreshUser}>Actualizar</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-muted-foreground">Dirección</span>
              <span className="font-mono text-xs break-all">{account}</span>

              <span className="text-muted-foreground">Rol</span>
              <span>{isAdmin ? "Administrador" : ROLE_LABELS[role ?? ""] ?? role ?? "—"}</span>

              <span className="text-muted-foreground">Estado</span>
              <Badge variant={STATUS_VARIANTS[userStatus ?? 0]} className="w-fit">
                {isAdmin ? "Admin" : STATUS_LABELS[userStatus ?? 0]}
              </Badge>

              {userInfo && (
                <>
                  <span className="text-muted-foreground">Nombre / Razón Social</span>
                  <span>{userInfo.name || "—"}</span>

                  <span className="text-muted-foreground">ID usuario</span>
                  <span>{userInfo.id.toString()}</span>
                </>
              )}

              {/* Fechas */}
              {!isAdmin && dates && (
                <>
                  {dates.approvedAt ? (
                    <>
                      <span className="text-muted-foreground">Fecha de aprobación</span>
                      <span>{fmtDate(dates.approvedAt)}</span>
                    </>
                  ) : dates.registeredAt ? (
                    <>
                      <span className="text-muted-foreground">Fecha de registro</span>
                      <span>{fmtDate(dates.registeredAt)}</span>
                    </>
                  ) : null}
                </>
              )}
            </div>

            {/* Stats propias — solo roles no-admin */}
            {!isAdmin && (
              <>
                <Separator />
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <StatBox label="Tokens Totales"  value={tokens.length} />
                  <StatBox label="Activos"          value={activeTokens} />
                  <StatBox label="Redimidos"        value={burnedTokens} />
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center text-sm">
                  <StatBox label="Transferencias Totales" value={transfers.length} />
                  <StatBox
                    label="Pendientes De Aceptar"
                    value={transfers.filter((t) => t.status === 0 && t.to.toLowerCase() === account?.toLowerCase()).length}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* KPIs globales — solo admin */}
        {isAdmin && <AdminKPIs />}

        {/* Red */}
        <Card>
          <CardHeader><CardTitle className="text-base">Red</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <div className="flex justify-between"><span>Red</span><span>Anvil (local)</span></div>
            <div className="flex justify-between"><span>Chain ID</span><span>31337</span></div>
            <div className="flex justify-between"><span>RPC</span><span className="font-mono">http://localhost:8545</span></div>
          </CardContent>
        </Card>

        <Button variant="destructive" onClick={disconnectWallet} className="w-full">
          Desconectar Wallet
        </Button>
      </main>
    </div>
  )
}
